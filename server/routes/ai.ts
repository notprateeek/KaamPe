import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  getGenAI,
  extractIntent,
  prepareMoneyConfirmation,
  answerMoneyQuestion,
  isTrustedGovernmentDomain,
  parseModelJson,
} from '../services/ai/gemini.js';
import {
  generateWithRetry,
  getModelName,
  partialJsonString,
  streamWithRetry,
  thinkingConfigFor,
  TIMEOUTS,
  type GenerateOptions,
} from '../services/ai/client.js';
import {
  buildGroundedPrompt,
  buildGuidancePrompt,
  buildInsightsPrompt,
  wrapWithContext,
  type ContextTurn,
} from '../services/ai/prompts.js';
import {
  redactSensitive,
  findUnlistedPhoneNumbers,
  localizedHelplines,
  safetyFallback,
  generalFallback,
} from '../services/ai/safety.js';
import {
  matchSchemes,
  localizeMatches,
  schemeDisclaimer,
  schemeReferenceForPrompt,
  type LocalizedSchemeMatch,
} from '../services/schemes/match.js';
import { helplineReference } from '../../shared/helplines.js';
import {
  computeInsightFacts,
  factsForPrompt,
  fallbackInsights,
  InsightOutputSchema,
  isInsightFaithful,
  INSIGHT_WINDOW_DAYS,
} from '../services/money/insights.js';
import { db } from '../db/index.js';
import { sendApiError } from '../middleware/errorHandler.js';
import { startGrievanceFromChat } from '../services/grievance/guide.js';
import { numberTokens } from '../services/text/numbers.js';
import grievanceRouter from './grievance.js';
import voiceRouter from './voice.js';
import {
  rupeesToPaise,
  paiseToRupees,
  parseRupeeAmount,
  parseTrips,
  parseWorkHours,
  validateEntryDate,
  MoneyValidationError,
  calculateDailySummary,
  getTodayDateString,
  addDaysToDateString,
  MoneyEntryRecord,
} from '../services/money/calculator.js';

const router = Router();

// POST /api/ai/grievance (guided complaint) and POST /api/ai/transcribe (voice -> text).
router.use(grievanceRouter);
router.use(voiceRouter);

type Lang = 'hi' | 'en' | 'pa';

function toLang(value: unknown): Lang {
  return value === 'en' || value === 'pa' ? value : 'hi';
}

// ---------------------------------------------------------------------------
// Localized user-facing strings
// ---------------------------------------------------------------------------

