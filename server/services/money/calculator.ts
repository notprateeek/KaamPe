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

/**
 * Converts user-provided rupees (number or string) safely to integer paise.
 * Rounds to nearest integer paise to avoid IEEE-754 precision issues.
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleanStr = rupees.replace(/,/g, '').trim();
    const parsed = Number(cleanStr);
    if (isNaN(parsed)) {
      throw new Error(`Invalid rupee amount: "${rupees}"`);
    }
    rupees = parsed;
  }

  if (typeof rupees !== 'number' || isNaN(rupees) || !isFinite(rupees)) {
    throw new Error(`Invalid rupee amount: ${rupees}`);
  }

  if (rupees < 0) {
    throw new Error(`Amount cannot be negative: ${rupees}`);
  }

  // Math.round handles fractions like 0.50 -> 50 paise accurately
  return Math.round(rupees * 100);
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
 * Computes weekly summary (past 7 days ending at referenceDate).
 */
export function calculateWeeklySummary(
  entries: MoneyEntryRecord[],
  referenceDate: string = getTodayDateString()
): WeeklySummary {
  const days: DaySummary[] = [];
  const ref = new Date(`${referenceDate}T00:00:00Z`);

  let totalEarningsPaise = 0;
  let totalExpensesPaise = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(ref);
    d.setUTCDate(ref.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
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

export function getTodayDateString(): string {
  // ISO date YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
