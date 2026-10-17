import { z } from 'zod';
import { getGenAI, parseModelJson } from '../ai/gemini.js';
import { generateWithRetry, getModelName, thinkingConfigFor, TIMEOUTS } from '../ai/client.js';
import { buildGrievanceContents, buildGrievancePrompt } from '../ai/prompts.js';
import { findUnlistedPhoneNumbers } from '../ai/safety.js';
import { numberTokens, toAsciiDigits } from '../text/numbers.js';

/**
 * Guided grievance drafting.
 *
 * Facts (amount, duration, platform) are collected deterministically from what
 * the worker typed; the model only writes the final wording, and its draft is
 * rejected in favour of a fact-only template if it drops or invents anything.
 */

export type Lang = 'hi' | 'en' | 'pa';
export type GrievanceIssue = 'payment' | 'deduction' | 'account' | 'other';
export type GrievanceField = 'amount' | 'duration';
export type DurationUnit = 'days' | 'weeks' | 'months';

/** Only one of days / weeks / months is set; the worker's own unit is kept. */
export interface GrievanceFacts {
  amount?: number;
  days?: number;
  weeks?: number;
  months?: number;
  platform?: string;
}

export const GRIEVANCE_FIELDS = ['amount', 'duration'] as const;
export const MAX_AMOUNT_RUPEES = 10_000_000;
export const MAX_DURATION = 3650;

const amountValue = z
  .number()
  .positive()
  .max(MAX_AMOUNT_RUPEES)
  .refine((n) => Math.round(n * 100) === n * 100, 'at most 2 decimals');
const durationValue = z.number().int().min(1).max(MAX_DURATION);

export const GrievanceFactsSchema = z
  .object({
    amount: amountValue.nullish(),
    days: durationValue.nullish(),
    weeks: durationValue.nullish(),
    months: durationValue.nullish(),
    platform: z.string().trim().max(60).nullish(),
  })
  .strict();

