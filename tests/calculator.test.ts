import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  calculateNetPaise,
  calculateDailySummary,
  calculateWeeklySummary,
  formatRupees,
  getTodayDateString,
  addDaysToDateString,
  isRealCalendarDate,
  validateEntryDate,
  parseRupeeAmount,
  MoneyValidationError,
  MAX_ENTRY_PAISE,
  MoneyEntryRecord,
} from '../server/services/money/calculator';

describe('Financial Math & Paise Precision', () => {
  it('converts integers and fractional rupees to integer paise without floating point issues', () => {
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(0.5)).toBe(50);
    expect(rupeesToPaise(0.01)).toBe(1);
    expect(rupeesToPaise('1200.75')).toBe(120075);
    expect(rupeesToPaise(850)).toBe(85000);
    expect(rupeesToPaise(200)).toBe(20000);
    // Floating point trap in standard JS: 0.1 + 0.2 !== 0.3
    // In paise: 10 + 20 === 30
    expect(rupeesToPaise(0.1) + rupeesToPaise(0.2)).toBe(30);
  });

  it('converts integer paise back to rupees accurately', () => {
    expect(paiseToRupees(50)).toBe(0.5);
    expect(paiseToRupees(85000)).toBe(850);
    expect(paiseToRupees(65000)).toBe(650);
    expect(paiseToRupees(0)).toBe(0);
  });

  it('calculates net paise (Addition and Subtraction)', () => {
    const earning = rupeesToPaise(850);
    const expense = rupeesToPaise(200);
    const net = calculateNetPaise(earning, expense);
    expect(net).toBe(65000);
    expect(paiseToRupees(net)).toBe(650);
  });

  it('handles negative net result when expenses exceed earnings', () => {
    const earning = rupeesToPaise(300);
    const expense = rupeesToPaise(500);
    const net = calculateNetPaise(earning, expense);
    expect(net).toBe(-20000);
    expect(paiseToRupees(net)).toBe(-200);
    expect(formatRupees(paiseToRupees(net))).toBe('-₹200');
  });

  it('validates against invalid inputs and negative rupee arguments', () => {
    expect(() => rupeesToPaise(-100)).toThrow();
    expect(() => rupeesToPaise('invalid')).toThrow();
    expect(() => rupeesToPaise(NaN)).toThrow();
  });

  it('calculates daily summary accurately across multiple records', () => {
    const records: MoneyEntryRecord[] = [
      {
        id: '1',
        sessionId: 'sess1',
        type: 'earning',
        amountPaise: 85000,
        categoryOrSource: 'Swiggy',
        note: null,
        date: '2026-10-17',
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: '2',
        sessionId: 'sess1',
        type: 'expense',
        amountPaise: 20000,
        categoryOrSource: 'Fuel',
        note: null,
        date: '2026-10-17',
        createdAt: 110,
        updatedAt: 110,
      },
      {
        id: '3',
        sessionId: 'sess1',
        type: 'earning',
        amountPaise: 50000,
        categoryOrSource: 'Zomato',
        note: null,
        date: '2026-10-17',
        createdAt: 120,
        updatedAt: 120,
      },
    ];

    const summary = calculateDailySummary(records, '2026-10-17');
    expect(summary.earningsRupees).toBe(1350);
    expect(summary.expensesRupees).toBe(200);
    expect(summary.netRupees).toBe(1150);
    expect(summary.entryCount).toBe(3);
  });

  it('aggregates weekly summary over 7 days correctly', () => {
    const records: MoneyEntryRecord[] = [
      {
        id: '1',
        sessionId: 'sess1',
        type: 'earning',
        amountPaise: 100000,
        categoryOrSource: 'Delivery',
        note: null,
        date: '2026-10-17',
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: '2',
        sessionId: 'sess1',
        type: 'expense',
        amountPaise: 30000,
        categoryOrSource: 'Fuel',
        note: null,
        date: '2026-10-16',
        createdAt: 90,
        updatedAt: 90,
      },
    ];

    const weekly = calculateWeeklySummary(records, '2026-10-17');
    expect(weekly.totalEarningsRupees).toBe(1000);
    expect(weekly.totalExpensesRupees).toBe(300);
    expect(weekly.netRupees).toBe(700);
    expect(weekly.days.length).toBe(7);
  });

  it('formats rupee values with commas according to Indian numbering system', () => {
    expect(formatRupees(12500)).toBe('₹12,500');
    expect(formatRupees(650)).toBe('₹650');
    expect(formatRupees(0.5)).toBe('₹0.50');
  });
});