const MESSAGES = {
  invalidMessage: {
    hi: 'Sandesh sahi nahi hai. Kripya 1 se 2000 akshar ka sawaal likhein.',
    en: 'The message is not valid. Please type a question of 1 to 2000 characters.',
    pa: 'ਸੁਨੇਹਾ ਸਹੀ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ 1 ਤੋਂ 2000 ਅੱਖਰਾਂ ਦਾ ਸਵਾਲ ਲਿਖੋ।',
  },
  rateLimited: {
    hi: 'Kripya agla sandesh bhejne se pehle thoda rukein.',
    en: 'Please wait a moment before sending another message.',
    pa: 'ਕਿਰਪਾ ਕਰਕੇ ਅਗਲਾ ਸੁਨੇਹਾ ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਥੋੜ੍ਹਾ ਰੁਕੋ।',
  },
  chatError: {
    hi: 'AI abhi connect nahi ho paya. Kripya thodi der baad dobara koshish karein.',
    en: 'Could not connect to the AI service. Please try again shortly.',
    pa: 'AI ਹੁਣੇ ਜੁੜ ਨਹੀਂ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
  chatErrorAdvice: {
    hi: 'Network issue ki wajah se AI abhi connect nahi ho paya. Tab tak aap Money tab mein hisaab dekh sakte hain.',
    en: 'A network issue stopped the AI from connecting. Meanwhile you can still use the Money tab.',
    pa: 'ਨੈੱਟਵਰਕ ਦੀ ਸਮੱਸਿਆ ਕਾਰਨ AI ਜੁੜ ਨਹੀਂ ਸਕਿਆ। ਤਦ ਤੱਕ ਤੁਸੀਂ Money ਟੈਬ ਵਿੱਚ ਹਿਸਾਬ ਦੇਖ ਸਕਦੇ ਹੋ।',
  },
  confirmPrompt: {
    hi: 'Kya yeh aaj ke hisab mein add karein?',
    en: "Add to today's money?",
    pa: 'ਕੀ ਇਹ ਅੱਜ ਦੇ ਹਿਸਾਬ ਵਿੱਚ ਜੋੜਨਾ ਹੈ?',
  },
  invalidConfirmation: {
    hi: 'Hisaab ki jaankari sahi nahi hai. Kripya dobara koshish karein.',
    en: 'The money details are not valid. Please try again.',
    pa: 'ਹਿਸਾਬ ਦੀ ਜਾਣਕਾਰੀ ਸਹੀ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
  saved: {
    hi: 'Paisa jud gaya!',
    en: "Saved to today's money!",
    pa: 'ਪੈਸਾ ਦਰਜ ਹੋ ਗਿਆ!',
  },
  privacyNotice: {
    hi: 'Aapke sandesh mein lamba number (Aadhaar/bank/OTP jaisa) tha — humne use chhupa diya. Aise number kisi ko na bhejein.',
    en: 'Your message contained a long number (like Aadhaar, bank or OTP) — we hid it. Never share such numbers with anyone.',
    pa: 'ਤੁਹਾਡੇ ਸੁਨੇਹੇ ਵਿੱਚ ਲੰਮਾ ਨੰਬਰ (ਆਧਾਰ/ਬੈਂਕ/OTP ਵਰਗਾ) ਸੀ — ਅਸੀਂ ਉਸਨੂੰ ਲੁਕਾ ਦਿੱਤਾ। ਅਜਿਹੇ ਨੰਬਰ ਕਿਸੇ ਨੂੰ ਨਾ ਭੇਜੋ।',
  },
  invalidEligibility: {
    hi: 'Di gayi jaankari sahi nahi hai. Umar 14 se 100 ke beech aur kamai 0 ya zyada honi chahiye.',
    en: 'Some details are not valid. Age must be between 14 and 100 and income must be 0 or more.',
    pa: 'ਦਿੱਤੀ ਜਾਣਕਾਰੀ ਸਹੀ ਨਹੀਂ ਹੈ। ਉਮਰ 14 ਤੋਂ 100 ਵਿਚਕਾਰ ਅਤੇ ਕਮਾਈ 0 ਜਾਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।',
  },
} satisfies Record<string, Record<Lang, string>>;

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().max(64).optional(),
  language: z.enum(['hi', 'en', 'pa']).optional(),
  /** Stream the answer as NDJSON events ({event:'partial'|'done'|'error'}). */
  stream: z.boolean().optional(),
  /** Worker opted in to saving money entries from chat without a confirmation tap. */
  autoSave: z.boolean().optional(),
});

const AmountInputSchema = z.union([z.number(), z.string().max(20)]);
const CountInputSchema = z.union([z.number(), z.string().max(8)]).optional().nullable();

/** Trips/hours from the classifier are kept only if that number really appears in the worker's message. */
function onlyStatedWorkDetails<T extends { trips?: number; hours?: number }>(earning: T | undefined, message: string): T | undefined {
  if (!earning) return earning;
  const said = new Set(numberTokens(message));
  const { trips, hours, ...rest } = earning;
  return {
    ...rest,
    ...(typeof trips === 'number' && said.has(String(trips)) ? { trips } : {}),
    ...(typeof hours === 'number' && said.has(numberTokens(String(hours))[0]) ? { hours } : {}),
  } as T;
}

const ConfirmMoneySchema = z.object({
  earning: z
    .object({
      amount: AmountInputSchema,
      source: z.string().optional().nullable(),
      date: z.string().optional(),
      trips: CountInputSchema,
      hours: CountInputSchema,
    })
    .optional()
    .nullable(),
  expense: z
    .object({
      amount: AmountInputSchema,
      category: z.enum(['Fuel', 'Food', 'Maintenance', 'Mobile/data', 'Equipment', 'Other']),
      date: z.string().optional(),
    })
    .optional()
    .nullable(),
});

const TriStateSchema = z.enum(['yes', 'no', 'unknown']).default('unknown');

export const EligibilityRequestSchema = z.object({
  age: z.number().int().min(14).max(100).nullish(),
  monthlyIncomeRupees: z.number().finite().min(0).max(10_000_000).nullish(),
  workerType: z.string().trim().max(40).nullish(),
  state: z.string().trim().max(50).nullish(),
  hasEpfo: TriStateSchema,
  hasEsic: TriStateSchema,
  isIncomeTaxPayer: TriStateSchema,
  language: z.enum(['hi', 'en', 'pa']).optional(),
});

// ---------------------------------------------------------------------------
// Model output schemas: anything that does not match falls back deterministically
// ---------------------------------------------------------------------------

const StepsSchema = z.array(z.string().trim().min(1).max(400)).max(8);

