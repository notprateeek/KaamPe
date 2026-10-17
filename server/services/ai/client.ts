import { ThinkingLevel } from '@google/genai';
import type { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingConfig } from '@google/genai';
import { createOpenAIClient, getOpenAIModel, isOpenAIClient, openAIConfigured } from './openai.js';

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

/**
 * Models tried, in order, when the main model's quota is exhausted (free-tier
 * quotas are per model, so a sibling model usually still answers).
 * GEMINI_FALLBACK_MODELS="" disables fallback.
 */
export const DEFAULT_FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.5-flash'];

export function getFallbackModels(): string[] {
  const raw = process.env.GEMINI_FALLBACK_MODELS;
  const list = raw === undefined ? DEFAULT_FALLBACK_MODELS : raw.split(',');
  return list.map((m) => m.trim()).filter(Boolean);
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
 * number of retries on transient errors. If the model's quota is exhausted, the
 * same request is sent once to each fallback model (see getFallbackModels).
 */
export async function generateWithRetry(
  ai: Pick<GoogleGenAI, 'models'>,
  params: GenerateContentParameters,
  options: GenerateOptions
): Promise<GenerateContentResponse> {
  try {
    return await generateWithModelFallback(ai, params, options);
  } catch (err) {
    if (!shouldUseOpenAIFallback(ai, err)) throw err;
    console.warn('[AI] Gemini failed; answering with the OpenAI fallback:', (err as Error)?.message);
    return await generateOnce(createOpenAIClient(), { ...params, model: getOpenAIModel() }, { ...options, retries: 0 });
  }
}

/**
 * Gemini quota, server, network and model-not-found errors are retried once on
 * OpenAI when OPENAI_API_KEY is set. Timeouts are not: the user already waited.
 */
export function shouldUseOpenAIFallback(ai: unknown, err: unknown): boolean {
  if (isOpenAIClient(ai) || !openAIConfigured()) return false;
  const name = String((err as { name?: unknown })?.name ?? '');
  if (name === 'TimeoutError' || name === 'AbortError') return false;
  const status = (err as { status?: unknown })?.status;
  return isQuotaError(err) || isTransientError(err) || status === 404;
}

async function generateWithModelFallback(
  ai: Pick<GoogleGenAI, 'models'>,
  params: GenerateContentParameters,
  options: GenerateOptions
): Promise<GenerateContentResponse> {
  try {
    return await generateOnce(ai, params, options);
  } catch (err) {
    if (!isQuotaError(err) || isOpenAIClient(ai)) throw err;
    let lastError: unknown = err;
    for (const model of getFallbackModels().filter((m) => m !== params.model)) {
      // Thinking knobs differ by model generation, so recompute for the fallback.
      const effort: ThinkingEffort = params.config?.thinkingConfig?.thinkingBudget === 0 ? 'minimal' : 'low';
      const config = params.config?.thinkingConfig
        ? { ...params.config, thinkingConfig: thinkingConfigFor(model, effort) }
        : params.config;
      try {
        return await generateOnce(ai, { ...params, model, config }, { ...options, retries: 0 });
      } catch (fallbackErr) {
        lastError = fallbackErr;
        if (!isQuotaError(fallbackErr)) break;
      }
    }
    throw lastError;
  }
}

async function generateOnce(
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

export interface StreamOptions extends GenerateOptions {
  /** Called with the full text so far each time a chunk arrives. */
  onText: (textSoFar: string) => void;
  /** Aborts the model call (e.g. the user pressed Stop). */
  signal?: AbortSignal;
}

/**
 * Streams `generateContentStream`, reporting the text as it grows. Resolves with
 * a response-shaped object (full text, plus the candidates of the last chunk that
 * carried grounding metadata). On any streaming error it falls back to a normal
 * `generateWithRetry` call, so callers always get a complete answer or a throw.
 */
export async function streamWithRetry(
  ai: Pick<GoogleGenAI, 'models'>,
  params: GenerateContentParameters,
  options: StreamOptions
): Promise<GenerateContentResponse> {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(options.timeoutMs)])
    : AbortSignal.timeout(options.timeoutMs);
  try {
    const stream = await ai.models.generateContentStream({ ...params, config: { ...params.config, abortSignal: signal } });
    let text = '';
    let grounded: GenerateContentResponse | undefined;
    for await (const chunk of stream) {
      const piece = chunk.text ?? '';
      if (piece) {
        text += piece;
        options.onText(text);
      }
      if (chunk.candidates?.[0]?.groundingMetadata) grounded = chunk;
    }
    return { text, candidates: grounded?.candidates } as unknown as GenerateContentResponse;
  } catch (err) {
    if (options.signal?.aborted) throw err;
    return generateWithRetry(ai, params, options);
  }
}

/**
 * The value of a top-level string field in a JSON object that is still being
 * streamed, e.g. the start of "directAnswer" before the closing quote arrives.
 */
export function partialJsonString(text: string, key: string): string | null {
  const match = new RegExp(`"${key}"\\s*:\\s*"`).exec(text);
  if (!match) return null;
  let out = '';
  for (let i = match.index + match[0].length; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') return out;
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = text[i + 1];
    if (next === undefined) break;
    i++;
    if (next === 'n') out += '\n';
    else if (next === 't') out += '\t';
    else if (next === 'u') {
      const hex = text.slice(i + 1, i + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 4;
    } else out += next;
  }
  return out;
}

/** Timeouts used across the app (ms). */
export const TIMEOUTS = {
  classify: 8_000,
  synthesis: 15_000,
  grounded: 20_000,
} as const;