describe('Strict user amount parsing (parseRupeeAmount)', () => {
  it('accepts positive amounts with up to 2 decimals and returns integer paise', () => {
    expect(parseRupeeAmount(850)).toBe(85000);
    expect(parseRupeeAmount('1,200.75')).toBe(120075);
    expect(parseRupeeAmount('₹ 650')).toBe(65000);
    expect(parseRupeeAmount(0.29)).toBe(29);
    expect(parseRupeeAmount('10.50')).toBe(1050);
    expect(parseRupeeAmount(1_000_000)).toBe(MAX_ENTRY_PAISE);
  });

  it.each([
    ['1e400', 'invalid'],
    [Infinity, 'invalid'],
    [NaN, 'invalid'],
    ['0x10', 'invalid'],
    ['', 'invalid'],
    [null, 'invalid'],
    [-5, 'not_positive'],
    ['-5', 'not_positive'],
    [0, 'not_positive'],
    [0.001, 'too_many_decimals'],
    ['1.234', 'too_many_decimals'],
    [1_000_000.01, 'too_large'],
  ])('rejects %s (%s)', (input, code) => {
    try {
      parseRupeeAmount(input);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MoneyValidationError);
      expect((err as MoneyValidationError).code).toBe(code);
    }
  });

  it('rupeesToPaise rejects exponent and empty strings instead of silently coercing', () => {
    expect(() => rupeesToPaise('1e400')).toThrow();
    expect(() => rupeesToPaise('')).toThrow();
    expect(() => rupeesToPaise(Infinity)).toThrow();
    expect(() => rupeesToPaise(1e300)).toThrow();
  });
});

describe('India timezone (Asia/Kolkata) date logic', () => {
  it('rolls over to the next day at 00:00 IST (18:30 UTC), regardless of server timezone', () => {
    expect(getTodayDateString(new Date('2026-10-16T18:29:59Z'))).toBe('2026-10-16');
    expect(getTodayDateString(new Date('2026-10-16T18:30:00Z'))).toBe('2026-10-17');
    // 01:00 UTC on the 17th is 06:30 IST on the 17th
    expect(getTodayDateString(new Date('2026-10-17T01:00:00Z'))).toBe('2026-10-17');
    // Year boundary
    expect(getTodayDateString(new Date('2026-12-31T19:00:00Z'))).toBe('2027-01-01');
  });

  it('weekly summary window is the 7 India-calendar days ending today', () => {
    const late = new Date('2026-10-16T20:00:00Z'); // 01:30 IST on 17 Oct
    const today = getTodayDateString(late);
    const entry = (date: string, amountPaise: number): MoneyEntryRecord => ({
      id: date, sessionId: 's', type: 'earning', amountPaise, categoryOrSource: null, note: null, date, createdAt: 0, updatedAt: 0,
    });
    const weekly = calculateWeeklySummary([entry('2026-10-17', 100), entry('2026-10-11', 10), entry('2026-10-10', 1)], today);
    expect(weekly.days.map((d) => d.date)).toEqual([
      '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17',
    ]);
    expect(weekly.totalEarningsPaise).toBe(110);
  });

  it('adds days across month and leap-year boundaries', () => {
    expect(addDaysToDateString('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToDateString('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToDateString('2026-01-03', -6)).toBe('2025-12-28');
  });

  it('validates real calendar dates and rejects far-future entries', () => {
    expect(isRealCalendarDate('2026-02-30')).toBe(false);
    expect(isRealCalendarDate('2028-02-29')).toBe(true);
    expect(isRealCalendarDate('2026-1-01')).toBe(false);
    expect(validateEntryDate('2026-10-17', '2026-10-17')).toBeNull();
    expect(validateEntryDate('2026-10-18', '2026-10-17')).toBeNull(); // 1 day clock-skew tolerance
    expect(validateEntryDate('2026-10-19', '2026-10-17')).not.toBeNull();
    expect(validateEntryDate('1999-12-31', '2026-10-17')).not.toBeNull();
  });
});
