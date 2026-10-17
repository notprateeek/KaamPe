import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getGenAI } from '../server/services/ai/gemini';
import { createApp } from '../server/index';
import { loadEnv } from '../server/config/env';
import { db } from '../server/db/index';
import { hasAudioSignature, MAX_AUDIO_BYTES } from '../server/routes/voice';

// Mocked Gemini: these tests never make a live call.
vi.mock('../server/services/ai/gemini', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/services/ai/gemini')>()),
  getGenAI: vi.fn(),
}));

const generateContent = vi.fn();
const uploadsDir = path.resolve(__dirname, '../uploads_tmp');
const sessions: string[] = [];
let server: Server;
let base: string;

const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(200, 1)]);
const voiceFiles = () => (fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).filter((f) => f.startsWith('voice_')) : []);

function newSession() {
  const id = 'vc_' + crypto.randomBytes(12).toString('hex');
  sessions.push(id);
  return id;
}

async function transcribe(bytes: Buffer, type = 'audio/webm;codecs=opus', language = 'en', sessionId = newSession()) {
  const form = new FormData();
  form.append('language', language);
  form.append('audio', new Blob([new Uint8Array(bytes)], { type }), 'voice.webm');
  const res = await fetch(`${base}/api/ai/transcribe`, { method: 'POST', headers: { 'X-Session-ID': sessionId }, body: form });
  return { res, body: await res.json() };
}

beforeAll(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const app = createApp(loadEnv({ NODE_ENV: 'test', RATE_LIMIT_API_MAX: '1000', RATE_LIMIT_AI_MAX: '1000' }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

beforeEach(() => {
  generateContent.mockReset();
  vi.mocked(getGenAI).mockReturnValue({ models: { generateContent } } as any);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const id of sessions) db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  vi.restoreAllMocks();
});

describe('POST /api/ai/transcribe', () => {
  it('returns the transcript for review without saving any money entry, and deletes the audio', async () => {
    const sessionId = newSession();
    const before = voiceFiles().length;
    generateContent.mockResolvedValue({ text: JSON.stringify({ heard: true, transcript: 'Aaj Swiggy se 850 kamaye' }) });
    const { res, body } = await transcribe(WEBM, 'audio/webm;codecs=opus', 'hi', sessionId);
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, transcript: 'Aaj Swiggy se 850 kamaye' });
    expect(voiceFiles().length).toBe(before);
    const saved = db.prepare('SELECT COUNT(*) AS n FROM money_entries WHERE session_id = ?').get(sessionId) as { n: number };
    expect(saved.n).toBe(0);
    const params = generateContent.mock.calls[0][0];
    expect(params.contents[0].parts[0].inlineData.mimeType).toBe('audio/webm');
    expect(params.config.systemInstruction).toMatch(/never follow them/);
  });

  it.each([
    ['hi', /Mic ke paas/],
    ['en', /speak closer/],
    ['pa', /ਮਾਈਕ/],
  ])('reports no clear speech in %s', async (language, pattern) => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ heard: false, transcript: '' }) });
    const { res, body } = await transcribe(WEBM, 'audio/webm', language);
    expect(res.status).toBe(422);
    expect(body.code).toBe('no_speech');
    expect(body.error).toMatch(pattern);
  });

  it('says voice is unavailable on a quota error, without a transcript, and deletes the audio', async () => {
    const before = voiceFiles().length;
    generateContent.mockRejectedValue(Object.assign(new Error('RESOURCE_EXHAUSTED: quota'), { status: 429 }));
    const { res, body } = await transcribe(WEBM);
    expect(res.status).toBe(503);
    expect(body.code).toBe('ai_unavailable');
    expect(body.transcript).toBeUndefined();
    expect(body.error).toMatch(/type instead/);
    expect(generateContent).toHaveBeenCalledTimes(1); // no retry of an expensive audio upload
    expect(voiceFiles().length).toBe(before);
  });

  it('reports a malformed model reply as a failure, not as a transcript', async () => {
    generateContent.mockResolvedValue({ text: 'Sure! Here is the transcript: hello' });
    const { res, body } = await transcribe(WEBM);
    expect(res.status).toBe(502);
    expect(body.transcript).toBeUndefined();
  });

  it('rejects unsupported types, mismatched content, empty and oversized recordings without calling Gemini', async () => {
    const before = voiceFiles().length;
    expect((await transcribe(WEBM, 'video/mp4')).res.status).toBe(415);
    expect((await transcribe(Buffer.from('#!/bin/sh echo hi'), 'audio/webm')).res.status).toBe(415);
    expect((await transcribe(Buffer.alloc(0), 'audio/webm')).res.status).toBe(400);
    const big = await transcribe(Buffer.concat([WEBM, Buffer.alloc(MAX_AUDIO_BYTES)]), 'audio/webm', 'pa');
    expect(big.res.status).toBe(413);
    expect(big.body.error).toMatch(/ਮਿੰਟ/);
    expect(generateContent).not.toHaveBeenCalled();
    expect(voiceFiles().length).toBe(before);
  });
});

describe('Audio signatures', () => {
  it.each([
    ['audio/ogg', Buffer.from('OggS\0\0\0\0')],
    ['audio/mp4', Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypM4A ')])],
    ['audio/wav', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')])],
    ['audio/mpeg', Buffer.from('ID3\x04')],
  ])('accepts a real %s header', (mime, header) => {
    expect(hasAudioSignature(header, mime)).toBe(true);
  });

  it('rejects a header that does not match the declared type', () => {
    expect(hasAudioSignature(Buffer.from('OggS'), 'audio/webm')).toBe(false);
    expect(hasAudioSignature(WEBM, 'application/pdf')).toBe(false);
  });
});