const GroundedOutputSchema = z.object({
  directAnswer: z.string().trim().min(1).max(1500),
  steps: StepsSchema.optional().default([]),
  eligibilityState: z.string().optional(),
});

const GuidanceOutputSchema = z.object({
  directAnswer: z.string().trim().min(1).max(1000),
  steps: StepsSchema.min(1),
});

const ALLOWED_ELIGIBILITY_STATES = [
  'Likely relevant',
  'Possibly relevant',
  'Need more information',
  "Doesn't appear relevant",
  'Unable to verify',
];

// Simple per-session debounce for AI calls (global rate limiting lives in server/index.ts).
const lastRequestTime = new Map<string, number>();

function rateLimitAi(sessionId: string): boolean {
  const now = Date.now();
  const last = lastRequestTime.get(sessionId) || 0;
  if (now - last < 100) return false;
  lastRequestTime.set(sessionId, now);
  if (lastRequestTime.size > 10_000) {
    for (const [id, t] of lastRequestTime) if (now - t > 60_000) lastRequestTime.delete(id);
  }
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------

router.post('/chat', async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const lang = toLang(req.body?.language ?? req.sessionProfile?.language);
    return res.status(400).json({ error: MESSAGES.invalidMessage[lang], code: 'validation_failed', details: parsed.error.errors });
  }

  const sessionId = req.sessionId;
  const sessionProfile = req.sessionProfile;
  const language = toLang(parsed.data.language || sessionProfile?.language);
  const workerType = sessionProfile?.workerType || 'delivery';
  const state = sessionProfile?.state || 'Punjab';

  if (!rateLimitAi(sessionId)) {
    return res.status(429).json({ error: MESSAGES.rateLimited[language], code: 'rate_limited' });
  }

  // Aadhaar/bank/OTP-like numbers never reach the model or the database.
  const message = redactSensitive(parsed.data.message);
  const redacted = message !== parsed.data.message;

  const history = loadContextTurns(sessionId);
  const finish = (body: Record<string, unknown>) => {
    if (redacted) body.privacyNotice = MESSAGES.privacyNotice[language];
    const conversationId = sessionProfile?.id ? persistTurn(sessionId, parsed.data.conversationId, message, body) : undefined;
    return conversationId ? { ...body, conversationId } : body;
  };
  const failure = () => ({
    error: MESSAGES.chatError[language],
    code: 'internal_error',
    fallbackAdvice: MESSAGES.chatErrorAdvice[language],
  });

  if (!parsed.data.stream) {
    try {
      return res.json(
        finish(await routeChat({ message, sessionId, language, workerType, state, history, autoSave: parsed.data.autoSave === true }))
      );
    } catch (err: any) {
      console.error('[AI Chat Error]', err?.message || err);
      return res.status(500).json(failure());
    }
  }

  // Streaming: newline-delimited JSON. "partial" events carry the answer text so far,
  // "done" carries the same body as the non-streaming response. Closing the
  // connection (the Stop button) aborts the model call and nothing is saved.
  const stopped = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) stopped.abort();
  });
  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const send = (event: Record<string, unknown>) => {
    if (!res.writableEnded) res.write(JSON.stringify(event) + '\n');
  };
  try {
    const body = await routeChat({
      message,
      sessionId,
      language,
      workerType,
      state,
      history,
      autoSave: parsed.data.autoSave === true,
      stream: { signal: stopped.signal, onPartial: (directAnswer) => send({ event: 'partial', directAnswer }) },
    });
    if (stopped.signal.aborted) return;
    send({ event: 'done', body: finish(body) });
  } catch (err: any) {
    if (!stopped.signal.aborted) {
      console.error('[AI Chat Stream Error]', err?.message || err);
      send({ event: 'error', ...failure() });
    }
  }
  res.end();
});

/** Streaming hooks for answers written by the model. */
interface StreamHooks {
  signal: AbortSignal;
  onPartial: (directAnswerSoFar: string) => void;
}

/**
 * Generates with or without streaming. While streaming, the "directAnswer" text is
 * reported as it grows, but only while it passes `isSafe` (no invented phone numbers
 * or untrusted links); the final answer is still fully validated by the caller.
 */
