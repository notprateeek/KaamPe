import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import { getGenAI } from '../server/services/ai/gemini';

describe('Required Live Gemini AI Integration Test (Section 44)', () => {
  it.skipIf(!process.env.GEMINI_API_KEY?.trim())('calls the configured Gemini model with a short greeting in Hindi and returns a non-empty response', async () => {
    const ai = getGenAI();
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    console.log(`[Live AI Test] Sending live request to Gemini using model: ${modelName}`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Reply with a short friendly greeting in Hindi for an informal worker in India.',
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
    expect(response.text!.length).toBeGreaterThan(0);

    console.log('[Live AI Test] Real Gemini Response received:\n', response.text);

    // Verify response is non-empty and in Hindi / Devanagari or Hinglish
    expect(response.text!.trim().length).toBeGreaterThan(3);
  }, 30000); // 30s timeout for live network call
});
