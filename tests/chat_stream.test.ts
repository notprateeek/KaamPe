import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import crypto from 'node:crypto';
import { getGenAI, extractIntent } from '../server/services/ai/gemini';
import { partialJsonString } from '../server/services/ai/client';
import { createApp } from '../server/index';
import { loadEnv } from '../server/config/env';

vi.mock('../server/services/ai/gemini', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/services/ai/gemini')>()),
  getGenAI: vi.fn(),
  extractIntent: vi.fn(),
}));

const generateContent = vi.fn();
const generateContentStream = vi.fn();
let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp(loadEnv({ NODE_ENV: 'test', RATE_LIMIT_ENABLED: 'false' } as any));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getGenAI).mockReturnValue({ models: { generateContent, generateContentStream } } as any);
  vi.mocked(extractIntent).mockResolvedValue({ intent: 'general' } as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function chunks(...texts: string[]) {
  return (async function* () {
    for (const text of texts) yield { text };
  })();
}

async function streamChat(message: string) {
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': `kp_${crypto.randomBytes(16).toString('hex')}` },
    body: JSON.stringify({ message, language: 'en', stream: true }),
  });
  const lines = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
  return { res, events: lines };
}

describe('partialJsonString', () => {
  it('reads a string field before its closing quote, with escapes', () => {
    expect(partialJsonString('{"directAnswer": "Drink wa', 'directAnswer')).toBe('Drink wa');
    expect(partialJsonString('{"directAnswer":"Say \\"no\\"\\nthen \\u0041', 'directAnswer')).toBe('Say "no"\nthen A');
    expect(partialJsonString('{"directAnswer":"done","steps":["x"]}', 'directAnswer')).toBe('done');
    expect(partialJsonString('{"steps":[', 'directAnswer')).toBeNull();
  });
});

describe('POST /api/ai/chat with stream: true', () => {
  it('sends growing partial answers, then the full validated body', async () => {
    generateContentStream.mockResolvedValue(
      chunks('{"directAnswer":"Take ', 'breaks in the shade.","steps":["Drink water."', ',"Rest at noon."]}')
    );
    const { res, events } = await streamChat('Tips for working in heat?');
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    const partials = events.filter((e) => e.event === 'partial').map((e) => e.directAnswer);
    expect(partials).toEqual(['Take ', 'Take breaks in the shade.']);
    const done = events.at(-1);
    expect(done.event).toBe('done');
    expect(done.body).toMatchObject({ type: 'answer', directAnswer: 'Take breaks in the shade.', steps: ['Drink water.', 'Rest at noon.'] });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('stops streaming text that contains an invented phone number, and the final answer falls back', async () => {
    generateContentStream.mockResolvedValue(chunks('{"directAnswer":"Call 98765 43210 now', '.","steps":["x"]}'));
    const { events } = await streamChat('Someone is following me');
    expect(JSON.stringify(events)).not.toContain('98765');
    expect(events.at(-1).event).toBe('done');
  });

  it('falls back to a normal call when streaming fails', async () => {
    generateContentStream.mockRejectedValue(new Error('stream not supported'));
    generateContent.mockResolvedValue({ text: JSON.stringify({ directAnswer: 'Rest in the shade.', steps: ['Drink water.'] }) });
    const { events } = await streamChat('Tips for heat?');
    expect(events.at(-1)).toMatchObject({ event: 'done', body: { directAnswer: 'Rest in the shade.' } });
  });

  it('non-AI intents still stream a single done event', async () => {
    vi.mocked(extractIntent).mockResolvedValue({ intent: 'record_money', earning: { amount: 500 } } as any);
    const { events } = await streamChat('aaj 500 kamaye');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: 'done', body: { type: 'confirmation' } });
  });
});