function generateMaybeStreaming(
  params: Parameters<typeof generateWithRetry>[1],
  options: GenerateOptions,
  stream: StreamHooks | undefined,
  isSafe: (partial: string) => boolean
) {
  const ai = getGenAI();
  if (!stream) return generateWithRetry(ai, params, options);
  let blocked = false;
  let last = '';
  return streamWithRetry(ai, params, {
    ...options,
    signal: stream.signal,
    onText: (text) => {
      const partial = partialJsonString(text, 'directAnswer');
      if (blocked || !partial || partial === last) return;
      if (!isSafe(partial)) {
        blocked = true;
        return;
      }
      last = partial;
      stream.onPartial(partial);
    },
  });
}

async function routeChat(params: {
  message: string;
  sessionId: string;
  language: Lang;
  workerType: string;
  state: string;
  history: ContextTurn[];
  autoSave?: boolean;
  stream?: StreamHooks;
}): Promise<Record<string, unknown>> {
  const { message, sessionId, language, workerType, state, history, stream, autoSave } = params;

  // 1. Classify intent (Gemini structured output, regex fallback).
  const intentResult = await extractIntent(message, language);

  // 2. record_money -> confirmation card only; nothing is saved until /confirm-money.
  if (intentResult.intent === 'record_money' && (intentResult.earning || intentResult.expense)) {
    const earning = onlyStatedWorkDetails(intentResult.earning, message);
    const confirmation = prepareMoneyConfirmation(earning, intentResult.expense);
    // Opt-in: save straight away (the reply offers Undo). Falls back to the card if anything is invalid.
    if (autoSave) {
      const saved = saveConfirmedMoney(sessionId, {
        earning: earning ? { amount: earning.amount, source: earning.source, trips: earning.trips, hours: earning.hours } : null,
        expense: intentResult.expense ? { amount: intentResult.expense.amount, category: intentResult.expense.category ?? 'Other' } : null,
      });
      if (saved?.length) {
        return {
          type: 'saved',
          intent: 'record_money',
          message: MESSAGES.saved[language],
          confirmation,
          savedEntries: saved,
          updatedToday: todaySummaryFor(sessionId),
        };
      }
    }
    return {
      type: 'confirmation',
      intent: 'record_money',
      message: MESSAGES.confirmPrompt[language],
      confirmation,
      rawIntent: intentResult,
    };
  }

  // 3. ask_money -> deterministic answer from the DB, no LLM.
  if (intentResult.intent === 'ask_money') {
    const moneyAnswer = answerMoneyQuestion(sessionId, language);
    return {
      type: 'answer',
      intent: 'ask_money',
      directAnswer: moneyAnswer.directAnswer,
      steps: moneyAnswer.steps,
      breakdown: moneyAnswer.breakdown,
    };
  }

  // 4. grievance -> ask for missing facts, or an editable draft built only from user facts.
  if (intentResult.intent === 'grievance') {
    return { ...(await startGrievanceFromChat(message, language, intentResult.dispute)) };
  }

  // 5. scheme / rights -> Google Search grounding, official sources only.
  if (intentResult.intent === 'scheme' || intentResult.intent === 'rights') {
    const groundedResult = await generateGroundedAnswer({
      query: message,
      language,
      workerType,
      state,
      topic: intentResult.intent,
      history,
      stream,
    });
    return { type: 'answer', intent: intentResult.intent, ...groundedResult };
  }

  // 6. safety / general -> practical guidance, helplines from the trusted list only.
  const generalResult = await generateConversationalGuidance({
    query: message,
    language,
    workerType,
    isSafety: intentResult.intent === 'safety',
    history,
    stream,
  });
  return { type: 'answer', intent: intentResult.intent, ...generalResult };
}

// ---------------------------------------------------------------------------
// POST /api/ai/safety - safety coach for one situation (Help → Safety)
// ---------------------------------------------------------------------------

const SafetyRequestSchema = z.object({
  situation: z.string().trim().min(1).max(1000),
  language: z.enum(['hi', 'en', 'pa']).optional(),
});

router.post('/safety', async (req, res) => {
  const parsed = SafetyRequestSchema.safeParse(req.body);
  const language = toLang(parsed.success ? parsed.data.language ?? req.sessionProfile?.language : req.sessionProfile?.language);
  if (!parsed.success) {
    return res.status(400).json({ error: MESSAGES.invalidMessage[language], code: 'validation_failed' });
  }
  // Always answers: a model failure falls back to the trusted helplines and basic steps.
  const result = await generateConversationalGuidance({
    query: redactSensitive(parsed.data.situation),
    language,
    workerType: req.sessionProfile?.workerType || 'delivery',
    isSafety: true,
  });
  return res.json({ type: 'answer', intent: 'safety', ...result });
});

// ---------------------------------------------------------------------------
// POST /api/ai/money-insights - plain-language analysis of the worker's own log
// ---------------------------------------------------------------------------

