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
import { db } from '../db/index.js';
import {
  rupeesToPaise,
  paiseToRupees,
  calculateDailySummary,
  calculateWeeklySummary,
  getTodayDateString,
  MoneyEntryRecord,
} from '../services/money/calculator.js';

const router = Router();

// Zod schemas
const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().optional(),
  language: z.enum(['hi', 'en', 'pa']).optional(),
});

const ConfirmMoneySchema = z.object({
  earning: z
    .object({
      amount: z.number().positive(),
      source: z.string().optional().nullable(),
      date: z.string().optional(),
    })
    .optional()
    .nullable(),
  expense: z
    .object({
      amount: z.number().positive(),
      category: z.enum(['Fuel', 'Food', 'Maintenance', 'Mobile/data', 'Equipment', 'Other']),
      date: z.string().optional(),
    })
    .optional()
    .nullable(),
});

// Simple rate limiter for AI calls
const lastRequestTime = new Map<string, number>();

function rateLimitAi(sessionId: string): boolean {
  const now = Date.now();
  const last = lastRequestTime.get(sessionId) || 0;
  if (now - last < 100) {
    // 100ms debounce
    return false;
  }
  lastRequestTime.set(sessionId, now);
  return true;
}

router.post('/chat', async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid message', details: parsed.error.errors });
  }

  const { message } = parsed.data;
  const sessionId = req.sessionId;
  const sessionProfile = req.sessionProfile;
  const language = parsed.data.language || sessionProfile?.language || 'hi';
  const workerType = sessionProfile?.workerType || 'delivery';
  const state = sessionProfile?.state || 'Punjab';

  if (!rateLimitAi(sessionId)) {
    return res.status(429).json({ error: 'Please wait a moment before sending another message.' });
  }

  try {
    // 1. Extract intent
    const intentResult = await extractIntent(message, language);

    // 2. Handle 'record_money' intent -> Return confirmation card WITHOUT saving
    if (intentResult.intent === 'record_money' && (intentResult.earning || intentResult.expense)) {
      const confirmation = prepareMoneyConfirmation(intentResult.earning, intentResult.expense);
      return res.json({
        type: 'confirmation',
        intent: 'record_money',
        message: language === 'hi' 
          ? 'Kya yeh aaj ke hisab mein add karein?' 
          : language === 'pa' 
          ? 'ਕੀ ਇਹ ਅੱਜ ਦੇ ਹਿਸਾਬ ਵਿੱਚ ਜੋੜਨਾ ਹੈ?' 
          : 'Add to today\'s money?',
        confirmation,
        rawIntent: intentResult,
      });
    }

    // 3. Handle 'ask_money' intent -> Strict deterministic calculation from DB
    if (intentResult.intent === 'ask_money') {
      const moneyAnswer = answerMoneyQuestion(sessionId, language);
      return res.json({
        type: 'answer',
        intent: 'ask_money',
        directAnswer: moneyAnswer.directAnswer,
        steps: moneyAnswer.steps,
        breakdown: moneyAnswer.breakdown,
      });
    }

    // 4. Handle 'grievance' intent -> Fact extraction + editable draft strictly using user facts
    if (intentResult.intent === 'grievance') {
      const draftResult = await generateGrievanceDraft(message, language, intentResult.dispute);
      return res.json({
        type: 'grievance',
        intent: 'grievance',
        ...draftResult,
      });
    }

    // 5. Handle 'scheme' or 'rights' -> Google Search Grounding with official government source filtering
    if (intentResult.intent === 'scheme' || intentResult.intent === 'rights') {
      const groundedResult = await generateGroundedAnswer({
        query: message,
        language,
        workerType,
        state,
        topic: intentResult.intent,
      });
      return res.json({
        type: 'answer',
        intent: intentResult.intent,
        ...groundedResult,
      });
    }

    // 6. Handle 'safety' or 'general' -> Practical, non-diagnostic guidance
    const generalResult = await generateConversationalGuidance({
      query: message,
      language,
      workerType,
      state,
      isSafety: intentResult.intent === 'safety',
    });

    return res.json({
      type: 'answer',
      intent: intentResult.intent,
      ...generalResult,
    });
  } catch (err: any) {
    console.error('[AI Chat Error]', err.message || err);
    return res.status(500).json({
      error: 'AI service temporarily unavailable. Please try again shortly.',
      fallbackAdvice: language === 'hi' 
        ? 'Network issue ki wajah se AI abhi connect nahi ho paya. Kripya thodi der baad koshish karein.' 
        : 'Could not connect to AI service. Please try again shortly.',
    });
  }
});

