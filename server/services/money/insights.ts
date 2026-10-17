import { z } from 'zod';
import { addDaysToDateString, formatRupees, paiseToRupees, type MoneyEntryRecord } from './calculator.js';
import { numberTokens } from '../text/numbers.js';
import { findUnlistedPhoneNumbers } from '../ai/safety.js';

/**
 * Earnings insights: every number is computed here in integer paise. The model
 * only turns these facts into a short summary and tips, and its text is
 * rejected (deterministic fallback) if it uses any number not in the facts.
 */

export type InsightLang = 'hi' | 'en' | 'pa';

export const INSIGHT_WINDOW_DAYS = 30;

export interface InsightFacts {
  windowDays: number;
  daysWorked: number;
  earnedRupees: number;
  spentRupees: number;
  netRupees: number;
  avgNetPerWorkedDayRupees: number;
  thisWeekNetRupees: number;
  lastWeekNetRupees: number;
  bestDay: { date: string; netRupees: number } | null;
  /** Earnings per source, highest first. */
  sources: { name: string; earnedRupees: number; days: number }[];
  /** Expenses per category, highest first, with share of all spending. */
  expenses: { category: string; spentRupees: number; sharePercent: number }[];
}

const wholeRupees = (paise: number) => Math.round(paiseToRupees(paise));

/** Totals for the last `windowDays` days ending on `today` (IST date string). */
export function computeInsightFacts(entries: readonly MoneyEntryRecord[], today: string, windowDays = INSIGHT_WINDOW_DAYS): InsightFacts {
  const since = addDaysToDateString(today, -(windowDays - 1));
  const weekStart = addDaysToDateString(today, -6);
  const lastWeekStart = addDaysToDateString(today, -13);
  const inWindow = entries.filter((e) => e.date >= since && e.date <= today);

  let earned = 0;
  let spent = 0;
  let thisWeek = 0;
  let lastWeek = 0;
  const perDay = new Map<string, number>();
  const workedDays = new Set<string>();
  const sources = new Map<string, { paise: number; days: Set<string> }>();
  const categories = new Map<string, number>();

  for (const e of inWindow) {
    const signed = e.type === 'earning' ? e.amountPaise : -e.amountPaise;
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + signed);
    if (e.date >= weekStart) thisWeek += signed;
    else if (e.date >= lastWeekStart) lastWeek += signed;
    if (e.type === 'earning') {
      earned += e.amountPaise;
      workedDays.add(e.date);
      const name = e.categoryOrSource?.trim() || 'Other';
      const s = sources.get(name) ?? { paise: 0, days: new Set<string>() };
      s.paise += e.amountPaise;
      s.days.add(e.date);
      sources.set(name, s);
    } else {
      spent += e.amountPaise;
      const name = e.categoryOrSource?.trim() || 'Other';
      categories.set(name, (categories.get(name) ?? 0) + e.amountPaise);
    }
  }

  let bestDay: InsightFacts['bestDay'] = null;
  for (const [date, net] of perDay) {
    if (net > 0 && (!bestDay || net > bestDay.netRupees * 100)) bestDay = { date, netRupees: wholeRupees(net) };
  }

  const net = earned - spent;
  return {
    windowDays,
    daysWorked: workedDays.size,
    earnedRupees: wholeRupees(earned),
    spentRupees: wholeRupees(spent),
    netRupees: wholeRupees(net),
    avgNetPerWorkedDayRupees: workedDays.size ? wholeRupees(Math.round(net / workedDays.size)) : 0,
    thisWeekNetRupees: wholeRupees(thisWeek),
    lastWeekNetRupees: wholeRupees(lastWeek),
    bestDay,
    sources: [...sources.entries()]
      .map(([name, s]) => ({ name, earnedRupees: wholeRupees(s.paise), days: s.days.size }))
      .sort((a, b) => b.earnedRupees - a.earnedRupees)
      .slice(0, 6),
    expenses: [...categories.entries()]
      .map(([category, paise]) => ({
        category,
        spentRupees: wholeRupees(paise),
        sharePercent: spent ? Math.round((paise / spent) * 100) : 0,
      }))
      .sort((a, b) => b.spentRupees - a.spentRupees),
  };
}

/** Facts as compact text for the prompt (all values are application-computed). */
export function factsForPrompt(f: InsightFacts): string {
  return JSON.stringify(f);
}

export const InsightOutputSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  tips: z.array(z.string().trim().min(1).max(300)).min(1).max(3),
  warning: z.string().trim().max(300).nullish(),
});

export interface InsightResult {
  summary: string;
  tips: string[];
  warning?: string;
  /** True when the deterministic text was used instead of the model's. */
  usedFallback: boolean;
}