router.post('/money-insights', async (req, res) => {
  const language = toLang(req.body?.language ?? req.sessionProfile?.language);
  const today = getTodayDateString();
  const rows = db
    .prepare('SELECT * FROM money_entries WHERE session_id = ? AND date >= ? AND date <= ?')
    .all(req.sessionId, addDaysToDateString(today, -(INSIGHT_WINDOW_DAYS - 1)), today) as any[];
  const entries: MoneyEntryRecord[] = rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    type: r.type,
    amountPaise: r.amount_paise,
    categoryOrSource: r.category_or_source,
    note: r.note,
    date: r.date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  const facts = computeInsightFacts(entries, today);
  if (facts.earnedRupees === 0 && facts.spentRupees === 0) {
    return res.json({ empty: true, facts });
  }

  try {
    const ai = getGenAI();
    const modelName = getModelName();
    const response = await generateWithRetry(
      ai,
      {
        model: modelName,
        // Source/category names are user-typed: they travel inside the data block.
        contents: wrapWithContext(`FACTS:\n${factsForPrompt(facts)}`),
        config: {
          systemInstruction: buildInsightsPrompt({ workerType: req.sessionProfile?.workerType || 'delivery', language }),
          thinkingConfig: thinkingConfigFor(modelName, 'low'),
          responseMimeType: 'application/json',
        },
      },
      { timeoutMs: TIMEOUTS.synthesis, retries: 1 }
    );
    const output = InsightOutputSchema.safeParse(parseModelJson(response.text));
    if (output.success && isInsightFaithful(output.data, facts)) {
      const { summary, tips, warning } = output.data;
      return res.json({ facts, summary, tips, ...(warning ? { warning } : {}), usedFallback: false });
    }
  } catch (err) {
    console.error('[Money Insights Error]', (err as Error).message);
  }
  return res.json({ facts, ...fallbackInsights(facts, language) });
});

// ---------------------------------------------------------------------------
// POST /api/ai/confirm-money - saves confirmed transactions
// ---------------------------------------------------------------------------

type ConfirmMoneyInput = z.infer<typeof ConfirmMoneySchema>;
type SavedEntry = Record<string, unknown> & { id: string; type: 'earning' | 'expense' };

/**
 * Validates and saves a confirmed earning and/or expense for one session.
 * Everything is validated before anything is written, so a bad expense never
 * leaves a half-saved pair. Returns null when the input is not valid.
 */