// POST /api/ai/confirm-money - Saves confirmed transactions into database
router.post('/confirm-money', (req, res) => {
  const parsed = ConfirmMoneySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid confirmation payload', details: parsed.error.errors });
  }

  const sessionId = req.sessionId;
  const today = getTodayDateString();
  const now = Date.now();
  const savedEntries = [];

  const { earning, expense } = parsed.data;

  if (earning && earning.amount > 0) {
    const amountPaise = rupeesToPaise(earning.amount);
    const id = 'entry_' + crypto.randomUUID();
    const source = earning.source || 'Earning';
    db.prepare(`
      INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
      VALUES (?, ?, 'earning', ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, amountPaise, source, null, earning.date || today, now, now);

    savedEntries.push({ id, type: 'earning', amountRupees: earning.amount, source });
  }

  if (expense && expense.amount > 0) {
    const amountPaise = rupeesToPaise(expense.amount);
    const id = 'entry_' + crypto.randomUUID();
    const category = expense.category || 'Other';
    db.prepare(`
      INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
      VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, amountPaise, category, null, expense.date || today, now, now);

    savedEntries.push({ id, type: 'expense', amountRupees: expense.amount, category });
  }

  // Calculate updated summary
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
    message: req.sessionProfile?.language === 'hi' 
      ? 'Paisa jud gaya!' 
      : req.sessionProfile?.language === 'pa' 
      ? 'ਪੈਸਾ ਦਰਜ ਹੋ ਗਿਆ!' 
      : 'Saved to today\'s money!',
  });
});

/**
 * Generates grounded answers for government schemes and rights
 */
