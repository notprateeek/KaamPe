import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGenAI } from '../server/services/ai/gemini';
import aiRouter from '../server/routes/ai';
import { HELPLINES } from '../shared/helplines';

vi.mock('../server/services/ai/gemini', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/services/ai/gemini')>()),
  getGenAI: vi.fn(),
}));

const generateContent = vi.fn();
const safetyHandler = aiRouter.stack.find((layer) => layer.route?.path === '/safety')!.route!.stack.at(-1)!.handle;

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

async function ask(body: Record<string, unknown>) {
  const res = response();
  await safetyHandler({ body, sessionId: 'kp_safety_test', sessionProfile: { workerType: 'driver' } } as any, res as any, vi.fn());
  return res;
}

beforeEach(() => {
  vi.mocked(getGenAI).mockReturnValue({ models: { generateContent } } as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('POST /api/ai/safety', () => {
  it('returns the model checklist with the trusted helplines', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({ directAnswer: 'Pull over somewhere lit.', steps: ['Turn on hazard lights.', 'Call 112 if hurt.'] }),
    });
    const res = await ask({ situation: 'Tyre burst on the highway at night', language: 'en' });
    const body = res.json.mock.calls[0][0];
    expect(body).toMatchObject({ type: 'answer', intent: 'safety', directAnswer: 'Pull over somewhere lit.' });
    expect(body.helplines.map((h: { number: string }) => h.number)).toEqual(HELPLINES.map((h) => h.number));
    expect(body.helplines.map((h: { number: string }) => h.number)).toContain('1033');

    const call = generateContent.mock.calls[0][0];
    expect(call.contents).toContain('<user_input>');
    expect(call.config.systemInstruction).toContain('1033');
    expect(call.config.systemInstruction).toContain('driver');
  });

  it('falls back to safe steps and helplines when the model fails or invents a number', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ directAnswer: 'Call 9876543210.', steps: ['Ok.'] }) });
    const body = (await ask({ situation: 'Someone is following me', language: 'hi' })).json.mock.calls[0][0];
    expect(body.directAnswer).toContain('112');
    expect(JSON.stringify(body)).not.toContain('9876543210');

    generateContent.mockRejectedValue(new Error('down'));
    const down = (await ask({ situation: 'Heat wave', language: 'pa' })).json.mock.calls[0][0];
    expect(down.helplines.length).toBe(HELPLINES.length);
  });

  it('masks Aadhaar-like numbers before they reach the model', async () => {
    generateContent.mockRejectedValue(new Error('down'));
    await ask({ situation: 'Caller asked for my Aadhaar 1234 5678 9012 and OTP', language: 'en' });
    expect(JSON.stringify(generateContent.mock.calls)).not.toContain('1234 5678 9012');
  });

  it('rejects an empty or oversized situation with a localized 400', async () => {
    const empty = await ask({ situation: '   ', language: 'en' });
    expect(empty.status).toHaveBeenCalledWith(400);
    expect(empty.json.mock.calls[0][0].code).toBe('validation_failed');
    const big = await ask({ situation: 'x'.repeat(1001), language: 'hi' });
    expect(big.status).toHaveBeenCalledWith(400);
  });
});