function saveConfirmedMoney(sessionId: string, input: ConfirmMoneyInput): SavedEntry[] | null {
  const today = getTodayDateString();
  const now = Date.now();
  const { earning, expense } = input;
  let earningPaise = 0;
  let expensePaise = 0;
  let trips: number | null = null;
  let workMinutes: number | null = null;
  try {
    if (earning) earningPaise = parseRupeeAmount(earning.amount);
    if (expense) expensePaise = parseRupeeAmount(expense.amount);
    if (earning) {
      trips = parseTrips(earning.trips);
      workMinutes = parseWorkHours(earning.hours);
    }
  } catch (err) {
    if (err instanceof MoneyValidationError) return null;
    throw err;
  }
  const earningDate = earning?.date || today;
  const expenseDate = expense?.date || today;
  if ((earning && validateEntryDate(earningDate, today)) || (expense && validateEntryDate(expenseDate, today))) return null;

  const savedEntries: SavedEntry[] = [];
  db.exec('BEGIN');
  try {
    if (earning && earningPaise > 0) {
      const id = 'entry_' + crypto.randomUUID();
      const source = (earning.source || 'Earning').slice(0, 60);
      db.prepare(`
        INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at, trips, work_minutes)
        VALUES (?, ?, 'earning', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, sessionId, earningPaise, source, null, earningDate, now, now, trips, workMinutes);
      savedEntries.push({ id, type: 'earning', amountRupees: paiseToRupees(earningPaise), source, trips, workMinutes });
    }
    if (expense && expensePaise > 0) {
      const id = 'entry_' + crypto.randomUUID();
      const category = expense.category || 'Other';
      db.prepare(`
        INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
        VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?)
      `).run(id, sessionId, expensePaise, category, null, expenseDate, now, now);
      savedEntries.push({ id, type: 'expense', amountRupees: paiseToRupees(expensePaise), category });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return savedEntries;
}

function todaySummaryFor(sessionId: string) {
  const today = getTodayDateString();
  const rows = db.prepare('SELECT * FROM money_entries WHERE session_id = ? AND date = ?').all(sessionId, today) as any[];
  const entries: MoneyEntryRecord[] = rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    type: r.type,
    amountPaise: r.amount_paise,
    categoryOrSource: r.category_or_source,
    note: r.note,
    date: r.date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return calculateDailySummary(entries, today);
}

router.post('/confirm-money', (req, res) => {
  const language = toLang(req.sessionProfile?.language);
  const parsed = ConfirmMoneySchema.safeParse(req.body);
  const savedEntries = parsed.success ? saveConfirmedMoney(req.sessionId, parsed.data) : null;
  if (!savedEntries) {
    return sendApiError(req, res, 400, 'validation_failed', { message: MESSAGES.invalidConfirmation[language] });
  }
  res.json({
    success: true,
    savedEntries,
    updatedToday: todaySummaryFor(req.sessionId),
    message: MESSAGES.saved[language],
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/schemes/eligibility - deterministic scheme pre-check (no LLM)
// ---------------------------------------------------------------------------

router.post('/schemes/eligibility', (req, res) => {
  const parsed = EligibilityRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const lang = toLang(req.body?.language ?? req.sessionProfile?.language);
    return sendApiError(req, res, 400, 'validation_failed', { message: MESSAGES.invalidEligibility[lang] });
  }

  const input = parsed.data;
  const language = toLang(input.language ?? req.sessionProfile?.language);
  const matches = matchSchemes({
    age: input.age ?? undefined,
    monthlyIncomePaise:
      input.monthlyIncomeRupees === null || input.monthlyIncomeRupees === undefined
        ? undefined
        : rupeesToPaise(input.monthlyIncomeRupees),
    workerType: input.workerType || req.sessionProfile?.workerType,
    state: input.state || req.sessionProfile?.state,
    hasEpfo: input.hasEpfo,
    hasEsic: input.hasEsic,
    isIncomeTaxPayer: input.isIncomeTaxPayer,
  });

  res.json({
    matches: localizeMatches(matches, language),
    disclaimer: schemeDisclaimer(language),
  });
});

// ---------------------------------------------------------------------------
// Scheme / rights answers with Google Search grounding
// ---------------------------------------------------------------------------

/** Removes any URL from model text that is not on the official allowlist. */
function stripUntrustedUrls(text: string): string {
  return text.replace(/\bhttps?:\/\/[^\s)\]"'<>]+/gi, (url) => (isTrustedGovernmentDomain(url) ? url : '')).replace(/\s{2,}/g, ' ').trim();
}

function relatedSchemesFor(topic: 'scheme' | 'rights', workerType: string, state: string, language: Lang): LocalizedSchemeMatch[] {
  if (topic !== 'scheme') return [];
  return localizeMatches(matchSchemes({ workerType, state }), language).slice(0, 4);
}

async function generateGroundedAnswer(params: {
  query: string;
  language: Lang;
  workerType: string;
  state: string;
  topic: 'scheme' | 'rights';
  history?: ContextTurn[];
  stream?: StreamHooks;
}) {
  const { query, language, workerType, state, topic, history, stream } = params;
  const relatedSchemes = relatedSchemesFor(topic, workerType, state, language);
  const schemeReference = topic === 'scheme' ? schemeReferenceForPrompt(matchSchemes({ workerType, state })) : '';
  const withRelated = <T extends object>(result: T) => (relatedSchemes.length ? { ...result, relatedSchemes } : result);

  try {
    const modelName = getModelName();
    const response = await generateMaybeStreaming(
      {
        model: modelName,
        contents: wrapWithContext(query, history),
        config: {
          systemInstruction: buildGroundedPrompt({ workerType, state, language, topic, schemeReference }),
          thinkingConfig: thinkingConfigFor(modelName, 'low'),
          // No responseMimeType: JSON mode is not guaranteed to combine with the search tool,
          // so the JSON is parsed from text instead.
          tools: [{ googleSearch: {} }],
        },
      },
      { timeoutMs: TIMEOUTS.grounded, retries: 1 },
      stream,
      (partial) => stripUntrustedUrls(partial) === partial && findUnlistedPhoneNumbers([partial], query).length === 0
    );

    // Source links come only from grounding metadata, never from model-written text.
    // Grounding URIs are Google redirect links, so trust is decided on the reported source domain.
    const sources: Array<{ title: string; url: string }> = [];
    const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    for (const chunk of chunks) {
      const web = chunk?.web;
      if (!web?.uri || typeof web.uri !== 'string') continue;
      const domain = String(web.domain || web.title || '').trim();
      const trusted = isTrustedGovernmentDomain(web.uri) || isTrustedGovernmentDomain(`https://${domain}`);
      if (trusted && !sources.some((s) => s.url === web.uri)) {
        sources.push({ title: String(web.title || domain), url: web.uri });
      }
    }

    const output = GroundedOutputSchema.safeParse(parseModelJson(response.text));
    if (sources.length === 0 || !output.success) {
      return withRelated(getUnverifiedAnswer(language, state));
    }

    const directAnswer = stripUntrustedUrls(output.data.directAnswer);
    const steps = output.data.steps.map(stripUntrustedUrls).filter(Boolean).slice(0, 4);
    if (!directAnswer || findUnlistedPhoneNumbers([directAnswer, ...steps], query).length > 0) {
      return withRelated(getUnverifiedAnswer(language, state));
    }

    return withRelated({
      directAnswer,
      steps,
      sources,
      eligibilityState: ALLOWED_ELIGIBILITY_STATES.includes(output.data.eligibilityState ?? '')
        ? output.data.eligibilityState
        : 'Need more information',
    });
  } catch (err) {
    console.error('[Grounded Answer Error]', (err as Error).message);
    return withRelated(getUnverifiedAnswer(language, state));
  }
}

