import { ThinkingLevel } from '@google/genai';
import type { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingConfig } from '@google/genai';

/**
 * Gemini call helpers: model selection, thinking knob, timeout and retry.
 *
 * Kept free of `getGenAI` on purpose: callers pass the client in, so tests that
 * mock `getGenAI` keep controlling every call.
 */

export const DEFAULT_MODEL = 'gemini-3.8-flash';

export function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export type ThinkingEffort = 'minimal' | 'low';

/**
 * Gemini 3+ models take `thinkingLevel` ('minimal' | 'low' | 'medium' | 'high');
 * older 2.x models take a token `thinkingBudget`. Sending the wrong knob is
 * either ignored or rejected, so pick by model generation.
 */
export function thinkingConfigFor(model: string, effort: ThinkingEffort): ThinkingConfig {
  const major = Number(model.match(/gemini-(\d+)/i)?.[1] ?? NaN);
  if (Number.isFinite(major) && major >= 3) {
    // 'low' for both efforts: the API rejects MINIMAL on some Gemini 3 models
    // ("Thinking level MINIMAL is not supported for this model"), and 'low' is
    // still fast enough for classification.
    void effort;
    return { thinkingLevel: ThinkingLevel.LOW };
  }
  // 2.x: 0 disables thinking (Flash only; Pro needs >= 128); a small budget keeps synthesis cheap.
  if (effort === 'minimal') return { thinkingBudget: /flash/i.test(model) ? 0 : 128 };
  return { thinkingBudget: 512 };
}

/** 429, 5xx, network failures and our own timeouts are worth one retry. */
export function isTransientError(err: unknown): boolean {
  const e = err as { status?: unknown; name?: unknown; code?: unknown; message?: unknown };
  const status = typeof e?.status === 'number' ? e.status : undefined;
  const message = String(e?.message ?? '');
  // A daily quota will not recover within one request; retrying only adds latency.
  if (/PerDay|per day/i.test(message)) return false;
  if (status !== undefined) return status === 408 || status === 429 || status >= 500;
  const name = String(e?.name ?? '');
  if (name === 'TimeoutError' || name === 'AbortError') return true;
  return /\b(429|500|502|503|504)\b|ECONNRESET|ETIMEDOUT|fetch failed|socket hang up|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(message);
}

/** Daily/minute quota exhaustion: retrying will not help, so callers should say "busy" and stop. */
export function isQuotaError(err: unknown): boolean {
  const e = err as { status?: unknown; message?: unknown };
  return e?.status === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(String(e?.message ?? ''));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GenerateOptions {
  /** Per-attempt timeout in ms. */
  timeoutMs: number;
  /** Extra attempts on transient errors (0 = no retry). */
  retries?: number;
  /** Base backoff before a retry, in ms. */
  backoffMs?: number;
}

/**
 * Calls `generateContent` with a per-attempt AbortSignal timeout and a bounded
 * number of retries on transient errors.
 */
export async function generateWithRetry(
  ai: Pick<GoogleGenAI, 'models'>,
  params: GenerateContentParameters,
  options: GenerateOptions
): Promise<GenerateContentResponse> {
  const retries = Math.max(0, options.retries ?? 0);
  const backoffMs = options.backoffMs ?? 400;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent({
        ...params,
        config: { ...params.config, abortSignal: AbortSignal.timeout(options.timeoutMs) },
      });
    } catch (err) {
      lastError = err;
      // A timed-out attempt already used its whole budget; retrying would double the user's wait.
      const timedOut = ['TimeoutError', 'AbortError'].includes(String((err as { name?: unknown })?.name));
      if (attempt === retries || timedOut || !isTransientError(err)) break;
      await sleep(backoffMs * (attempt + 1) + Math.floor(Math.random() * 100));
    }
  }
  throw lastError;
}

/** Timeouts used across the app (ms). */
export const TIMEOUTS = {
  classify: 8_000,
  synthesis: 15_000,
  grounded: 20_000,
} as const;
