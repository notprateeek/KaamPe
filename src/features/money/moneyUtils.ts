/**
 * Client-side money helpers. All arithmetic is done in integer paise; only the
 * final string formatting splits paise into rupees. Output matches the server's
 * formatRupees(): ₹1,150 for whole rupees, ₹0.50 / ₹1,150.50 when paise exist.
 */

export interface MoneyEntry {
  id: string;
  type: 'earning' | 'expense';
  amountPaise: number;
  amountRupees?: number;
  categoryOrSource: string | null;
  note: string | null;
  date: string;
  createdAt: number;
}

export interface DaySummary {
  date: string;
  earningsPaise: number;
  expensesPaise: number;
  netPaise: number;
  entryCount: number;
}

export interface WeeklySummary {
  totalEarningsPaise: number;
  totalExpensesPaise: number;
  netPaise: number;
  days: DaySummary[];
}

export interface MoneySummary {
  today: DaySummary;
  weekly: WeeklySummary;
  recentEntries: MoneyEntry[];
}

/** Formats integer paise as ₹ with Indian digit grouping. `sign` adds + for positive values. */
export function formatPaise(paise: number, opts: { sign?: boolean } = {}): string {
  const safe = Number.isFinite(paise) ? Math.round(paise) : 0;
  const abs = Math.abs(safe);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  const body = rem === 0 ? rupees.toLocaleString('en-IN') : `${rupees.toLocaleString('en-IN')}.${String(rem).padStart(2, '0')}`;
  if (safe < 0) return `-₹${body}`;
  if (opts.sign && safe > 0) return `+₹${body}`;
  return `₹${body}`;
}

/** Short label for chart bars: whole rupees, k/L suffix for large values, always signed. */
export function formatPaiseCompact(paise: number): string {
  const abs = Math.abs(paise);
  const sign = paise < 0 ? '-' : paise > 0 ? '+' : '';
  const rupees = Math.round(abs / 100);
  let body: string;
  if (rupees >= 100000) body = `${(rupees / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  else if (rupees >= 10000) body = `${Math.round(rupees / 1000)}k`;
  else if (rupees >= 1000) body = `${(rupees / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  else body = String(rupees);
  return `${sign}₹${body}`;
}

/**
 * Parses a rupee amount typed by the user into integer paise without float math.
 * Returns null for anything that is not a positive amount with at most 2 decimals.
 */
export function parseRupeesToPaise(input: string): number | null {
  const clean = input.replace(/,/g, '').trim();
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(clean);
  if (!match) return null;
  const paise = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return paise > 0 ? paise : null;
}

/** Replaces {key} placeholders in a translated template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => (key in values ? String(values[key]) : m));
}

export interface PlatformStat {
  key: string;
  label: string | null; // null = entries without a source name
  earningsPaise: number;
  activeDays: number;
  earnPerDayPaise: number;
  /** Estimated: each day's expenses split across that day's platforms by earnings share. */
  netPaise: number;
  netPerDayPaise: number;
  sharePct: number;
}

/**
 * Per-platform earnings over the given week. Expenses are not tagged with a
 * platform, so each day's expenses are allocated to that day's platforms in
 * proportion to their earnings (largest-remainder, so allocations sum exactly).
 * Expenses on days with no earnings stay unallocated.
 */
export function computePlatformStats(entries: MoneyEntry[], weekDates: string[]): PlatformStat[] {
  const dates = new Set(weekDates);
  // date -> platformKey -> earnings paise
  const perDay = new Map<string, Map<string, number>>();
  const expensesPerDay = new Map<string, number>();
  const labels = new Map<string, string | null>();

  for (const e of entries) {
    if (!dates.has(e.date) || !Number.isInteger(e.amountPaise)) continue;
    if (e.type === 'expense') {
      expensesPerDay.set(e.date, (expensesPerDay.get(e.date) ?? 0) + e.amountPaise);
      continue;
    }
    const name = e.categoryOrSource?.trim() || null;
    const key = name ? name.toLowerCase() : '__none__';
    if (!labels.has(key)) labels.set(key, name);
    const day = perDay.get(e.date) ?? new Map<string, number>();
    day.set(key, (day.get(key) ?? 0) + e.amountPaise);
    perDay.set(e.date, day);
  }

  const stats = new Map<string, { earnings: number; expenses: number; days: number }>();
  let weekEarnings = 0;

  for (const [date, platforms] of perDay) {
    const dayEarnings = [...platforms.values()].reduce((a, b) => a + b, 0);
    const dayExpenses = expensesPerDay.get(date) ?? 0;
    weekEarnings += dayEarnings;

    // Largest-remainder allocation of dayExpenses by earnings share
    const shares = [...platforms.entries()].map(([key, earn]) => {
      const exact = dayEarnings > 0 ? dayExpenses * earn : 0;
      const base = dayEarnings > 0 ? Math.floor(exact / dayEarnings) : 0;
      return { key, earn, base, rem: dayEarnings > 0 ? exact % dayEarnings : 0 };
    });
    let leftover = dayExpenses - shares.reduce((a, s) => a + s.base, 0);
    shares.sort((a, b) => b.rem - a.rem);
    for (const s of shares) {
      const extra = leftover > 0 ? 1 : 0;
      leftover -= extra;
      const cur = stats.get(s.key) ?? { earnings: 0, expenses: 0, days: 0 };
      cur.earnings += s.earn;
      cur.expenses += s.base + extra;
      cur.days += 1;
      stats.set(s.key, cur);
    }
  }

  return [...stats.entries()]
    .map(([key, s]) => {
      const net = s.earnings - s.expenses;
      return {
        key,
        label: labels.get(key) ?? null,
        earningsPaise: s.earnings,
        activeDays: s.days,
        earnPerDayPaise: Math.round(s.earnings / s.days),
        netPaise: net,
        netPerDayPaise: Math.round(net / s.days),
        sharePct: weekEarnings > 0 ? Math.round((s.earnings * 100) / weekEarnings) : 0,
      };
    })
    .sort((a, b) => b.earningsPaise - a.earningsPaise);
}

export async function fetchMoneySummary(): Promise<MoneySummary> {
  const res = await fetch('/api/money/summary', { credentials: 'include' });
  if (!res.ok) throw new Error(`summary ${res.status}`);
  return res.json();
}

export async function fetchMoneyEntries(): Promise<MoneyEntry[]> {
  const res = await fetch('/api/money/entries', { credentials: 'include' });
  if (!res.ok) throw new Error(`entries ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.entries) ? json.entries : [];
}