/**
 * Honest response when no trusted official evidence was found. Links are from the
 * application-controlled registry (where to check), not presented as evidence for a claim.
 */
function getUnverifiedAnswer(language: Lang, state: string) {
  const registry = state.toLowerCase().includes('punjab')
    ? [
        { title: 'Punjab BOCW Welfare Board', url: 'https://bocw.punjab.gov.in' },
        { title: 'Punjab Labour Department', url: 'https://pblabour.gov.in' },
        { title: 'e-Shram Portal (Govt of India)', url: 'https://eshram.gov.in' },
      ]
    : [
        { title: 'e-Shram Portal (Govt of India)', url: 'https://eshram.gov.in' },
        { title: 'myScheme Official Portal', url: 'https://myscheme.gov.in' },
      ];

  if (language === 'hi') {
    return {
      directAnswer: 'Mujhe abhi iska reliable official source nahi mila. Main guess nahi karunga.',
      steps: ['Neeche diye official portal par khud jaankari check karein.', 'Nazdeeki CSC / Sewa Kendra par poochh sakte hain.'],
      sources: registry,
      eligibilityState: 'Unable to verify',
    };
  }
  if (language === 'pa') {
    return {
      directAnswer: 'ਮੈਨੂੰ ਹੁਣੇ ਇਸਦਾ ਭਰੋਸੇਯੋਗ ਸਰਕਾਰੀ ਸਰੋਤ ਨਹੀਂ ਮਿਲਿਆ। ਮੈਂ ਅੰਦਾਜ਼ਾ ਨਹੀਂ ਲਗਾਵਾਂਗਾ।',
      steps: ['ਹੇਠਾਂ ਦਿੱਤੇ ਸਰਕਾਰੀ ਪੋਰਟਲ \'ਤੇ ਖੁਦ ਜਾਣਕਾਰੀ ਦੇਖੋ।', 'ਨੇੜਲੇ CSC / ਸੇਵਾ ਕੇਂਦਰ \'ਤੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।'],
      sources: registry,
      eligibilityState: 'Unable to verify',
    };
  }
  return {
    directAnswer: "I couldn't find a reliable official source for this right now. I won't guess.",
    steps: ['Check the official portals below directly.', 'You can also ask at your nearest CSC / Sewa Kendra.'],
    sources: registry,
    eligibilityState: 'Unable to verify',
  };
}

// ---------------------------------------------------------------------------
// Safety / general guidance
// ---------------------------------------------------------------------------

