import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  calculateNetPaise,
  calculateDailySummary,
  calculateWeeklySummary,
  formatRupees,
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
