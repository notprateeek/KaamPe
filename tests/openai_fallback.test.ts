import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateWithRetry, shouldUseOpenAIFallback } from '../server/services/ai/client';
import { createOpenAIClient, isOpenAIClient, toChatMessages } from '../server/services/ai/openai';
import { activeProvider, getGenAI } from '../server/services/ai/gemini';

const ENV_KEYS = ['OPENAI_API_KEY', 'OPENAI_MODEL', 'AI_PROVIDER', 'GEMINI_API_KEY', 'GEMINI_FALLBACK_MODELS'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.GEMINI_FALLBACK_MODELS = '';
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubOpenAI(content: string) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('toChatMessages', () => {
  it('maps system text, plain text, images and PDFs; refuses audio', () => {
    const messages = toChatMessages({
      contents: [{ role: 'user', parts: [{ text: 'Explain' }, { inlineData: { mimeType: 'image/png', data: 'AAA' } }, { inlineData: { mimeType: 'application/pdf', data: 'BBB' } }] }],
      config: { systemInstruction: 'Be brief.' },
    } as any);
    expect(messages[0]).toEqual({ role: 'system', content: 'Be brief.' });
    expect(messages[1].content).toEqual([
      { type: 'text', text: 'Explain' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
      { type: 'file', file: { filename: 'document.pdf', file_data: 'data:application/pdf;base64,BBB' } },
    ]);
    expect(() => toChatMessages({ contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/webm', data: 'x' } }] }] } as any)).toThrow(/Unsupported media/);
  });
});

describe('OpenAI client', () => {
  it('sends JSON mode, the model and the key, and returns .text', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_MODEL = 'gpt-test';
    const fetchMock = stubOpenAI('{"ok":true}');
    const res = await createOpenAIClient().models.generateContent({
      model: 'ignored',
      contents: 'hi',
      config: { responseMimeType: 'application/json', systemInstruction: 'Reply in JSON.' },
    });
    expect(res.text).toBe('{"ok":true}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body)).toMatchObject({ model: 'gpt-test', response_format: { type: 'json_object' } });
  });

  it('surfaces HTTP status for retry/quota handling', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"rate"}', { status: 429 })));
    await expect(createOpenAIClient().models.generateContent({ model: 'm', contents: 'hi' })).rejects.toMatchObject({ status: 429 });
  });
});

describe('Gemini -> OpenAI fallback', () => {
  const failingGemini = (err: Error) => ({ models: { generateContent: vi.fn().mockRejectedValue(err) } }) as any;

  it('answers with OpenAI when Gemini is out of quota and a key is set', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    stubOpenAI('from openai');
    const gemini = failingGemini(Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 }));
    const res = await generateWithRetry(gemini, { model: 'gemini-x', contents: 'hi' }, { timeoutMs: 1000 });
    expect(res.text).toBe('from openai');
  });

  it('does not fall back without a key, on timeouts, or from OpenAI to itself', () => {
    delete process.env.OPENAI_API_KEY;
    expect(shouldUseOpenAIFallback({}, Object.assign(new Error('x'), { status: 503 }))).toBe(false);
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(shouldUseOpenAIFallback({}, Object.assign(new Error('t'), { name: 'TimeoutError' }))).toBe(false);
    expect(shouldUseOpenAIFallback(createOpenAIClient(), Object.assign(new Error('x'), { status: 503 }))).toBe(false);
    expect(shouldUseOpenAIFallback({}, Object.assign(new Error('bad request'), { status: 400 }))).toBe(false);
    expect(shouldUseOpenAIFallback({}, Object.assign(new Error('x'), { status: 503 }))).toBe(true);
  });
});

describe('provider selection', () => {
  it('uses OpenAI when only its key exists or AI_PROVIDER=openai, and never reports a key', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(isOpenAIClient(getGenAI())).toBe(true);
    expect(activeProvider()).toEqual({ provider: 'openai', model: expect.any(String) });

    process.env.GEMINI_API_KEY = 'gem-key-123';
    expect(isOpenAIClient(getGenAI())).toBe(false);
    expect(activeProvider().provider).toBe('gemini');
    process.env.AI_PROVIDER = 'openai';
    expect(isOpenAIClient(getGenAI())).toBe(true);
    expect(JSON.stringify(activeProvider())).not.toContain('sk-test');

    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(() => getGenAI()).toThrow(/No AI provider key/);
  });
});