async function generateGroundedAnswer(params: {
  query: string;
  language: string;
  workerType: string;
  state: string;
  topic: 'scheme' | 'rights';
}) {
  const { query, language, workerType, state } = params;
  const systemInstruction = `
You are KaamPe, an assistant for informal workers in India.
User profile:
- Worker Type: ${workerType}
- State: ${state}
- Language: ${language}

Rules:
1. Provide short sentences, practical information, no legal jargon.
2. For government schemes or legal rights, never say "You are definitely eligible" unless 100% verified. Use "Aapke diye gaye information ke hisaab se yeh scheme relevant ho sakti hai."
3. If reliable official evidence is missing, state honestly:
   "Mujhe abhi iska reliable official source nahi mila. Main guess nahi karunga."
4. Reply with ONLY a JSON object (no prose before or after):
   {
     "directAnswer": "1-3 concise sentences",
     "steps": ["step 1", "step 2", "step 3"],
     "eligibilityState": "Likely relevant" | "Possibly relevant" | "Need more information" | "Unable to verify"
   }
Base the answer on official government sources (e.g. .gov.in, .nic.in) found via search. Do not write URLs; sources are attached separately.
`;

  try {
    const ai = getGenAI();
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    // Attempt with Google Search grounding
    const response = await ai.models.generateContent({
      model: modelName,
      contents: query,
      config: {
        systemInstruction,
        // Medium thinking for scheme/rights synthesis
        thinkingConfig: {
          thinkingBudget: 1,
        },
        // No responseMimeType: JSON mode is not guaranteed to combine with the search tool,
        // so the JSON is parsed from text instead.
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

    const parsed = parseModelJson(response.text);

    // Source links come only from grounding metadata, never from model-written text.
    // Grounding URIs are Google redirect links, so trust is decided on the reported source domain.
    const sources: Array<{ title: string; url: string }> = [];
    const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    for (const chunk of chunks) {
      const web = chunk?.web;
      if (!web?.uri) continue;
      const domain = String(web.domain || web.title || '').trim();
      const trusted = isTrustedGovernmentDomain(web.uri) || isTrustedGovernmentDomain(`https://${domain}`);
      if (trusted && !sources.some((s) => s.url === web.uri)) {
        sources.push({ title: web.title || domain, url: web.uri });
      }
    }

    const ALLOWED_STATES = ['Likely relevant', 'Possibly relevant', 'Need more information', "Doesn't appear relevant", 'Unable to verify'];
    if (sources.length === 0 || typeof parsed.directAnswer !== 'string' || !parsed.directAnswer.trim()) {
      return getUnverifiedAnswer(language, state);
    }

    return {
      directAnswer: parsed.directAnswer,
      steps: Array.isArray(parsed.steps) ? parsed.steps.filter((s: unknown) => typeof s === 'string').slice(0, 4) : [],
      sources,
      eligibilityState: ALLOWED_STATES.includes(parsed.eligibilityState) ? parsed.eligibilityState : 'Need more information',
    };
  } catch (err) {
    console.error('[Grounded Answer Error]', (err as Error).message);
    return getUnverifiedAnswer(language, state);
  }
}

/**
 * Honest response when no trusted official evidence was found. Links are from the
 * application-controlled registry (where to check), not presented as evidence for a claim.
 */
function getUnverifiedAnswer(language: string, state: string) {
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
      steps: ['ਹੇਠਾਂ ਦਿੱਤੇ ਸਰਕਾਰੀ ਪੋਰਟਲ \'ਤੇ ਖੁਦ ਜਾਣਕਾਰੀ ਦੇਖੋ।', 'ਨੇੜਲੇ ਸੇਵਾ ਕੇਂਦਰ \'ਤੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।'],
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

/**
 * Generates practical conversational guidance for safety and general questions
 */
async function generateConversationalGuidance(params: {
  query: string;
  language: string;
  workerType: string;
  state: string;
  isSafety: boolean;
}) {
  const { query, language, workerType, isSafety } = params;
  const systemInstruction = `
You are KaamPe, an empathetic, highly practical AI assistant for informal workers in India.
Worker type: ${workerType}
Language: ${language}
Topic is safety: ${isSafety}

Rules:
1. Respond in ${language === 'hi' ? 'simple Hindi (Hinglish/Devanagari)' : language === 'pa' ? 'Punjabi' : 'clear, simple English'}.
2. Keep it short, practical, and empathetic. No technical jargon.
3. If it's a safety question, give practical actionable tips (hydration, reflective gear, helmet, reporting to supervisor).
   NEVER diagnose medical conditions. Do not fabricate emergency phone numbers.
4. Output strict JSON:
   {
     "directAnswer": "1-3 short practical sentences",
     "steps": ["tip 1", "tip 2", "tip 3"]
   }
`;

  try {
    const ai = getGenAI();
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: query,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseModelJson(response.text);
    return {
      directAnswer: parsed.directAnswer || 'Aapki safety aur kaam hamari pehli priority hai.',
      steps: parsed.steps || ['Dhyan se kaam karein aur safety guidelines follow karein.'],
    };
  } catch (err) {
    if (isSafety) {
      return {
        directAnswer: language === 'hi' 
          ? 'Garmi ya mushkil mausam mein kaam karte waqt paani peete rahein aur zaruri safety gear pehnein.'
          : 'Stay hydrated, take short shade breaks, and ensure you wear safety gear properly.',
        steps: [
          'Paani aur ORS/nimbu paani saath rakhein.',
          'Har 1-2 ghante mein 5 minute chhaon mein aaram karein.',
          'Agar chakkar aaye to turant kaam rok kar saathi worker ya helpline par sampark karein.',
        ],
      };
    }
    return {
      directAnswer: language === 'hi' ? 'Namaste! Kaam ya paise se juda koi bhi sawaal poochhein.' : 'Hello! Ask any question about work or earnings.',
      steps: ['Apni aaj ki kamai add karein.', 'Payment dispute ya document samajhne ke liye Help tab dekhein.'],
    };
  }
}

/**
 * Generates an editable grievance draft strictly using user-supplied facts
 */
async function generateGrievanceDraft(
  message: string,
  language: string,
  extractedFacts?: { amount?: number; days?: number; platform?: string }
) {
  // The platform is kept only if the user actually wrote it; the classifier may guess one.
  const facts = {
    amount: extractedFacts?.amount,
    days: extractedFacts?.days,
    platform: extractedFacts?.platform && mentionedInMessage(message, extractedFacts.platform) ? extractedFacts.platform : undefined,
  };
  const systemInstruction = `
You are a grievance message assistant for KaamPe.
Task: Create a polite, firm dispute message for a worker.

STRICT RULES:
1. Use ONLY facts explicitly provided by user.
2. NEVER invent dates, company names, employee IDs, incident details, threats, or fake legal sections.
3. If an amount or days are provided, keep them exact.
4. Output strict JSON:
   {
     "summary": "Short factual summary of the issue",
     "draftMessage": "The polite and firm grievance message text ready to copy or edit",
     "providedFacts": {
       "amount": number or null,
       "days": number or null,
       "platform": string or null
     }
   }
`;

  try {
    const ai = getGenAI();
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `User message: "${message}". Extracted: ${JSON.stringify(facts)}. Language: ${language}`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 1 }, // Medium thinking for grievance drafting
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseModelJson(response.text);
    const draftMessage = typeof parsed.draftMessage === 'string' ? parsed.draftMessage.trim() : '';
    const modelPlatform = typeof parsed.providedFacts?.platform === 'string' ? parsed.providedFacts.platform : null;
    const amount = facts.amount;
    const days = facts.days;

    // Reject drafts that drop the user's amount/days or name a platform the user never mentioned.
    const keepsAmount = !amount || draftMessage.replace(/,/g, '').includes(String(amount));
    const keepsDays = !days || draftMessage.includes(String(days));
    const inventsPlatform = !!modelPlatform && !mentionedInMessage(message, modelPlatform);
    if (!draftMessage || !keepsAmount || !keepsDays || inventsPlatform) {
      return buildFactOnlyDraft(language, facts);
    }

    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary : buildFactOnlyDraft(language, facts).summary,
      draftMessage,
      facts,
    };
  } catch (err) {
    console.error('[Grievance Draft Error]', (err as Error).message);
    return buildFactOnlyDraft(language, facts);
  }
}

function mentionedInMessage(message: string, value: string): boolean {
  return message.toLowerCase().includes(value.trim().toLowerCase());
}

/**
 * Deterministic grievance draft built strictly from user-supplied facts.
 * Never names a platform, person, or employer.
 */
function buildFactOnlyDraft(language: string, facts: { amount?: number; days?: number; platform?: string }) {
  const { amount, days } = facts;
  if (language === 'hi') {
    const amountStr = amount ? `₹${amount}` : 'baaki';
    const daysStr = days ? `${days} din` : 'kuch din';
    return {
      summary: `${amountStr} ki payment ${daysStr} se pending hai.`,
      draftMessage: `Namaste Support Team, meri ${amountStr} ki payment ${daysStr} se pending hai aur abhi tak account mein credit nahi hui hai. Kripya iska status check karke payment release karein. Shukriya.`,
      facts,
    };
  }
  if (language === 'pa') {
    const amountStr = amount ? `₹${amount}` : 'ਬਕਾਇਆ';
    const daysStr = days ? `${days} ਦਿਨਾਂ` : 'ਕੁਝ ਦਿਨਾਂ';
    return {
      summary: `${amountStr} ਦੀ ਪੇਮੈਂਟ ${daysStr} ਤੋਂ ਪੈਂਡਿੰਗ ਹੈ।`,
      draftMessage: `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਸਪੋਰਟ ਟੀਮ, ਮੇਰੀ ${amountStr} ਦੀ ਪੇਮੈਂਟ ${daysStr} ਤੋਂ ਪੈਂਡਿੰਗ ਹੈ ਅਤੇ ਖਾਤੇ ਵਿੱਚ ਨਹੀਂ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਇਸਨੂੰ ਜਲਦੀ ਰਿਲੀਜ਼ ਕੀਤਾ ਜਾਵੇ। ਧੰਨਵਾਦ।`,
      facts,
    };
  }
  const amountStr = amount ? `₹${amount}` : 'the pending amount';
  const daysStr = days ? `${days} days` : 'several days';
  return {
    summary: `Payment of ${amountStr} pending for ${daysStr}.`,
    draftMessage: `Dear Support Team, my payment of ${amountStr} has been pending for ${daysStr} and has not yet been credited to my account. Please verify and release the pending payment at the earliest. Thank you.`,
    facts,
  };
}

export default router;
