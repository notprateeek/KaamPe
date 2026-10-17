import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  calculateDailySummary,
  calculateWeeklySummary,
  getTodayDateString,
  MoneyEntryRecord,
} from '../money/calculator.js';
import { db } from '../../db/index.js';
import { buildIntentPrompt, wrapUserInput } from './prompts.js';
import { generateWithRetry, getModelName, thinkingConfigFor, TIMEOUTS } from './client.js';

let genAIClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please provide a valid Gemini API key.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

export const IntentSchema = z.object({
  intent: z.enum([
    'record_money',
    'ask_money',
    'rights',
    'scheme',
    'safety',
    'grievance',
    'general',
  ]),
  earning: z
    .object({
      amount: z.number().positive(),
      source: z.string().optional(),
    })
    .optional(),
  expense: z
    .object({
      amount: z.number().positive(),
      category: z.enum(['Fuel', 'Food', 'Maintenance', 'Mobile/data', 'Equipment', 'Other']).optional(),
    })
    .optional(),
  language: z.enum(['hi', 'en', 'pa']).optional(),
  dispute: z
    .object({
      amount: z.number().optional(),
      days: z.number().optional(),
      platform: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export type ExtractedIntent = z.infer<typeof IntentSchema>;

/**
 * Pre-approved official source domains for rights & welfare schemes. A URL is
 * trusted when its hostname equals an entry or is a subdomain of it (dot
 * boundary). `gov.in` and `nic.in` are kept as suffixes on purpose: in India
 * these zones are restricted to government bodies (registered via NIC), so
 * every *.gov.in / *.nic.in host is genuinely official. The remaining entries
 * are official scheme portals hosted outside those zones.
 */
export const TRUSTED_OFFICIAL_DOMAINS = [
  'gov.in',
  'nic.in',
  'eshram.gov.in',
  'labour.gov.in',
  'india.gov.in',
  'myscheme.gov.in',
  'jansuraksha.gov.in',
  'pmjay.gov.in',
  'pmsvanidhi.mohua.gov.in',
  'bocw.punjab.gov.in',
  'pblabour.gov.in',
  'punjab.gov.in',
  'maandhan.in', // PM-SYM portal (Ministry of Labour & Employment)
  'pfrda.org.in', // Pension regulator (Atal Pension Yojana)
  'npscra.nsdl.co.in', // APY / NPS central record-keeping agency
];

/**
 * Parses JSON returned by the model, tolerating a surrounding ```json fence
 * when a grounded call uses text output instead of JSON mode.
 */
export function parseModelJson(text: string | undefined): any {
  const trimmed = (text || '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

/**
 * Checks if a URL belongs to a trusted government domain
 */
export function isTrustedGovernmentDomain(url: string): boolean {
  if (typeof url !== 'string' || url.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  // https only; no credentials (blocks "https://eshram.gov.in@evil.com"); default port only.
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return false;
  // WHATWG URL already lower-cases and punycodes the host; drop a trailing root dot.
  const hostname = parsed.hostname.replace(/\.$/, '');
  if (!hostname || hostname.startsWith('[')) return false;
  return TRUSTED_OFFICIAL_DOMAINS.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
}

/**
 * Extracts structured intent from user message using Gemini with strict schema
 */
export async function extractIntent(
  userMessage: string,
  userLanguage: string = 'hi'
): Promise<ExtractedIntent> {
  const systemInstruction = buildIntentPrompt();

  try {
    const ai = getGenAI();
    const modelName = getModelName();
    // Classification must be fast: short timeout, no retry, regex fallback on any failure.
    const response = await generateWithRetry(ai, {
      model: modelName,
      contents: wrapUserInput(userMessage),
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              enum: ['record_money', 'ask_money', 'rights', 'scheme', 'safety', 'grievance', 'general'],
            },
            earning: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                source: { type: 'string' },
              },
            },
            expense: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                category: {
                  type: 'string',
                  enum: ['Fuel', 'Food', 'Maintenance', 'Mobile/data', 'Equipment', 'Other'],
                },
              },
            },
            dispute: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                days: { type: 'number' },
                platform: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          required: ['intent'],
        },
        // Minimal thinking for intent classification
        thinkingConfig: thinkingConfigFor(modelName, 'minimal'),
      },
    }, { timeoutMs: TIMEOUTS.classify, retries: 0 });

    const text = response.text || '{}';
    const json = JSON.parse(text);
    return IntentSchema.parse(json);
  } catch (err) {
    // If model fails or JSON parsing fails, fall back to safe regex-based intent classification
    return fallbackIntentExtraction(userMessage);
  }
}

