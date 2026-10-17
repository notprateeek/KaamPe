import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import { getGenAI } from '../server/services/ai/gemini';
import { getModelName, thinkingConfigFor, isTransientError } from '../server/services/ai/client';

/** Quota / rate-limit errors come from outside our code; they should not fail CI. */
function isQuotaError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  return e?.status === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(String(e?.message ?? ''));
}

describe('Required Live Gemini AI Integration Test (Section 44)', () => {
  it.skipIf(!process.env.GEMINI_API_KEY?.trim())('calls the configured Gemini model with a short greeting in Hindi and returns a non-empty response', async (ctx) => {
    const ai = getGenAI();
    const modelName = getModelName();

    console.log(`[Live AI Test] Sending live request to Gemini using model: ${modelName}`);

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: 'Reply with a short friendly greeting in Hindi for an informal worker in India.',
        config: { thinkingConfig: thinkingConfigFor(modelName, 'minimal') },
      });
    } catch (err) {
      if (isQuotaError(err) || (isTransientError(err) && (err as { status?: number }).status === 503)) {
        console.warn('[Live AI Test] Skipped: Gemini quota/availability error', (err as Error).message);
        ctx.skip();
        return;
      }
      throw err;
    }

    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
    expect(response.text!.trim().length).toBeGreaterThan(3);

    console.log('[Live AI Test] Real Gemini Response received:\n', response.text);
  }, 30000); // 30s timeout for live network call
});
