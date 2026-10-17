import { SCHEMES, SCHEME_HELPLINE, type Scheme, type SchemeLanguage, type Localized } from '../../../shared/schemes.js';
import { formatRupees, paiseToRupees } from '../money/calculator.js';

/**
 * Deterministic, explainable scheme pre-check.
 *
 * Semantics: a criterion only excludes a scheme when the user gave a value
 * that definitely fails it. Anything unknown never excludes; it becomes a
 * "needs check" item instead. No LLM is involved.
 */

export type TriState = 'yes' | 'no' | 'unknown';

export interface SchemeProfile {
  age?: number;
  /** Monthly income in integer paise. */
  monthlyIncomePaise?: number;
  workerType?: string;
  state?: string;
  hasEpfo?: TriState;
  hasEsic?: TriState;
  isIncomeTaxPayer?: TriState;
}

export type Reason =
  | { code: 'age_ok'; age: number; min?: number; max?: number }
  | { code: 'income_ok'; maxPaise: number }
  | { code: 'not_epfo' }
  | { code: 'not_esic' }
  | { code: 'not_taxpayer' }
  | { code: 'worker_type_ok' }
  | { code: 'state_ok' }
  | { code: 'open_to_all' };

export type Check =
  | { code: 'age'; min?: number; max?: number }
  | { code: 'income'; maxPaise: number }
  | { code: 'epfo' }
  | { code: 'esic' }
  | { code: 'taxpayer' }
  | { code: 'worker_type'; label?: Localized }
  | { code: 'state'; states: string[] }
  | { code: 'extra'; text: Localized };

export interface SchemeMatch {
  scheme: Scheme;
  reasons: Reason[];
  needsCheck: Check[];
}

/** Worker types that carry no information for scheme rules. */
const UNKNOWN_WORKER_TYPES = new Set(['', 'other', 'unknown']);

function normalize(value: string | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function stateMatches(userState: string, states: string[]): boolean {
  return states.some((s) => userState === s || userState.includes(s));
}

export function evaluateScheme(scheme: Scheme, profile: SchemeProfile): SchemeMatch | null {
  const rules = scheme.eligibility;
  const reasons: Reason[] = [];
  const needsCheck: Check[] = [];

  // Age
  if (rules.minAge !== undefined || rules.maxAge !== undefined) {
    const age = profile.age;
    if (typeof age === 'number' && Number.isFinite(age)) {
      if ((rules.minAge !== undefined && age < rules.minAge) || (rules.maxAge !== undefined && age > rules.maxAge)) return null;
      reasons.push({ code: 'age_ok', age, min: rules.minAge, max: rules.maxAge });
    } else {
      needsCheck.push({ code: 'age', min: rules.minAge, max: rules.maxAge });
    }
  }

  // Income (integer paise comparison only)
  if (rules.maxMonthlyIncomePaise !== undefined) {
    const income = profile.monthlyIncomePaise;
    if (typeof income === 'number' && Number.isInteger(income)) {
      if (income > rules.maxMonthlyIncomePaise) return null;
      reasons.push({ code: 'income_ok', maxPaise: rules.maxMonthlyIncomePaise });
    } else {
      needsCheck.push({ code: 'income', maxPaise: rules.maxMonthlyIncomePaise });
    }
  }

  // Exclusions by existing coverage / tax status
  const triRules: Array<[boolean | undefined, TriState | undefined, Reason, Check]> = [
    [rules.excludesEpfo, profile.hasEpfo, { code: 'not_epfo' }, { code: 'epfo' }],
    [rules.excludesEsic, profile.hasEsic, { code: 'not_esic' }, { code: 'esic' }],
    [rules.excludesIncomeTaxPayer, profile.isIncomeTaxPayer, { code: 'not_taxpayer' }, { code: 'taxpayer' }],
  ];
  for (const [excludes, value, reason, check] of triRules) {
    if (!excludes) continue;
    if (value === 'yes') return null;
    if (value === 'no') reasons.push(reason);
    else needsCheck.push(check);
  }

  // Worker type
  if (rules.workerTypes?.length) {
    const workerType = normalize(profile.workerType);
    if (UNKNOWN_WORKER_TYPES.has(workerType)) {
      needsCheck.push({ code: 'worker_type', label: rules.workerTypeLabel });
    } else if ((rules.workerTypes as string[]).includes(workerType)) {
      reasons.push({ code: 'worker_type_ok' });
    } else {
      return null;
    }
  }

  // State
  if (rules.states?.length) {
    const state = normalize(profile.state);
    if (!state) needsCheck.push({ code: 'state', states: rules.states });
    else if (stateMatches(state, rules.states)) reasons.push({ code: 'state_ok' });
    else return null;
  }

  for (const text of scheme.extraChecks ?? []) needsCheck.push({ code: 'extra', text });
  if (reasons.length === 0) reasons.push({ code: 'open_to_all' });

  return { scheme, reasons, needsCheck };
}

/**
 * Returns the schemes that are not ruled out by the profile. Schemes with
 * more confirmed criteria (fewer open checks) come first; ties keep the
 * curated order.
 */
export function matchSchemes(profile: SchemeProfile, schemes: readonly Scheme[] = SCHEMES): SchemeMatch[] {
  return schemes
    .map((scheme, index) => ({ match: evaluateScheme(scheme, profile), index }))
    .filter((x): x is { match: SchemeMatch; index: number } => x.match !== null)
    .sort((a, b) => {
      const openA = a.match.needsCheck.filter((c) => c.code !== 'extra').length;
      const openB = b.match.needsCheck.filter((c) => c.code !== 'extra').length;
      return openA - openB || a.index - b.index;
    })
    .map((x) => x.match);
}

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

function rupees(paise: number): string {
  return formatRupees(paiseToRupees(paise));
}

function ageRange(lang: SchemeLanguage, min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) {
    return lang === 'hi' ? `${min} se ${max} saal` : lang === 'pa' ? `${min} ਤੋਂ ${max} ਸਾਲ` : `${min} to ${max} years`;
  }
  if (min !== undefined) return lang === 'hi' ? `${min} saal ya zyada` : lang === 'pa' ? `${min} ਸਾਲ ਜਾਂ ਵੱਧ` : `${min} years or older`;
  return lang === 'hi' ? `${max} saal tak` : lang === 'pa' ? `${max} ਸਾਲ ਤੱਕ` : `up to ${max} years`;
}