async function generateConversationalGuidance(params: {
  query: string;
  language: Lang;
  workerType: string;
  isSafety: boolean;
  history?: ContextTurn[];
  stream?: StreamHooks;
}) {
  const { query, language, workerType, isSafety, history, stream } = params;
  const fallback = () => (isSafety ? safetyFallback(language) : generalFallback(language));

  try {
    const modelName = getModelName();
    const response = await generateMaybeStreaming(
      {
        model: modelName,
        contents: wrapWithContext(query, history),
        config: {
          systemInstruction: buildGuidancePrompt({
            workerType,
            language,
            isSafety,
            helplineReference: helplineReference(language),
          }),
          thinkingConfig: thinkingConfigFor(modelName, isSafety ? 'low' : 'minimal'),
          responseMimeType: 'application/json',
        },
      },
      { timeoutMs: TIMEOUTS.synthesis, retries: 1 },
      stream,
      (partial) => findUnlistedPhoneNumbers([partial], query).length === 0
    );

    const output = GuidanceOutputSchema.safeParse(parseModelJson(response.text));
    if (!output.success) return fallback();

    const steps = output.data.steps.slice(0, 5);
    // Any phone number not on the trusted helpline list means the answer is not safe to show.
    if (findUnlistedPhoneNumbers([output.data.directAnswer, ...steps], query).length > 0) {
      return fallback();
    }

    return isSafety
      ? { directAnswer: output.data.directAnswer, steps, helplines: localizedHelplines(language) }
      : { directAnswer: output.data.directAnswer, steps };
  } catch (err) {
    console.error('[Guidance Error]', (err as Error).message);
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// Conversation persistence (per session; content is already redacted)
// ---------------------------------------------------------------------------

function assistantText(body: Record<string, unknown>): string {
  for (const key of ['directAnswer', 'draftMessage', 'message', 'summary']) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

/**
 * Stores the user turn and the assistant reply. Reuses `conversationId` only
 * when it belongs to this session; otherwise starts a new conversation.
 * Persistence failures never break the chat response.
 */
function persistTurn(
  sessionId: string,
  requestedConversationId: string | undefined,
  userText: string,
  body: Record<string, unknown>
): string | undefined {
  try {
    const now = Date.now();
    let conversationId: string | undefined;
    if (requestedConversationId) {
      const owned = db
        .prepare('SELECT id FROM conversations WHERE id = ? AND session_id = ?')
        .get(requestedConversationId, sessionId) as { id: string } | undefined;
      conversationId = owned?.id;
    }

    db.exec('BEGIN');
    try {
      if (conversationId) {
        db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ? AND session_id = ?').run(now, conversationId, sessionId);
      } else {
        conversationId = 'conv_' + crypto.randomUUID();
        db.prepare('INSERT INTO conversations (id, session_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(conversationId, sessionId, now, now);
      }
      const insert = db.prepare(
        'INSERT INTO messages (id, conversation_id, session_id, role, content, structured_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      insert.run('msg_' + crypto.randomUUID(), conversationId, sessionId, 'user', userText, null, now);
      insert.run('msg_' + crypto.randomUUID(), conversationId, sessionId, 'assistant', assistantText(body), JSON.stringify(body), now + 1);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    return conversationId;
  } catch (err) {
    console.error('[Conversation Persist Error]', (err as Error).message);
    return undefined;
  }
}

/** Turns older than this are not used as context for a new question. */
const CONTEXT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const CONTEXT_TURNS = 6;
const HISTORY_LIMIT = 60;

/** The session's last few chat turns (oldest first), used as context for follow-up questions. */
export function loadContextTurns(sessionId: string, now = Date.now()): ContextTurn[] {
  try {
    const rows = db
      .prepare(
        `SELECT role, content FROM messages
         WHERE session_id = ? AND created_at >= ? AND content != ''
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(sessionId, now - CONTEXT_MAX_AGE_MS, CONTEXT_TURNS) as unknown as ContextTurn[];
    return rows.reverse();
  } catch (err) {
    console.error('[Context Load Error]', (err as Error).message);
    return [];
  }
}

/**
 * A stored reply as the client can show it again. Money confirmation cards are
 * reduced to text: a replayed card must never offer to save the same entry twice.
 */
function replayable(structured: string | null): Record<string, unknown> | undefined {
  if (!structured) return undefined;
  try {
    const body = JSON.parse(structured) as Record<string, unknown>;
    if (body.type === 'confirmation') return undefined;
    const { rawIntent: _rawIntent, privacyNotice: _privacyNotice, conversationId: _conversationId, ...rest } = body;
    return rest;
  } catch {
    return undefined;
  }
}

// GET /api/ai/history - this session's saved chat (oldest first), so it survives a reload.
router.get('/history', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, role, content, structured_data, created_at FROM messages
       WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(req.sessionId, HISTORY_LIMIT) as Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    structured_data: string | null;
    created_at: number;
  }>;
  const messages = rows.reverse().map((row) => {
    const data = row.role === 'assistant' ? replayable(row.structured_data) : undefined;
    return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at, ...(data ? { data } : {}) };
  });
  res.json({ messages });
});

// DELETE /api/ai/history - forget this session's chat (and its context for future answers).
router.delete('/history', (req, res) => {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM messages WHERE session_id = ?').run(req.sessionId);
    db.prepare('DELETE FROM conversations WHERE session_id = ?').run(req.sessionId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  res.status(204).end();
});

export default router;
