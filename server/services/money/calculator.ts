/**
 * Deterministic Financial Calculations in Integer Paise
 * 1 Rupee = 100 Paise.
 * Prevents floating point inaccuracy (e.g. 0.1 + 0.2 !== 0.3)
 */

export interface MoneyEntryRecord {
  id: string;
  sessionId: string;
  type: 'earning' | 'expense';
  amountPaise: number;
  categoryOrSource: string | null;
  note: string | null;
  date: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

/** Hard ceiling for a single money entry: ₹10,00,000 (10 lakh). */
export const MAX_ENTRY_RUPEES = 1_000_000;
export const MAX_ENTRY_PAISE = MAX_ENTRY_RUPEES * 100;

/** Plain decimal rupee string: digits with an optional fractional part (no exponents, hex, signs). */
const RUPEE_STRING_RE = /^\d+(?:\.\d+)?$/;

/** Strips thousands separators, whitespace and a leading ₹ / Rs prefix from user-typed amounts. */
function normalizeRupeeString(value: string): string {
  return value.replace(/[,\s]/g, '').replace(/^(?:₹|rs\.?|inr)/i, '');
}

/**
 * Converts user-provided rupees (number or string) safely to integer paise.
 * Rounds to nearest integer paise to avoid IEEE-754 precision issues.
 * Strings must be plain decimals ("1,200.75", "₹850"); exponent/hex forms such as
 * "1e400" or "0x10" and empty strings are rejected.
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleanStr = normalizeRupeeString(rupees);
    if (!RUPEE_STRING_RE.test(cleanStr)) {
      throw new Error('Invalid rupee amount');
    }
    rupees = Number(cleanStr);
  }

  if (typeof rupees !== 'number' || !Number.isFinite(rupees)) {
    throw new Error('Invalid rupee amount');
  }

  if (rupees < 0) {
    throw new Error('Amount cannot be negative');
  }

  // Math.round handles fractions like 0.50 -> 50 paise accurately
  const paise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paise)) {
    throw new Error('Amount is too large');
  }
  return paise;
}

export type MoneyValidationCode = 'invalid' | 'not_positive' | 'too_many_decimals' | 'too_large';

export class MoneyValidationError extends Error {
  constructor(public readonly code: MoneyValidationCode, message: string) {
    super(message);
    this.name = 'MoneyValidationError';
  }
}

/**
 * Strict parser for amounts typed by a user for a single entry.
 * Accepts a positive number or plain decimal string with at most 2 decimal places
 * and at most MAX_ENTRY_RUPEES. Returns integer paise or throws MoneyValidationError.
 */
export function parseRupeeAmount(input: unknown): number {
  let rupees: number;
  let decimals = 0;

  if (typeof input === 'string') {
    const clean = normalizeRupeeString(input);
    if (clean.length === 0 || clean.length > 20) {
      throw new MoneyValidationError('invalid', 'Amount must be a plain number');
    }
    if (clean.startsWith('-')) {
      throw new MoneyValidationError('not_positive', 'Amount must be greater than zero');
    }
    if (!RUPEE_STRING_RE.test(clean)) {
      throw new MoneyValidationError('invalid', 'Amount must be a plain number');
    }
    decimals = clean.includes('.') ? clean.split('.')[1].replace(/0+$/, '').length : 0;
    rupees = Number(clean);
  } else if (typeof input === 'number') {
    rupees = input;
  } else {
    throw new MoneyValidationError('invalid', 'Amount must be a number');
  }

  if (!Number.isFinite(rupees)) {
    throw new MoneyValidationError('invalid', 'Amount must be a finite number');
  }
  if (rupees <= 0) {
    throw new MoneyValidationError('not_positive', 'Amount must be greater than zero');
  }
  if (rupees > MAX_ENTRY_RUPEES) {
    throw new MoneyValidationError('too_large', `Amount cannot exceed ₹${MAX_ENTRY_RUPEES.toLocaleString('en-IN')} per entry`);
  }

  const scaled = rupees * 100;
  const paise = Math.round(scaled);
  // Tolerate IEEE-754 representation noise (0.29 * 100 = 28.999999999999996) but not real sub-paise values.
  if (decimals > 2 || Math.abs(scaled - paise) > 1e-6) {
    throw new MoneyValidationError('too_many_decimals', 'Amount can have at most 2 decimal places');
  }
  if (paise <= 0) {
    throw new MoneyValidationError('not_positive', 'Amount must be greater than zero');
  }
  return paise;
}

/**
 * Converts integer paise to decimal rupees with 2 decimal places if paise exist, or integer if whole.
 */
export function paiseToRupees(paise: number): number {
  if (typeof paise !== 'number' || isNaN(paise) || !isFinite(paise)) {
    throw new Error(`Invalid paise amount: ${paise}`);
  }
  return paise / 100;
}

/**
 * Calculates net income (Earnings - Expenses) in paise.
 */
export function calculateNetPaise(earningsPaise: number, expensesPaise: number): number {
  return earningsPaise - expensesPaise;
}

export interface DaySummary {
  date: string;
  earningsPaise: number;
  expensesPaise: number;
  netPaise: number;
  earningsRupees: number;
  expensesRupees: number;
  netRupees: number;
  entryCount: number;
}

export interface WeeklySummary {
  totalEarningsPaise: number;
  totalExpensesPaise: number;
  netPaise: number;
  totalEarningsRupees: number;
  totalExpensesRupees: number;
  netRupees: number;
  days: DaySummary[];
}

/**
 * Computes daily totals from a list of money entries for a given date.
 */
export function calculateDailySummary(entries: MoneyEntryRecord[], targetDate: string): DaySummary {
  const dayEntries = entries.filter((e) => e.date === targetDate);
  let earningsPaise = 0;
  let expensesPaise = 0;

  for (const entry of dayEntries) {
    if (entry.type === 'earning') {
      earningsPaise += entry.amountPaise;
    } else if (entry.type === 'expense') {
      expensesPaise += entry.amountPaise;
    }
  }

  const netPaise = calculateNetPaise(earningsPaise, expensesPaise);

  return {
    date: targetDate,
    earningsPaise,
    expensesPaise,
    netPaise,
    earningsRupees: paiseToRupees(earningsPaise),
    expensesRupees: paiseToRupees(expensesPaise),
    netRupees: paiseToRupees(netPaise),
    entryCount: dayEntries.length,
  };
}

/**
 * Computes weekly summary (past 7 days ending at referenceDate, default: today in India).
 */
export function calculateWeeklySummary(
  entries: MoneyEntryRecord[],
  referenceDate: string = getTodayDateString()
): WeeklySummary {
  const days: DaySummary[] = [];

  let totalEarningsPaise = 0;
  let totalExpensesPaise = 0;

  for (let i = 6; i >= 0; i--) {
    const dateStr = addDaysToDateString(referenceDate, -i);
    const summary = calculateDailySummary(entries, dateStr);
    days.push(summary);
    totalEarningsPaise += summary.earningsPaise;
    totalExpensesPaise += summary.expensesPaise;
  }

  const netPaise = calculateNetPaise(totalEarningsPaise, totalExpensesPaise);

  return {
    totalEarningsPaise,
    totalExpensesPaise,
    netPaise,
    totalEarningsRupees: paiseToRupees(totalEarningsPaise),
    totalExpensesRupees: paiseToRupees(totalExpensesPaise),
    netRupees: paiseToRupees(netPaise),
    days,
  };
}

/**
 * Formats rupee amount for display.
 * Keeps currency symbol intact: ₹650 or ₹0.50
 */
export function formatRupees(rupees: number, showSign: boolean = false): string {
  const isNegative = rupees < 0;
  const abs = Math.abs(rupees);
  const formatted = abs % 1 === 0 ? abs.toLocaleString('en-IN') : abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  if (showSign) {
    return isNegative ? `-₹${formatted}` : `+₹${formatted}`;
  }
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

/** India Standard Time is a fixed UTC+05:30 with no daylight saving. */
export const INDIA_UTC_OFFSET_MINUTES = 330;

/**
 * Today's calendar date in India (Asia/Kolkata) as YYYY-MM-DD, independent of the
 * server's local timezone (Render / Cloud Run run in UTC).
 */
export function getTodayDateString(now: Date = new Date()): string {
  const india = new Date(now.getTime() + INDIA_UTC_OFFSET_MINUTES * 60_000);
  return india.toISOString().slice(0, 10);
}

/** Adds (or subtracts) whole days to a YYYY-MM-DD string using pure calendar arithmetic. */
export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** True only for a real calendar date in strict YYYY-MM-DD form (rejects 2026-02-30). */
export function isRealCalendarDate(date: string): boolean {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** Earliest date accepted for a money entry. */
export const MIN_ENTRY_DATE = '2000-01-01';

/**
 * Validates a user-supplied entry date: a real calendar date, not before MIN_ENTRY_DATE
 * and at most one day after today in India (tolerates client clock skew).
 */
export function validateEntryDate(date: string, today: string = getTodayDateString()): string | null {
  if (!isRealCalendarDate(date)) return 'Date must be a real calendar date in YYYY-MM-DD format';
  if (date < MIN_ENTRY_DATE) return `Date cannot be before ${MIN_ENTRY_DATE}`;
  if (date > addDaysToDateString(today, 1)) return 'Date cannot be in the future';
  return null;
}