/**
 * Fallback intent extraction if Gemini structured schema fails
 */
export function fallbackIntentExtraction(text: string): ExtractedIntent {
  const lower = text.toLowerCase();

  // Check for money recording with flexible wording (e.g. "500 aur kamaye", "Swiggy se 850 kamaye", "petrol mein 200 gaye")
  const earningMatch =
    text.match(/(\d+)[^\d\n]{0,25}(?:kamaye|earned|earning|mila|mile|aaye|mil gya)/i) ||
    text.match(/(?:kamaye|earned|earning|mila|mile|aaye|mil gya)[^\d\n]{0,25}(\d+)/i);

  const expenseMatch =
    text.match(/(\d+)[^\d\n]{0,25}(?:kharcha|kharch|gaye|petrol|fuel|food|khana|spent)/i) ||
    text.match(/(?:kharcha|kharch|gaye|petrol|fuel|food|khana|spent)[^\d\n]{0,25}(\d+)/i);

  if (earningMatch || expenseMatch) {
    const earningAmount = earningMatch ? Number(earningMatch[1]) : undefined;
    const expenseAmount = expenseMatch ? Number(expenseMatch[1]) : undefined;

    let source = undefined;
    if (/swiggy/i.test(text)) source = 'Swiggy';
    else if (/zomato/i.test(text)) source = 'Zomato';
    else if (/uber/i.test(text)) source = 'Uber';
    else if (/ola/i.test(text)) source = 'Ola';
    else if (/porter/i.test(text)) source = 'Porter';
    else if (earningAmount) source = 'Earning';

    let category: any = 'Other';
    if (/petrol|fuel|diesel/i.test(text)) category = 'Fuel';
    else if (/food|khana|chai/i.test(text)) category = 'Food';
    else if (/recharge|data|mobile/i.test(text)) category = 'Mobile/data';
    else if (/repair|maintenance|puncture/i.test(text)) category = 'Maintenance';

    return {
      intent: 'record_money',
      earning: earningAmount ? { amount: earningAmount, source } : undefined,
      expense: expenseAmount ? { amount: expenseAmount, category } : undefined,
    };
  }

  // Ask money
  if (/(?:kitna|balance|bacha|bache|hisab|earning kitni|kharcha kitna)/i.test(lower)) {
    return { intent: 'ask_money' };
  }

  // Grievance / dispute
  if (/(?:payment.*(?:pending|nhi|nahi|stuck|fasi)|dispute|paise nahi mile)/i.test(lower)) {
    const amountMatch = text.match(/₹?\s*(\d+)/);
    const daysMatch = text.match(/(\d+)\s*(?:din|days)/i);
    return {
      intent: 'grievance',
      dispute: {
        amount: amountMatch ? Number(amountMatch[1]) : undefined,
        days: daysMatch ? Number(daysMatch[1]) : undefined,
      },
    };
  }

  // Scheme
  if (/(?:scheme|yojana|sarkari|bocw|e-shram|eshram|pension|welfare)/i.test(lower)) {
    return { intent: 'scheme' };
  }

  // Safety (heat, accidents, harassment, fraud / OTP scams, emergencies)
  if (/(?:safety|helmet|garmi|dhoop|rain|accident|precautions|night delivery|\botp\b|fraud|scam|dhokha|thagi|harass|emergency|ambulance|police|chot|injur|ਗਰਮੀ|ਹਾਦਸਾ|ਧੋਖਾ|गर्मी|हादसा|धोखा)/i.test(lower)) {
    return { intent: 'safety' };
  }

  // Rights
  if (/(?:rights|adhikar|minimum wage|nirdharit|overtime|shramik)/i.test(lower)) {
    return { intent: 'rights' };
  }

  return { intent: 'general' };
}

/**
 * Prepares a money confirmation object without saving anything to the database
 */
export function prepareMoneyConfirmation(earning?: { amount: number; source?: string }, expense?: { amount: number; category?: string }) {
  const earningRupees = earning?.amount || 0;
  const expenseRupees = expense?.amount || 0;

  const earningPaise = rupeesToPaise(earningRupees);
  const expensePaise = rupeesToPaise(expenseRupees);
  const netPaise = earningPaise - expensePaise;
  const netRupees = paiseToRupees(netPaise);

  return {
    ready: true,
    earning: earningRupees > 0 ? {
      amountRupees: earningRupees,
      amountPaise: earningPaise,
      source: earning?.source || 'Earning',
    } : null,
    expense: expenseRupees > 0 ? {
      amountRupees: expenseRupees,
      amountPaise: expensePaise,
      category: expense?.category || 'Other',
    } : null,
    netRupees,
    netPaise,
    formattedEarning: earningRupees > 0 ? `+ ₹${earningRupees.toLocaleString('en-IN')}` : null,
    formattedExpense: expenseRupees > 0 ? `- ₹${expenseRupees.toLocaleString('en-IN')}` : null,
    formattedNet: formatRupees(netRupees, true),
  };
}