/** Every number the model may repeat: the facts' values, plus the window lengths. */
function allowedNumbers(f: InsightFacts): Set<string> {
  const values: (string | number)[] = [
    f.windowDays,
    7,
    f.daysWorked,
    f.earnedRupees,
    f.spentRupees,
    f.netRupees,
    f.avgNetPerWorkedDayRupees,
    f.thisWeekNetRupees,
    f.lastWeekNetRupees,
    Math.abs(f.thisWeekNetRupees - f.lastWeekNetRupees),
  ];
  if (f.bestDay) values.push(f.bestDay.netRupees, f.bestDay.date);
  for (const s of f.sources) values.push(s.earnedRupees, s.days);
  for (const e of f.expenses) values.push(e.spentRupees, e.sharePercent);
  // numberTokens ignores the minus sign, so a loss of ₹500 may be written as "500".
  return new Set(values.flatMap((v) => numberTokens(String(v))));
}

/** True when the text only uses numbers from the facts, and no links or phone numbers. */
export function isInsightFaithful(output: z.infer<typeof InsightOutputSchema>, f: InsightFacts): boolean {
  const text = [output.summary, ...output.tips, output.warning ?? ''].join('\n');
  const allowed = allowedNumbers(f);
  if (numberTokens(text).some((n) => !allowed.has(n))) return false;
  if (/https?:\/\/|www\./i.test(text)) return false;
  return findUnlistedPhoneNumbers([text], '').length === 0;
}

/** Plain, number-safe insights used when the model is unavailable or unfaithful. */
export function fallbackInsights(f: InsightFacts, language: InsightLang): InsightResult {
  const r = (n: number) => formatRupees(n);
  const topSource = f.sources[0];
  const topExpense = f.expenses[0];
  const tips: string[] = [];
  const trendUp = f.thisWeekNetRupees >= f.lastWeekNetRupees;

  if (language === 'hi') {
    const summary = `Pichhle ${f.windowDays} din mein aapne ${r(f.earnedRupees)} kamaye, ${r(f.spentRupees)} kharch kiye aur ${r(f.netRupees)} bachaye (${f.daysWorked} din kaam).`;
    if (topSource) tips.push(`Sabse zyada kamai ${topSource.name} se hui: ${r(topSource.earnedRupees)}.`);
    if (topExpense) tips.push(`Sabse bada kharch ${topExpense.category} hai (${topExpense.sharePercent}%). Ise kam karne se bachat badhegi.`);
    tips.push(trendUp ? `Is hafte ki bachat (${r(f.thisWeekNetRupees)}) pichhle hafte se zyada ya barabar hai.` : `Is hafte ki bachat (${r(f.thisWeekNetRupees)}) pichhle hafte (${r(f.lastWeekNetRupees)}) se kam hai.`);
    return { summary, tips: tips.slice(0, 3), usedFallback: true };
  }
  if (language === 'pa') {
    const summary = `ਪਿਛਲੇ ${f.windowDays} ਦਿਨਾਂ ਵਿੱਚ ਤੁਸੀਂ ${r(f.earnedRupees)} ਕਮਾਏ, ${r(f.spentRupees)} ਖਰਚ ਕੀਤੇ ਅਤੇ ${r(f.netRupees)} ਬਚਾਏ (${f.daysWorked} ਦਿਨ ਕੰਮ)।`;
    if (topSource) tips.push(`ਸਭ ਤੋਂ ਵੱਧ ਕਮਾਈ ${topSource.name} ਤੋਂ ਹੋਈ: ${r(topSource.earnedRupees)}।`);
    if (topExpense) tips.push(`ਸਭ ਤੋਂ ਵੱਡਾ ਖਰਚ ${topExpense.category} ਹੈ (${topExpense.sharePercent}%)। ਇਸਨੂੰ ਘਟਾਉਣ ਨਾਲ ਬਚਤ ਵਧੇਗੀ।`);
    tips.push(trendUp ? `ਇਸ ਹਫ਼ਤੇ ਦੀ ਬਚਤ (${r(f.thisWeekNetRupees)}) ਪਿਛਲੇ ਹਫ਼ਤੇ ਤੋਂ ਵੱਧ ਜਾਂ ਬਰਾਬਰ ਹੈ।` : `ਇਸ ਹਫ਼ਤੇ ਦੀ ਬਚਤ (${r(f.thisWeekNetRupees)}) ਪਿਛਲੇ ਹਫ਼ਤੇ (${r(f.lastWeekNetRupees)}) ਤੋਂ ਘੱਟ ਹੈ।`);
    return { summary, tips: tips.slice(0, 3), usedFallback: true };
  }
  const summary = `In the last ${f.windowDays} days you earned ${r(f.earnedRupees)}, spent ${r(f.spentRupees)} and kept ${r(f.netRupees)} (${f.daysWorked} days worked).`;
  if (topSource) tips.push(`Your biggest source was ${topSource.name}: ${r(topSource.earnedRupees)}.`);
  if (topExpense) tips.push(`Your biggest cost is ${topExpense.category} (${topExpense.sharePercent}% of spending). Cutting it raises take-home.`);
  tips.push(trendUp ? `This week's take-home (${r(f.thisWeekNetRupees)}) is level with or above last week.` : `This week's take-home (${r(f.thisWeekNetRupees)}) is below last week (${r(f.lastWeekNetRupees)}).`);
  return { summary, tips: tips.slice(0, 3), usedFallback: true };
}