/** Drops nulls/empties and keeps a single duration unit. */
export function cleanFacts(input: z.infer<typeof GrievanceFactsSchema> | undefined): GrievanceFacts {
  const facts: GrievanceFacts = {};
  if (!input) return facts;
  if (typeof input.amount === 'number') facts.amount = input.amount;
  if (typeof input.days === 'number') facts.days = input.days;
  else if (typeof input.weeks === 'number') facts.weeks = input.weeks;
  else if (typeof input.months === 'number') facts.months = input.months;
  const platform = input.platform?.replace(/[<>{}\[\]"`]/g, '').trim();
  if (platform) facts.platform = platform;
  return facts;
}

export function getDuration(facts: GrievanceFacts): { value: number; unit: DurationUnit } | null {
  if (typeof facts.days === 'number') return { value: facts.days, unit: 'days' };
  if (typeof facts.weeks === 'number') return { value: facts.weeks, unit: 'weeks' };
  if (typeof facts.months === 'number') return { value: facts.months, unit: 'months' };
  return null;
}

function hasField(facts: GrievanceFacts, field: GrievanceField): boolean {
  return field === 'amount' ? typeof facts.amount === 'number' : getDuration(facts) !== null;
}

// ---------------------------------------------------------------------------
// Issue type and relevant questions
// ---------------------------------------------------------------------------

const ACCOUNT_RE = /block|deactivat|suspend|\bid\s*band|account\s*band|\bban(ned)?\b|ब्लॉक|ਬਲੌਕ|ਬਲਾਕ|खाता बंद|ਖਾਤਾ ਬੰਦ/i;
const DEDUCTION_RE = /deduct|\bcut\b|\bkat(a|e|i|ega|liya|li|ne)\b|kaat|katauti|katoti|penalt|\bfine\b|jurmana|कटौती|काट|कटे|कटा|जुर्माना|ਕਟੌਤੀ|ਕੱਟ|ਜੁਰਮਾਨਾ/i;
const PAYMENT_RE = /pay|paisa|paise|salary|wage|tankh?wah|mazdoori|majduri|pending|\bdue\b|bakaya|baaki|nahi mil|nahin mil|nhi mil|पैस|भुगतान|वेतन|मजदूरी|तनख्वाह|पेमेंट|बकाया|ਪੈਸੇ|ਭੁਗਤਾਨ|ਤਨਖਾਹ|ਮਜ਼ਦੂਰੀ|ਪੇਮੈਂਟ|ਬਕਾਇਆ/i;

export function detectIssue(text: string): GrievanceIssue {
  if (ACCOUNT_RE.test(text)) return 'account';
  if (DEDUCTION_RE.test(text)) return 'deduction';
  if (PAYMENT_RE.test(text)) return 'payment';
  return 'other';
}

/** Facts worth asking for, per issue. Platform/employer is always optional and never asked. */
export function relevantFields(issue: GrievanceIssue): GrievanceField[] {
  if (issue === 'payment') return ['amount', 'duration'];
  if (issue === 'deduction') return ['amount'];
  if (issue === 'account') return ['duration'];
  return [];
}

export function missingFields(issue: GrievanceIssue, facts: GrievanceFacts, unknown: GrievanceField[]): GrievanceField[] {
  return relevantFields(issue).filter((f) => !hasField(facts, f) && !unknown.includes(f));
}

// ---------------------------------------------------------------------------
// Deterministic parsing of the worker's own words
// ---------------------------------------------------------------------------

const DONT_KNOW_RE =
  /pata\s*nahi|pta\s*nahi|pta\s*nhi|pata\s*nhi|nahi\s*pata|malum\s*nahi|maloom\s*nahi|yaad\s*nahi|don'?t\s*know|do not know|not\s*sure|no\s*idea|dont\s*remember|पता\s*नहीं|मालूम\s*नहीं|याद\s*नहीं|ਪਤਾ\s*ਨਹੀਂ|ਨਹੀਂ\s*ਪਤਾ|ਯਾਦ\s*ਨਹੀਂ/i;

export function isDontKnow(text: string): boolean {
  return DONT_KNOW_RE.test(text);
}

const NUM = String.raw`(\d[\d,]*(?:\.\d{1,2})?)`;
const DURATION_RE = new RegExp(
  NUM +
    String.raw`\s*(din|dino|dinon|days?|दिन|दिनों|ਦਿਨ|ਦਿਨਾਂ|hafte|hafta|hafton|weeks?|हफ्ते|हफ़्ते|हफ्ता|हफ़्ता|सप्ताह|ਹਫ਼ਤੇ|ਹਫ਼ਤਾ|ਹਫਤੇ|ਹਫ਼ਤਿਆਂ|mahina|mahine|mahino|months?|महीना|महीने|महीनों|ਮਹੀਨਾ|ਮਹੀਨੇ|ਮਹੀਨਿਆਂ)(?![\p{L}])`,
  'iu'
);
const CURRENCY_BEFORE_RE = new RegExp(String.raw`(?:₹|\brs\.?|\binr)\s*` + NUM, 'i');
const CURRENCY_AFTER_RE = new RegExp(
  NUM + String.raw`\s*(?:rs\b\.?|rupees?|rupaye|rupaiye|rupay|rupiya|rupaiya|रुपये|रुपए|रुपया|रुपैया|ਰੁਪਏ|ਰੁਪਈਏ|ਰੁਪਿਆ)`,
  'iu'
);
const BARE_NUMBER_RE = new RegExp(String.raw`(?<![\d.])` + NUM + String.raw`(?![\d])`, 'g');

function unitFor(word: string): DurationUnit {
  if (/^(din|dino|dinon|day|days|दिन|दिनों|ਦਿਨ|ਦਿਨਾਂ)$/i.test(word)) return 'days';
  if (/^(mahina|mahine|mahino|months?|महीना|महीने|महीनों|ਮਹੀਨਾ|ਮਹੀਨੇ|ਮਹੀਨਿਆਂ)$/i.test(word)) return 'months';
  return 'weeks';
}

function toAmount(raw: string): number | undefined {
  const n = Number(raw.replace(/,/g, ''));
  return amountValue.safeParse(n).success ? n : undefined;
}

function toDuration(raw: string): number | undefined {
  const n = Number(raw.replace(/,/g, ''));
  return durationValue.safeParse(n).success ? n : undefined;
}

/**
 * Reads an amount and/or a duration from the worker's text. A number without a
 * currency sign or unit is used only when exactly one fact is being asked for
 * (or for the amount when exactly one bare number is left).
 */
export function parseFacts(text: string, expect: GrievanceField[]): GrievanceFacts {
  let rest = toAsciiDigits(text);
  const facts: GrievanceFacts = {};

  const duration = rest.match(DURATION_RE);
  if (duration) {
    const value = toDuration(duration[1]);
    if (value !== undefined) facts[unitFor(duration[2])] = value;
    rest = rest.replace(duration[0], ' ');
  }

  const currency = rest.match(CURRENCY_BEFORE_RE) ?? rest.match(CURRENCY_AFTER_RE);
  if (currency) {
    const value = toAmount(currency[1]);
    if (value !== undefined) facts.amount = value;
    rest = rest.replace(currency[0], ' ');
  }

  const bare = [...rest.matchAll(BARE_NUMBER_RE)].map((m) => m[1]);
  if (bare.length === 1) {
    const wantsAmount = expect.includes('amount') && facts.amount === undefined;
    const wantsDuration = expect.includes('duration') && !getDuration(facts);
    if (wantsAmount) {
      const value = toAmount(bare[0]);
      if (value !== undefined) facts.amount = value;
    } else if (wantsDuration && expect.length === 1) {
      const value = toDuration(bare[0]);
      if (value !== undefined) facts.days = value;
    }
  }
  return facts;
}

/** Platform names recognised in the worker's text (never added unless the worker wrote them). */
export const KNOWN_PLATFORMS = [
  'swiggy', 'zomato', 'uber', 'ola', 'rapido', 'zepto', 'blinkit', 'porter', 'dunzo',
  'urban company', 'amazon', 'flipkart', 'bigbasket', 'shadowfax', 'instamart',
];

export function mentionedInMessage(message: string, value: string): boolean {
  const needle = value.trim().toLowerCase();
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(message);
}

export function platformFromText(text: string): string | undefined {
  const found = KNOWN_PLATFORMS.find((p) => mentionedInMessage(text, p));
  return found ? found.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined;
}

/** Fills only facts that are still empty; never overwrites what the worker already confirmed. */
export function mergeFacts(base: GrievanceFacts, extra: GrievanceFacts): GrievanceFacts {
  const merged: GrievanceFacts = { ...base };
  if (merged.amount === undefined && extra.amount !== undefined) merged.amount = extra.amount;
  if (!getDuration(merged)) {
    const d = getDuration(extra);
    if (d) merged[d.unit] = d.value;
  }
  if (!merged.platform && extra.platform) merged.platform = extra.platform;
  return merged;
}

// ---------------------------------------------------------------------------
// Localized text
// ---------------------------------------------------------------------------

export function formatDuration(d: { value: number; unit: DurationUnit }, language: Lang): string {
  const { value, unit } = d;
  if (language === 'hi') {
    if (unit === 'days') return `${value} din`;
    if (unit === 'weeks') return value === 1 ? '1 hafta' : `${value} hafte`;
    return value === 1 ? '1 mahina' : `${value} mahine`;
  }
  if (language === 'pa') {
    if (unit === 'days') return `${value} ਦਿਨਾਂ`;
    if (unit === 'weeks') return `${value} ਹਫ਼ਤਿਆਂ`;
    return `${value} ਮਹੀਨਿਆਂ`;
  }
  const word = unit === 'days' ? 'day' : unit === 'weeks' ? 'week' : 'month';
  return `${value} ${word}${value === 1 ? '' : 's'}`;
}

const QUESTIONS: Record<GrievanceField, Record<'payment' | 'deduction' | 'account', Record<Lang, string>>> = {
  amount: {
    payment: {
      hi: 'Kitne rupaye ki payment baaki hai?',
      en: 'How much money is pending (₹)?',
      pa: 'ਕਿੰਨੇ ਰੁਪਏ ਦੀ ਪੇਮੈਂਟ ਬਾਕੀ ਹੈ?',
    },
    deduction: {
      hi: 'Kitne rupaye kaate gaye?',
      en: 'How much money was deducted (₹)?',
      pa: 'ਕਿੰਨੇ ਰੁਪਏ ਕੱਟੇ ਗਏ?',
    },
    account: {
      hi: 'Kitne rupaye ka maamla hai?',
      en: 'How much money is involved (₹)?',
      pa: 'ਕਿੰਨੇ ਰੁਪਏ ਦਾ ਮਾਮਲਾ ਹੈ?',
    },
  },
  duration: {
    payment: {
      hi: 'Payment kitne din se pending hai?',
      en: 'How long has it been pending (for example, 8 days)?',
      pa: 'ਪੇਮੈਂਟ ਕਿੰਨੇ ਦਿਨਾਂ ਤੋਂ ਬਾਕੀ ਹੈ?',
    },
    deduction: {
      hi: 'Paise kitne din pehle kaate gaye?',
      en: 'How long ago was the money deducted?',
      pa: 'ਪੈਸੇ ਕਿੰਨੇ ਦਿਨ ਪਹਿਲਾਂ ਕੱਟੇ ਗਏ?',
    },
    account: {
      hi: 'Account kitne din se band hai?',
      en: 'How long has your account been blocked?',
      pa: 'ਖਾਤਾ ਕਿੰਨੇ ਦਿਨਾਂ ਤੋਂ ਬੰਦ ਹੈ?',
    },
  },
};

const GUIDE_TEXT = {
  intro: {
    hi: 'Achhi shikayat banane ke liye thodi jaankari chahiye. Agar pata nahi hai to "Pata nahi" chunein.',
    en: 'A few details will make your complaint clearer. If you don\'t know, choose "I don\'t know".',
    pa: 'ਚੰਗੀ ਸ਼ਿਕਾਇਤ ਬਣਾਉਣ ਲਈ ਥੋੜ੍ਹੀ ਜਾਣਕਾਰੀ ਚਾਹੀਦੀ ਹੈ। ਜੇ ਪਤਾ ਨਹੀਂ ਤਾਂ "ਪਤਾ ਨਹੀਂ" ਚੁਣੋ।',
  },
  notUnderstood: {
    hi: 'Jawab mein yeh jaankari nahi mili. Number mein likhein, jaise: ₹3200, 8 din. Ya "Pata nahi" chunein.',
    en: 'I could not find that in your reply. Please write numbers, for example: ₹3200, 8 days. Or choose "I don\'t know".',
    pa: 'ਜਵਾਬ ਵਿੱਚ ਇਹ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ। ਨੰਬਰ ਵਿੱਚ ਲਿਖੋ, ਜਿਵੇਂ: ₹3200, 8 ਦਿਨ। ਜਾਂ "ਪਤਾ ਨਹੀਂ" ਚੁਣੋ।',
  },
  review: {
    hi: 'Maine yeh baatein samjhi hain. Jaanch lein, zaroorat ho to badlein, phir draft banayein.',
    en: 'Here is what I understood. Check it, correct anything, then create the draft.',
    pa: 'ਮੈਂ ਇਹ ਗੱਲਾਂ ਸਮਝੀਆਂ ਹਨ। ਜਾਂਚ ਲਓ, ਲੋੜ ਹੋਵੇ ਤਾਂ ਬਦਲੋ, ਫਿਰ ਡਰਾਫਟ ਬਣਾਓ।',
  },
} satisfies Record<string, Record<Lang, string>>;

export function questionFor(field: GrievanceField, issue: GrievanceIssue, language: Lang): string {
  const key = issue === 'other' ? 'payment' : issue;
  return QUESTIONS[field][key][language];
}

/** One-line factual summary, built only from confirmed facts (unknowns are left out). */
export function factSummary(issue: GrievanceIssue, facts: GrievanceFacts, language: Lang, description = ''): string {
  const amount = typeof facts.amount === 'number' ? `₹${facts.amount}` : '';
  const d = getDuration(facts);
  const dur = d ? formatDuration(d, language) : '';
  const platform = facts.platform ? ` (${facts.platform})` : '';
  const short = description.trim().slice(0, 140);

  if (language === 'hi') {
    if (issue === 'payment') return `${amount ? `${amount} ki ` : ''}payment${platform}${dur ? ` ${dur} se` : ''} pending hai.`;
    if (issue === 'deduction') return `${amount ? `${amount} ` : 'Paise '}kaate gaye${platform}${dur ? ` (${dur} pehle)` : ''}.`;
    if (issue === 'account') return `Account${platform} band hai${dur ? ` (${dur} se)` : ''}.`;
    return `Samasya${platform}: ${short}`;
  }
  if (language === 'pa') {
    if (issue === 'payment') return `${amount ? `${amount} ਦੀ ` : ''}ਪੇਮੈਂਟ${platform}${dur ? ` ${dur} ਤੋਂ` : ''} ਬਾਕੀ ਹੈ।`;
    if (issue === 'deduction') return `${amount ? `${amount} ` : 'ਪੈਸੇ '}ਕੱਟੇ ਗਏ${platform}${dur ? ` (${dur} ਪਹਿਲਾਂ)` : ''}।`;
    if (issue === 'account') return `ਖਾਤਾ${platform} ਬੰਦ ਹੈ${dur ? ` (${dur} ਤੋਂ)` : ''}।`;
    return `ਸਮੱਸਿਆ${platform}: ${short}`;
  }
  if (issue === 'payment') return `Payment${amount ? ` of ${amount}` : ''}${platform} pending${dur ? ` for ${dur}` : ''}.`;
  if (issue === 'deduction') return `${amount ? amount : 'Money'} deducted${platform}${dur ? ` (${dur} ago)` : ''}.`;
  if (issue === 'account') return `Account${platform} blocked${dur ? ` for ${dur}` : ''}.`;
  return `Problem${platform}: ${short}`;
}

// ---------------------------------------------------------------------------
// Collect step: decide what to ask next
// ---------------------------------------------------------------------------

export interface CollectInput {
  description: string;
  facts: GrievanceFacts;
  unknown: GrievanceField[];
  answer?: string;
  dontKnow?: boolean;
  asked?: GrievanceField[];
}

export interface GuideResponse {
  type: 'grievance_guide';
  intent: 'grievance';
  stage: 'questions' | 'review';
  issue: GrievanceIssue;
  description: string;
  facts: GrievanceFacts;
  unknown: GrievanceField[];
  questions: Array<{ field: GrievanceField; text: string }>;
  message: string;
  summary: string;
  notUnderstood?: boolean;
}

export function collectGrievanceFacts(input: CollectInput, language: Lang): GuideResponse {
  const issue = detectIssue(input.description);
  let facts = { ...input.facts };
  const unknown = new Set(input.unknown);
  let notUnderstood = false;

  if (input.answer === undefined && !input.dontKnow) {
    // First turn: take what the description already says.
    facts = mergeFacts(facts, parseFacts(input.description, relevantFields(issue)));
    if (!facts.platform) {
      const p = platformFromText(input.description);
      if (p) facts.platform = p;
    }
  } else {
    const asked = (input.asked?.length ? input.asked : missingFields(issue, facts, [...unknown])).filter((f) =>
      relevantFields(issue).includes(f)
    );
    const answer = input.answer ?? '';
    const before = asked.filter((f) => hasField(facts, f)).length;
    facts = mergeFacts(facts, parseFacts(answer, asked));
    if (!facts.platform) {
      const p = platformFromText(answer);
      if (p) facts.platform = p;
    }
    const gotSomething = asked.filter((f) => hasField(facts, f)).length > before;
    if (input.dontKnow || isDontKnow(answer)) {
      for (const f of asked) if (!hasField(facts, f)) unknown.add(f);
    } else if (!gotSomething) {
      notUnderstood = true;
    }
  }

  const unknownList = GRIEVANCE_FIELDS.filter((f) => unknown.has(f) && !hasField(facts, f));
  const missing = missingFields(issue, facts, unknownList);
  const summary = factSummary(issue, facts, language, input.description);
  const questions = missing.map((field) => ({ field, text: questionFor(field, issue, language) }));
  const stage = missing.length ? 'questions' : 'review';
  const lead = stage === 'review' ? GUIDE_TEXT.review[language] : notUnderstood ? GUIDE_TEXT.notUnderstood[language] : GUIDE_TEXT.intro[language];

  return {
    type: 'grievance_guide',
    intent: 'grievance',
    stage,
    issue,
    description: input.description,
    facts,
    unknown: unknownList,
    questions,
    message: [lead, ...questions.map((q) => q.text)].join('\n'),
    summary,
    ...(notUnderstood ? { notUnderstood } : {}),
  };
}

// ---------------------------------------------------------------------------
// Draft step
// ---------------------------------------------------------------------------

/**
 * Deterministic draft built strictly from confirmed facts and the worker's own
 * description. Unknown facts are left out (never "several days"), and no
 * recipient other than a generic support team is named.
 */
export function buildFactOnlyDraft(issue: GrievanceIssue, facts: GrievanceFacts, language: Lang, description = '') {
  const amount = typeof facts.amount === 'number' ? `₹${facts.amount}` : '';
  const d = getDuration(facts);
  const dur = d ? formatDuration(d, language) : '';
  const p = facts.platform ? ` (${facts.platform})` : '';
  const desc = description.replace(/\s+/g, ' ').trim().slice(0, 600);
  let draftMessage: string;

  if (language === 'hi') {
    if (issue === 'deduction') {
      draftMessage = `Namaste Support Team, meri kamai se ${amount ? `${amount} ` : 'paise '}kaate gaye hain${p}. Kripya is katauti ka kaaran batayein aur agar galti se kata hai to wapas karein. Shukriya.`;
    } else if (issue === 'account') {
      draftMessage = `Namaste Support Team, mera account${p}${dur ? ` ${dur} se` : ''} band hai. Kripya iska kaaran batayein aur account dobara chalu karne mein madad karein. Shukriya.`;
    } else if (issue === 'other') {
      draftMessage = `Namaste Support Team, mujhe yeh samasya hai${p}: "${desc}". Kripya ise dekhkar jawab dein. Shukriya.`;
    } else {
      draftMessage = `Namaste Support Team, meri ${amount ? `${amount} ki ` : ''}payment${p}${dur ? ` ${dur} se` : ''} pending hai aur abhi tak account mein credit nahi hui hai. Kripya iska status check karke payment release karein. Shukriya.`;
    }
  } else if (language === 'pa') {
    if (issue === 'deduction') {
      draftMessage = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਪੋਰਟ ਟੀਮ, ਮੇਰੀ ਕਮਾਈ ਵਿੱਚੋਂ ${amount ? `${amount} ` : 'ਪੈਸੇ '}ਕੱਟੇ ਗਏ ਹਨ${p}। ਕਿਰਪਾ ਕਰਕੇ ਇਸ ਕਟੌਤੀ ਦਾ ਕਾਰਨ ਦੱਸੋ ਅਤੇ ਜੇ ਗਲਤੀ ਨਾਲ ਕੱਟੇ ਗਏ ਹਨ ਤਾਂ ਵਾਪਸ ਕਰੋ। ਧੰਨਵਾਦ।`;
    } else if (issue === 'account') {
      draftMessage = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਪੋਰਟ ਟੀਮ, ਮੇਰਾ ਖਾਤਾ${p}${dur ? ` ${dur} ਤੋਂ` : ''} ਬੰਦ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਕਾਰਨ ਦੱਸੋ ਅਤੇ ਖਾਤਾ ਦੁਬਾਰਾ ਚਾਲੂ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰੋ। ਧੰਨਵਾਦ।`;
    } else if (issue === 'other') {
      draftMessage = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਪੋਰਟ ਟੀਮ, ਮੈਨੂੰ ਇਹ ਸਮੱਸਿਆ ਹੈ${p}: "${desc}"। ਕਿਰਪਾ ਕਰਕੇ ਇਸਨੂੰ ਦੇਖ ਕੇ ਜਵਾਬ ਦਿਓ। ਧੰਨਵਾਦ।`;
    } else {
      draftMessage = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਪੋਰਟ ਟੀਮ, ਮੇਰੀ ${amount ? `${amount} ਦੀ ` : ''}ਪੇਮੈਂਟ${p}${dur ? ` ${dur} ਤੋਂ` : ''} ਬਾਕੀ ਹੈ ਅਤੇ ਖਾਤੇ ਵਿੱਚ ਨਹੀਂ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰਕੇ ਪੇਮੈਂਟ ਜਾਰੀ ਕਰੋ। ਧੰਨਵਾਦ।`;
    }
  } else if (issue === 'deduction') {
    draftMessage = `Dear Support Team, ${amount ? amount : 'money'} was deducted from my earnings${p}. Please explain the reason for this deduction and return it if it was made by mistake. Thank you.`;
  } else if (issue === 'account') {
    draftMessage = `Dear Support Team, my account${p} has been blocked${dur ? ` for ${dur}` : ''}. Please tell me the reason and help me restore access. Thank you.`;
  } else if (issue === 'other') {
    draftMessage = `Dear Support Team, I would like to report a problem${p}: "${desc}". Please look into this and reply. Thank you.`;
  } else {
    draftMessage = `Dear Support Team, my payment${amount ? ` of ${amount}` : ''}${p} has been pending${dur ? ` for ${dur}` : ''} and has not yet been credited to my account. Please verify and release the pending payment at the earliest. Thank you.`;
  }

  return { summary: factSummary(issue, facts, language, description), draftMessage };
}

const GrievanceOutputSchema = z.object({
  summary: z.string().trim().max(600).optional(),
  draftMessage: z.string().trim().min(1).max(3000),
  providedFacts: z.object({ platform: z.string().nullish() }).passthrough().nullish(),
});

/** Terms the draft may use only if the worker used them first. */
const GUARDED_TERMS: RegExp[] = [
  // legal claims
  /\b(section|act|ipc|bns|law|legal|court|tribunal|forum)\b|dhara|kanoon|kanun|adalat|धारा|कानून|अदालत|ਧਾਰਾ|ਕਾਨੂੰਨ|ਅਦਾਲਤ/i,
  // entitlements
  /entitle|compensation|\binterest\b|muaavza|muavza|byaj|haqdaar|मुआवज|ब्याज|हकदार|ਮੁਆਵਜ਼|ਵਿਆਜ|ਹੱਕਦਾਰ/i,
  // deadlines and threats
  /\bwithin\b|deadline|ultimatum|otherwise|ke andar|warna|varna|के अंदर|वरना|ਦੇ ਅੰਦਰ|ਨਹੀਂ ਤਾਂ/i,
  // identifiers
  /\b(employee|order|partner|rider|driver|worker)\s*id\b/i,
  // calendar dates
  /\b(january|february|march|april|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
];

/**
 * True when the model draft keeps the confirmed amount/duration and adds
 * nothing the worker did not say: no other numbers (dates, IDs, sections,
 * deadlines), no unmentioned platform, link, phone number, legal claim,
 * entitlement or deadline.
 */
export function isDraftFaithful(
  draft: string,
  facts: GrievanceFacts,
  userText: string,
  modelPlatform?: string | null
): boolean {
  const draftNumbers = numberTokens(draft);
  const d = getDuration(facts);
  const allowed = new Set<string>([...numberTokens(userText)]);
  if (typeof facts.amount === 'number') allowed.add(numberTokens(String(facts.amount))[0]);
  if (d) allowed.add(String(d.value));

  if (typeof facts.amount === 'number' && !draftNumbers.includes(numberTokens(String(facts.amount))[0])) return false;
  if (d && !draftNumbers.includes(String(d.value))) return false;
  if (draftNumbers.some((n) => !allowed.has(n))) return false;

  const context = [userText, facts.platform ?? ''].join('\n');
  if (modelPlatform && !mentionedInMessage(context, modelPlatform)) return false;
  if (KNOWN_PLATFORMS.some((p) => mentionedInMessage(draft, p) && !mentionedInMessage(context, p))) return false;
  if (/https?:\/\/|www\./i.test(draft)) return false;
  if (findUnlistedPhoneNumbers([draft], userText).length > 0) return false;
  if (GUARDED_TERMS.some((re) => re.test(draft) && !re.test(userText))) return false;
  return true;
}

export interface DraftResult {
  summary: string;
  draftMessage: string;
  facts: GrievanceFacts;
  issue: GrievanceIssue;
  /** True when the model was unavailable or its draft was rejected. */
  usedFallback: boolean;
}

/**
 * One bounded Gemini call for the wording; falls back to the fact-only draft on
 * any failure or when the model's draft is not faithful to the confirmed facts.
 */
export async function generateGrievanceDraft(params: {
  description: string;
  facts: GrievanceFacts;
  unknown?: GrievanceField[];
  language: Lang;
  issue?: GrievanceIssue;
}): Promise<DraftResult> {
  const { description, facts, language } = params;
  const issue = params.issue ?? detectIssue(description);
  const fallback = (): DraftResult => ({ ...buildFactOnlyDraft(issue, facts, language, description), facts, issue, usedFallback: true });

  try {
    const ai = getGenAI();
    const modelName = getModelName();
    const response = await generateWithRetry(
      ai,
      {
        model: modelName,
        contents: buildGrievanceContents(description, { ...facts, issue, unknown: params.unknown ?? [] }),
        config: {
          systemInstruction: buildGrievancePrompt(language),
          thinkingConfig: thinkingConfigFor(modelName, 'low'),
          responseMimeType: 'application/json',
        },
      },
      { timeoutMs: TIMEOUTS.synthesis, retries: 1 }
    );

    const output = GrievanceOutputSchema.safeParse(parseModelJson(response.text));
    if (!output.success) return fallback();
    const modelPlatform = typeof output.data.providedFacts?.platform === 'string' ? output.data.providedFacts.platform : null;
    if (!isDraftFaithful(output.data.draftMessage, facts, description, modelPlatform)) return fallback();

    return {
      // The summary shown to the worker is always the deterministic one built from confirmed facts.
      summary: factSummary(issue, facts, language, description),
      draftMessage: output.data.draftMessage,
      facts,
      issue,
      usedFallback: false,
    };
  } catch (err) {
    console.error('[Grievance Draft Error]', (err as Error).message);
    return fallback();
  }
}

/**
 * Chat entry point: uses the classifier's dispute facts only when the numbers
 * really appear in the worker's message, then either asks for missing facts or
 * drafts straight away when nothing relevant is missing.
 */
export async function startGrievanceFromChat(
  message: string,
  language: Lang,
  classified?: { amount?: number; days?: number; platform?: string }
): Promise<GuideResponse | (DraftResult & { type: 'grievance'; intent: 'grievance' })> {
  const inText = new Set(numberTokens(message));
  const fromClassifier: GrievanceFacts = {};
  if (typeof classified?.amount === 'number' && inText.has(numberTokens(String(classified.amount))[0]) && amountValue.safeParse(classified.amount).success) {
    fromClassifier.amount = classified.amount;
  }
  if (typeof classified?.days === 'number' && inText.has(String(classified.days)) && durationValue.safeParse(classified.days).success) {
    fromClassifier.days = classified.days;
  }
  if (classified?.platform && mentionedInMessage(message, classified.platform)) {
    fromClassifier.platform = classified.platform;
  }

  const guide = collectGrievanceFacts({ description: message, facts: fromClassifier, unknown: [] }, language);
  if (guide.stage === 'questions') return guide;

  const draft = await generateGrievanceDraft({ description: message, facts: guide.facts, language, issue: guide.issue });
  return { type: 'grievance', intent: 'grievance', ...draft };
}