/**
 * Answers questions about the user's actual money totals using database facts
 */
export function answerMoneyQuestion(sessionId: string, language: 'hi' | 'en' | 'pa' = 'hi'): {
  directAnswer: string;
  steps: string[];
  breakdown: {
    earnedRupees: number;
    spentRupees: number;
    netRupees: number;
  };
} {
  const today = getTodayDateString();
  const rows = db.prepare('SELECT * FROM money_entries WHERE session_id = ?').all(sessionId) as any[];
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

  const summary = calculateDailySummary(entries, today);

  if (summary.entryCount === 0) {
    if (language === 'hi') {
      return {
        directAnswer: 'Aaj abhi tak koi kamai ya kharcha add nahi hua hai.',
        steps: ['"Add earning" button se aaj ki kamai add karein.', 'Ya chat mein likhein: "Aaj 800 kamaye"'],
        breakdown: { earnedRupees: 0, spentRupees: 0, netRupees: 0 },
      };
    } else if (language === 'pa') {
      return {
        directAnswer: 'ਅੱਜ ਅਜੇ ਤੱਕ ਕੋਈ ਕਮਾਈ ਜਾਂ ਖਰਚਾ ਦਰਜ ਨਹੀਂ ਹੋਇਆ ਹੈ।',
        steps: ['"ਕਮਾਈ ਜੋੜੋ" ਬਟਨ ਨਾਲ ਅੱਜ ਦੀ ਕਮਾਈ ਜੋੜੋ।', 'ਜਾਂ ਇੱਥੇ ਲਿਖੋ: "ਅੱਜ 800 ਕਮਾਏ"'],
        breakdown: { earnedRupees: 0, spentRupees: 0, netRupees: 0 },
      };
    } else {
      return {
        directAnswer: 'No earnings or expenses recorded for today yet.',
        steps: ['Tap "Add earning" to record today\'s work.', 'Or type: "Earned 800 from Swiggy today"'],
        breakdown: { earnedRupees: 0, spentRupees: 0, netRupees: 0 },
      };
    }
  }

  const netFormatted = formatRupees(summary.netRupees);
  const earnedFormatted = formatRupees(summary.earningsRupees);
  const spentFormatted = formatRupees(summary.expensesRupees);

  let directAnswer = '';
  let steps: string[] = [];

  if (language === 'hi') {
    directAnswer = `Aaj aapki kul kamai ${earnedFormatted} hui aur ${spentFormatted} kharcha hua. Aapke paas kul ${netFormatted} bacha hai.`;
    steps = [
      'Naya kharcha ya kamai seedhe chat mein bata sakte hain.',
      'Money tab mein jakar poore hafte ka hisab dekh sakte hain.',
    ];
  } else if (language === 'pa') {
    directAnswer = `ਅੱਜ ਤੁਹਾਡੀ ਕੁੱਲ ਕਮਾਈ ${earnedFormatted} ਹੋਈ ਅਤੇ ${spentFormatted} ਖਰਚਾ ਹੋਇਆ। ਤੁਹਾਡੇ ਕੋਲ ਬਾਕੀ ${netFormatted} ਬਚਿਆ ਹੈ।`;
    steps = [
      'ਨਵਾਂ ਖਰਚਾ ਜਾਂ ਕਮਾਈ ਸਿੱਧਾ ਚੈਟ ਵਿੱਚ ਦੱਸ ਸਕਦੇ ਹੋ।',
      'Money ਟੈਬ ਵਿੱਚ ਜਾ ਕੇ ਪੂਰੇ ਹਫ਼ਤੇ ਦਾ ਹਿਸਾਬ ਦੇਖ ਸਕਦੇ ਹੋ।',
    ];
  } else {
    directAnswer = `Today you earned ${earnedFormatted} and spent ${spentFormatted}. Your net balance is ${netFormatted}.`;
    steps = [
      'You can record more transactions by messaging here.',
      'Check the Money tab for weekly totals and full history.',
    ];
  }

  return {
    directAnswer,
    steps,
    breakdown: {
      earnedRupees: summary.earningsRupees,
      spentRupees: summary.expensesRupees,
      netRupees: summary.netRupees,
    },
  };
}
