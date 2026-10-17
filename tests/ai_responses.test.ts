import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { getGenAI, extractIntent, parseModelJson } from '../server/services/ai/gemini';
import documentRouter from '../server/routes/document';
import aiRouter from '../server/routes/ai';

vi.mock('../server/services/ai/gemini', async (importOriginal) => ({
  ...await importOriginal<typeof import('../server/services/ai/gemini')>(),
  getGenAI: vi.fn(),
  extractIntent: vi.fn(),
}));

const generateContent = vi.fn();
const documentHandler = documentRouter.stack.find((layer) => layer.route?.path === '/explain')!.route!.stack.at(-1)!.handle;
const chatHandler = aiRouter.stack.find((layer) => layer.route?.path === '/chat')!.route!.stack.at(-1)!.handle;

beforeEach(() => {
  vi.mocked(getGenAI).mockReturnValue({ models: { generateContent } } as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

describe('Honest document responses', () => {
  async function explain(language: string) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaampe-document-test-'));
    const filePath = path.join(dir, 'sample.pdf');
    fs.writeFileSync(filePath, 'test upload');
    const res = response();
    try {
      await documentHandler({ file: { path: filePath, mimetype: 'application/pdf' }, body: { language } } as any, res as any, vi.fn());
      expect(fs.existsSync(filePath)).toBe(false);
      return res;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  it.each([
    ['hi', /dobara koshish/],
    ['en', /try again/],
    ['pa', /ਦੁਬਾਰਾ/],
  ])('returns a localized 502 on Gemini failure (%s), and deletes the upload', async (language, retry) => {
    generateContent.mockRejectedValue(new Error('upstream failed'));
    const res = await explain(language);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(retry) });
  });

  it.each(['not JSON', '{"readable":false,"whatIsThis":"unreadable"}', 'null'])('returns unreadable without invented content for %s', async (text) => {
    generateContent.mockResolvedValue({ text });
    const res = await explain('en');
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('could not be read'), readable: false });
  });

  it('returns the actual model explanation and deletes the upload on success', async () => {
    generateContent.mockResolvedValue({ text: '```json\n{"readable":true,"whatIsThis":"A supplied contract","money":["₹3200"]}\n```' });
    const res = await explain('en');
    expect(res.json).toHaveBeenCalledWith({ success: true, explanation: {
      readable: true, whatIsThis: 'A supplied contract', money: ['₹3200'], importantPoints: [], dates: [], cautions: [],
    } });
  });
});

describe('Grounding and grievance safeguards', () => {
  async function chat(message: string) {
    const res = response();
    await chatHandler({ body: { message, language: 'en' }, sessionId: crypto.randomUUID(), sessionProfile: { state: 'Punjab' } } as any, res as any, vi.fn());
    return res.json.mock.calls[0][0];
  }

  it('accepts plain and fenced JSON and rejects invalid JSON', () => {
    expect(parseModelJson('{"ok":true}')).toEqual({ ok: true });
    expect(parseModelJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(() => parseModelJson('not JSON')).toThrow();
  });

  it('uses only trusted grounding chunks, including government domains on redirect links', async () => {
    vi.mocked(extractIntent).mockResolvedValue({ intent: 'scheme' });
    const trusted = { title: 'Punjab board', domain: 'bocw.punjab.gov.in', uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/official' };
    generateContent.mockResolvedValue({
      text: '```json\n{"directAnswer":"Check registration requirements.","steps":[],"sources":[{"url":"https://invented.gov.in"}],"eligibilityState":"Possibly relevant"}\n```',
      candidates: [{ groundingMetadata: { groundingChunks: [
        { web: trusted }, { web: trusted },
        { web: { title: 'myscheme.gov.in', uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/scheme' } },
        { web: { domain: 'gov.in.attacker.example', uri: 'https://attacker.example' } },
      ] } }],
    });
    const result = await chat('Any government schemes?');
    expect(result.sources).toEqual([
      { title: trusted.title, url: trusted.uri },
      { title: 'myscheme.gov.in', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/scheme' },
    ]);
  });

  it('does not present model-written government URLs as evidence when grounding is missing', async () => {
    vi.mocked(extractIntent).mockResolvedValue({ intent: 'scheme' });
    generateContent.mockResolvedValue({ text: '{"directAnswer":"Definitely eligible","sources":[{"url":"https://invented.gov.in"}]}' });
    const result = await chat('Any government schemes?');
    expect(result.eligibilityState).toBe('Unable to verify');
    expect(result.directAnswer).toContain("couldn't find a reliable official source");
    expect(result.sources.every((source: { url: string }) => source.url !== 'https://invented.gov.in')).toBe(true);
  });

  it('keeps amount/days and removes a classifier-invented platform when Gemini fails', async () => {
    vi.mocked(extractIntent).mockResolvedValue({ intent: 'grievance', dispute: { amount: 3200, days: 8, platform: 'Swiggy' } });
    generateContent.mockRejectedValue(new Error('upstream failed'));
    const result = await chat('My ₹3200 payment is pending for 8 days');
    expect(result.facts).toEqual({ amount: 3200, days: 8, platform: undefined });
    expect(result.draftMessage).toContain('₹3200');
    expect(result.draftMessage).toContain('8 days');
    expect(result.draftMessage).not.toContain('Swiggy');
  });

  it('rejects a model-invented platform and keeps the original facts', async () => {
    vi.mocked(extractIntent).mockResolvedValue({ intent: 'grievance', dispute: { amount: 3200, days: 8 } });
    generateContent.mockResolvedValue({ text: JSON.stringify({ draftMessage: 'Swiggy owes me ₹3200 for 8 days', providedFacts: { platform: 'Swiggy' } }) });
    const result = await chat('My ₹3200 payment is pending for 8 days');
    expect(result.draftMessage).not.toContain('Swiggy');
    expect(result.draftMessage).toContain('₹3200');
    expect(result.draftMessage).toContain('8 days');
  });
});