function titleCase(s: string): string {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function localizeReason(reason: Reason, lang: SchemeLanguage): string {
  switch (reason.code) {
    case 'age_ok': {
      const range = ageRange(lang, reason.min, reason.max);
      return lang === 'hi'
        ? `Aapki umar (${reason.age}) ${range} ki seema mein hai.`
        : lang === 'pa'
        ? `ਤੁਹਾਡੀ ਉਮਰ (${reason.age}) ${range} ਦੀ ਹੱਦ ਵਿੱਚ ਹੈ।`
        : `Your age (${reason.age}) is within ${range}.`;
    }
    case 'income_ok': {
      const max = rupees(reason.maxPaise);
      return lang === 'hi'
        ? `Aapki mahine ki kamai ${max} ya kam hai.`
        : lang === 'pa'
        ? `ਤੁਹਾਡੀ ਮਹੀਨੇ ਦੀ ਕਮਾਈ ${max} ਜਾਂ ਘੱਟ ਹੈ।`
        : `Your monthly income is ${max} or less.`;
    }
    case 'not_epfo':
      return lang === 'hi' ? 'Aap EPFO (PF) ke member nahi hain.' : lang === 'pa' ? 'ਤੁਸੀਂ EPFO (PF) ਦੇ ਮੈਂਬਰ ਨਹੀਂ ਹੋ।' : 'You are not an EPFO (PF) member.';
    case 'not_esic':
      return lang === 'hi' ? 'Aap ESIC ke member nahi hain.' : lang === 'pa' ? 'ਤੁਸੀਂ ESIC ਦੇ ਮੈਂਬਰ ਨਹੀਂ ਹੋ।' : 'You are not an ESIC member.';
    case 'not_taxpayer':
      return lang === 'hi' ? 'Aap income tax nahi bharte.' : lang === 'pa' ? 'ਤੁਸੀਂ ਇਨਕਮ ਟੈਕਸ ਨਹੀਂ ਭਰਦੇ।' : 'You do not pay income tax.';
    case 'worker_type_ok':
      return lang === 'hi' ? 'Yeh yojana aapke kaam ke liye hai.' : lang === 'pa' ? 'ਇਹ ਸਕੀਮ ਤੁਹਾਡੇ ਕੰਮ ਲਈ ਹੈ।' : 'This scheme covers your type of work.';
    case 'state_ok':
      return lang === 'hi' ? 'Yeh yojana aapke rajya mein hai.' : lang === 'pa' ? 'ਇਹ ਸਕੀਮ ਤੁਹਾਡੇ ਸੂਬੇ ਵਿੱਚ ਹੈ।' : 'This scheme is available in your state.';
    case 'open_to_all':
      return lang === 'hi'
        ? 'Iske liye umar ya kaam ki koi khaas shart nahi hai.'
        : lang === 'pa'
        ? 'ਇਸ ਲਈ ਉਮਰ ਜਾਂ ਕੰਮ ਦੀ ਕੋਈ ਖ਼ਾਸ ਸ਼ਰਤ ਨਹੀਂ ਹੈ।'
        : 'There is no specific age or work-type condition for this.';
  }
}

export function localizeCheck(check: Check, lang: SchemeLanguage): string {
  switch (check.code) {
    case 'age': {
      const range = ageRange(lang, check.min, check.max);
      return lang === 'hi' ? `Umar ${range} honi chahiye.` : lang === 'pa' ? `ਉਮਰ ${range} ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।` : `Age must be ${range}.`;
    }
    case 'income': {
      const max = rupees(check.maxPaise);
      return lang === 'hi'
        ? `Mahine ki kamai ${max} ya kam honi chahiye.`
        : lang === 'pa'
        ? `ਮਹੀਨੇ ਦੀ ਕਮਾਈ ${max} ਜਾਂ ਘੱਟ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।`
        : `Monthly income must be ${max} or less.`;
    }
    case 'epfo':
      return lang === 'hi' ? 'EPFO (PF) ka member nahi hona chahiye.' : lang === 'pa' ? 'EPFO (PF) ਦੇ ਮੈਂਬਰ ਨਹੀਂ ਹੋਣੇ ਚਾਹੀਦੇ।' : 'Must not be an EPFO (PF) member.';
    case 'esic':
      return lang === 'hi' ? 'ESIC ka member nahi hona chahiye.' : lang === 'pa' ? 'ESIC ਦੇ ਮੈਂਬਰ ਨਹੀਂ ਹੋਣੇ ਚਾਹੀਦੇ।' : 'Must not be an ESIC member.';
    case 'taxpayer':
      return lang === 'hi' ? 'Income tax bharne wale nahi hone chahiye.' : lang === 'pa' ? 'ਇਨਕਮ ਟੈਕਸ ਭਰਨ ਵਾਲੇ ਨਹੀਂ ਹੋਣੇ ਚਾਹੀਦੇ।' : 'Must not be an income-tax payer.';
    case 'worker_type':
      if (check.label) return check.label[lang];
      return lang === 'hi' ? 'Kuch khaas kaam walon ke liye hai.' : lang === 'pa' ? 'ਕੁਝ ਖ਼ਾਸ ਕੰਮ ਵਾਲਿਆਂ ਲਈ ਹੈ।' : 'Only for certain types of work.';
    case 'state': {
      const names = check.states.map(titleCase).join(', ');
      return lang === 'hi' ? `Sirf ${names} ke liye.` : lang === 'pa' ? `ਸਿਰਫ਼ ${names} ਲਈ।` : `Only for ${names}.`;
    }
    case 'extra':
      return check.text[lang];
  }
}

export interface LocalizedSchemeMatch {
  id: string;
  name: string;
  benefit: string;
  reasons: string[];
  needsCheck: string[];
  officialUrl: string;
}

export function localizeMatches(matches: SchemeMatch[], lang: SchemeLanguage): LocalizedSchemeMatch[] {
  return matches.map((m) => ({
    id: m.scheme.id,
    name: m.scheme.name[lang],
    benefit: m.scheme.benefit[lang],
    reasons: m.reasons.map((r) => localizeReason(r, lang)),
    needsCheck: m.needsCheck.map((c) => localizeCheck(c, lang)),
    officialUrl: m.scheme.officialUrl,
  }));
}

export function schemeDisclaimer(lang: SchemeLanguage): string {
  if (lang === 'hi') {
    return `Yeh sirf shuruaati jaanch hai, pakki eligibility nahi. Official website ya nazdeeki CSC / Sewa Kendra par confirm karein. Madad ke liye e-Shram helpline ${SCHEME_HELPLINE} par call karein.`;
  }
  if (lang === 'pa') {
    return `ਇਹ ਸਿਰਫ਼ ਮੁੱਢਲੀ ਜਾਂਚ ਹੈ, ਪੱਕੀ ਯੋਗਤਾ ਨਹੀਂ। ਸਰਕਾਰੀ ਵੈੱਬਸਾਈਟ ਜਾਂ ਨੇੜਲੇ CSC / ਸੇਵਾ ਕੇਂਦਰ \'ਤੇ ਪੱਕਾ ਕਰੋ। ਮਦਦ ਲਈ ਈ-ਸ਼੍ਰਮ ਹੈਲਪਲਾਈਨ ${SCHEME_HELPLINE} \'ਤੇ ਕਾਲ ਕਰੋ।`;
  }
  return `This is only a preliminary check, not a confirmation of eligibility. Please confirm on the official website or at your nearest CSC / Sewa Kendra. For help, call the e-Shram helpline ${SCHEME_HELPLINE}.`;
}

/**
 * Compact English reference of matching schemes for the chat prompt. This is
 * application-curated data, so it is placed in the system instruction as
 * trusted context.
 */
export function schemeReferenceForPrompt(matches: SchemeMatch[]): string {
  return matches
    .map((m) => {
      const rules = m.needsCheck.map((c) => localizeCheck(c, 'en')).join(' ');
      return `- ${m.scheme.name.en}: ${m.scheme.benefit.en} Official site: ${m.scheme.officialUrl}. Conditions to confirm: ${rules || 'none listed'}`;
    })
    .join('\n');
}
