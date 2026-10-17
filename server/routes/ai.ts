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
import { generateWithRetry, getModelName, thinkingConfigFor, TIMEOUTS } from '../services/ai/client.js';
import {
  buildGroundedPrompt,
  buildGuidancePrompt,
  wrapUserInput,
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
import { db } from '../db/index.js';
import { sendApiError } from '../middleware/errorHandler.js';
import { startGrievanceFromChat } from '../services/grievance/guide.js';
import grievanceRouter from './grievance.js';
import voiceRouter from './voice.js';
import {
  rupeesToPaise,
  paiseToRupees,
  parseRupeeAmount,
  validateEntryDate,
  MoneyValidationError,
  calculateDailySummary,
  getTodayDateString,
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
});

const AmountInputSchema = z.union([z.number(), z.string().max(20)]);

const ConfirmMoneySchema = z.object({
  earning: z
    .object({
      amount: AmountInputSchema,
      source: z.string().optional().nullable(),
      date: z.string().optional(),
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

  try {
    const body: Record<string, unknown> = await routeChat({ message, sessionId, language, workerType, state });
    if (redacted) body.privacyNotice = MESSAGES.privacyNotice[language];
    const conversationId = sessionProfile?.id
      ? persistTurn(sessionId, parsed.data.conversationId, message, body)
      : undefined;
    return res.json(conversationId ? { ...body, conversationId } : body);
  } catch (err: any) {
    console.error('[AI Chat Error]', err?.message || err);
    return res.status(500).json({
      error: MESSAGES.chatError[language],
      code: 'internal_error',
      fallbackAdvice: MESSAGES.chatErrorAdvice[language],
    });
  }
});

async function routeChat(params: {
  message: string;
  sessionId: string;
  language: Lang;
  workerType: string;
  state: string;
}): Promise<Record<string, unknown>> {
  const { message, sessionId, language, workerType, state } = params;

  // 1. Classify intent (Gemini structured output, regex fallback).
  const intentResult = await extractIntent(message, language);

  // 2. record_money -> confirmation card only; nothing is saved until /confirm-money.
  if (intentResult.intent === 'record_money' && (intentResult.earning || intentResult.expense)) {
    const confirmation = prepareMoneyConfirmation(intentResult.earning, intentResult.expense);
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
    });
    return { type: 'answer', intent: intentResult.intent, ...groundedResult };
  }

  // 6. safety / general -> practical guidance, helplines from the trusted list only.
  const generalResult = await generateConversationalGuidance({
    query: message,
    language,
    workerType,
    isSafety: intentResult.intent === 'safety',
  });
  return { type: 'answer', intent: intentResult.intent, ...generalResult };
}

// ---------------------------------------------------------------------------
// POST /api/ai/confirm-money - saves confirmed transactions
// ---------------------------------------------------------------------------

router.post('/confirm-money', (req, res) => {
  const language = toLang(req.sessionProfile?.language);
  const parsed = ConfirmMoneySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError(req, res, 400, 'validation_failed', { message: MESSAGES.invalidConfirmation[language] });
  }

  const sessionId = req.sessionId;
  const today = getTodayDateString();
  const now = Date.now();
  const savedEntries = [];

  const { earning, expense } = parsed.data;

  // Validate everything before writing anything, so a bad expense never leaves a half-saved pair.
  let earningPaise = 0;
  let expensePaise = 0;
  try {
    if (earning) earningPaise = parseRupeeAmount(earning.amount);
    if (expense) expensePaise = parseRupeeAmount(expense.amount);
  } catch (err) {
    if (err instanceof MoneyValidationError) {
      return sendApiError(req, res, 400, 'validation_failed', { message: MESSAGES.invalidConfirmation[language] });
    }
    throw err;
  }
  const earningDate = earning?.date || today;
  const expenseDate = expense?.date || today;
  if ((earning && validateEntryDate(earningDate, today)) || (expense && validateEntryDate(expenseDate, today))) {
    return sendApiError(req, res, 400, 'validation_failed', { message: MESSAGES.invalidConfirmation[language] });
  }

  if (earning && earningPaise > 0) {
    const id = 'entry_' + crypto.randomUUID();
    const source = (earning.source || 'Earning').slice(0, 60);
    db.prepare(`
      INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
      VALUES (?, ?, 'earning', ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, earningPaise, source, null, earningDate, now, now);

    savedEntries.push({ id, type: 'earning', amountRupees: paiseToRupees(earningPaise), source });
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

  const rows = db.prepare('SELECT * FROM money_entries WHERE session_id = ?').all(sessionId) as any[];
  const allEntries: MoneyEntryRecord[] = rows.map((r) => ({
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

  const updatedToday = calculateDailySummary(allEntries, today);

  res.json({
    success: true,
    savedEntries,
    updatedToday,
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
}) {
  const { query, language, workerType, state, topic } = params;
  const relatedSchemes = relatedSchemesFor(topic, workerType, state, language);
  const schemeReference = topic === 'scheme' ? schemeReferenceForPrompt(matchSchemes({ workerType, state })) : '';
  const withRelated = <T extends object>(result: T) => (relatedSchemes.length ? { ...result, relatedSchemes } : result);

  try {
    const ai = getGenAI();
    const modelName = getModelName();
    const response = await generateWithRetry(
      ai,
      {
        model: modelName,
        contents: wrapUserInput(query),
        config: {
          systemInstruction: buildGroundedPrompt({ workerType, state, language, topic, schemeReference }),
          thinkingConfig: thinkingConfigFor(modelName, 'low'),
          // No responseMimeType: JSON mode is not guaranteed to combine with the search tool,
          // so the JSON is parsed from text instead.
          tools: [{ googleSearch: {} }],
        },
      },
      { timeoutMs: TIMEOUTS.grounded, retries: 1 }
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
}) {
  const { query, language, workerType, isSafety } = params;
  const fallback = () => (isSafety ? safetyFallback(language) : generalFallback(language));

  try {
    const ai = getGenAI();
    const modelName = getModelName();
    const response = await generateWithRetry(
      ai,
      {
        model: modelName,
        contents: wrapUserInput(query),
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
      { timeoutMs: TIMEOUTS.synthesis, retries: 1 }
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

export default router;
