import type { GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from '@google/genai';

/**
 * OpenAI as a drop-in fallback for Gemini.
 *
 * Exposes the small part of the `@google/genai` client the app uses
 * (`models.generateContent` / `models.generateContentStream`) and translates each
 * request to the Chat Completions API, so every caller, prompt and safety check
 * stays the same. Google Search grounding has no equivalent here: grounded
 * answers come back without sources, and the app then says it could not verify.
 */

export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function openAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatPart[];
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

/** Error with an HTTP status, so isTransientError / isQuotaError treat it like a Gemini error. */
export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

function toChatPart(part: GeminiPart): ChatPart {
  if (typeof part.text === 'string') return { type: 'text', text: part.text };
  const mime = part.inlineData?.mimeType ?? '';
  const data = part.inlineData?.data ?? '';
  if (mime.startsWith('image/')) return { type: 'image_url', image_url: { url: `data:${mime};base64,${data}` } };
  if (mime === 'application/pdf') {
    return { type: 'file', file: { filename: 'document.pdf', file_data: `data:application/pdf;base64,${data}` } };
  }
  // Audio and other media need provider-specific models: let the caller fall back.
  throw new OpenAIError(`Unsupported media for the OpenAI fallback: ${mime || 'unknown'}`, 415);
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  const parts = (value as { parts?: GeminiPart[] })?.parts;
  if (Array.isArray(parts)) return parts.map((p) => p.text ?? '').join('\n');
  return '';
}

/** Gemini `contents` (string, parts, or role/parts turns) -> Chat Completions messages. */
export function toChatMessages(params: Pick<GenerateContentParameters, 'contents' | 'config'>): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const system = textOf(params.config?.systemInstruction);
  if (system) messages.push({ role: 'system', content: system });

  const contents = params.contents as unknown;
  if (typeof contents === 'string') {
    messages.push({ role: 'user', content: contents });
    return messages;
  }
  const list = Array.isArray(contents) ? contents : [contents];
  const looseParts: GeminiPart[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      looseParts.push({ text: item });
    } else if (item && Array.isArray((item as { parts?: unknown }).parts)) {
      const turn = item as { role?: string; parts: GeminiPart[] };
      const parts = turn.parts.map(toChatPart);
      const role = turn.role === 'model' ? 'assistant' : 'user';
      messages.push({ role, content: role === 'assistant' ? textOf(turn) : parts });
    } else if (item) {
      looseParts.push(item as GeminiPart);
    }
  }
  if (looseParts.length) messages.push({ role: 'user', content: looseParts.map(toChatPart) });
  return messages;
}

function requestBody(params: GenerateContentParameters, stream: boolean) {
  const config = params.config ?? {};
  return {
    model: getOpenAIModel(),
    messages: toChatMessages(params),
    ...(config.responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}),
    ...(typeof config.temperature === 'number' ? { temperature: config.temperature } : {}),
    ...(typeof config.maxOutputTokens === 'number' ? { max_completion_tokens: config.maxOutputTokens } : {}),
    ...(stream ? { stream: true } : {}),
  };
}

async function post(params: GenerateContentParameters, stream: boolean): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new OpenAIError('OPENAI_API_KEY is not configured');
  const base = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody(params, stream)),
    signal: params.config?.abortSignal,
  });
  if (!res.ok) {
    // Never echo the provider's body to clients; callers only log `message`.
    const detail = await res.text().catch(() => '');
    throw new OpenAIError(`OpenAI request failed (${res.status}): ${detail.slice(0, 200)}`, res.status);
  }
  return res;
}

const asResponse = (text: string) => ({ text }) as unknown as GenerateContentResponse;

/** Reads `data: {...}` lines from an SSE body. */
async function* sseDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) yield delta;
      } catch {
        /* keep-alive or partial line */
      }
    }
  }
}

/** Marks the OpenAI-backed client, so a failure there is not "fallen back" to itself. */
export const OPENAI_CLIENT = Symbol('kaampe.openai');

export function isOpenAIClient(ai: unknown): boolean {
  return !!ai && (ai as Record<symbol, unknown>)[OPENAI_CLIENT] === true;
}

/** A `GoogleGenAI`-shaped client backed by OpenAI Chat Completions. */
export function createOpenAIClient(): Pick<GoogleGenAI, 'models'> {
  const models = {
    async generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse> {
      const res = await post(params, false);
      const json = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
      return asResponse(json.choices?.[0]?.message?.content ?? '');
    },
    async generateContentStream(params: GenerateContentParameters): Promise<AsyncGenerator<GenerateContentResponse>> {
      const res = await post(params, true);
      if (!res.body) throw new OpenAIError('OpenAI returned no stream body');
      const body = res.body;
      return (async function* () {
        for await (const delta of sseDeltas(body)) yield asResponse(delta);
      })();
    },
  };
  return { models, [OPENAI_CLIENT]: true } as unknown as Pick<GoogleGenAI, 'models'>;
}
