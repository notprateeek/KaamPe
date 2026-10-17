import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { getGenAI } from '../server/services/ai/gemini';
import aiRouter from '../server/routes/ai';
import { db } from '../server/db/index';
import { addDaysToDateString, getTodayDateString, type MoneyEntryRecord } from '../server/services/money/calculator';
import { computeInsightFacts, fallbackInsights, isInsightFaithful } from '../server/services/money/insights';

vi.mock('../server/services/ai/gemini', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/services/ai/gemini')>()),
  getGenAI: vi.fn(),
}));

const generateContent = vi.fn();
const handler = aiRouter.stack.find((layer) => layer.route?.path === '/money-insights')!.route!.stack.at(-1)!.handle;

const TODAY = '2026-10-17';
let n = 0;
const entry = (date: string, type: 'earning' | 'expense', rupees: number, label: string | null): MoneyEntryRecord => ({
  id: `e${n++}`,
  sessionId: 's',
  type,
  amountPaise: Math.round(rupees * 100),
  categoryOrSource: label,
  note: null,
  date,
  createdAt: 0,
  updatedAt: 0,
});

const LOG = [
  entry('2026-10-17', 'earning', 920.5, 'Swiggy'),
  entry('2026-10-17', 'expense', 180, 'Fuel'),
  entry('2026-10-16', 'earning', 1200, 'Zomato'),
  entry('2026-10-16', 'expense', 60, 'Food'),
  entry('2026-10-08', 'earning', 500, 'Swiggy'),
  entry('2026-09-01', 'earning', 99999, 'Old'), // outside the 30-day window
];

describe('computeInsightFacts', () => {
  it('totals the window in paise, ranks sources and expenses, and compares weeks', () => {
    const f = computeInsightFacts(LOG, TODAY);
    expect(f).toMatchObject({
      windowDays: 30,
      daysWorked: 3,
      earnedRupees: 2621, // 920.50 + 1200 + 500, rounded once at the end
      spentRupees: 240,
      netRupees: 2381,
      thisWeekNetRupees: 1881,
      lastWeekNetRupees: 500,
      bestDay: { date: '2026-10-16', netRupees: 1140 },
    });
    expect(f.sources.map((s) => s.name)).toEqual(['Swiggy', 'Zomato']);
    expect(f.sources[0]).toEqual({ name: 'Swiggy', earnedRupees: 1421, days: 2 });
    expect(f.expenses).toEqual([
      { category: 'Fuel', spentRupees: 180, sharePercent: 75 },
      { category: 'Food', spentRupees: 60, sharePercent: 25 },
    ]);
  });

  it('handles an empty log', () => {
    expect(computeInsightFacts([], TODAY)).toMatchObject({ daysWorked: 0, netRupees: 0, bestDay: null, avgNetPerWorkedDayRupees: 0 });
  });
});

describe('isInsightFaithful', () => {
  const f = computeInsightFacts(LOG, TODAY);
  it('accepts text that only repeats fact numbers', () => {
    expect(isInsightFaithful({ summary: 'You kept ₹2,381 in 30 days.', tips: ['Fuel is 75% of spending.'] }, f)).toBe(true);
  });
  it('rejects invented numbers, links and phone numbers', () => {
    expect(isInsightFaithful({ summary: 'You kept ₹2,400.', tips: ['ok'] }, f)).toBe(false);
    expect(isInsightFaithful({ summary: 'ok', tips: ['Work 5 more hours a day.'] }, f)).toBe(false);
    expect(isInsightFaithful({ summary: 'ok', tips: ['See https://example.com'] }, f)).toBe(false);
  });
  it('fallback text is itself faithful in every language', () => {
    for (const lang of ['hi', 'en', 'pa'] as const) {
      const fb = fallbackInsights(f, lang);
      expect(isInsightFaithful(fb, f)).toBe(true);
      expect(fb.tips.length).toBeGreaterThan(0);
    }
  });
});

describe('POST /api/ai/money-insights', () => {
  const sessionId = `kp_insight_${crypto.randomUUID().replace(/-/g, '')}`;
  const today = getTodayDateString();

  beforeEach(() => {
    vi.mocked(getGenAI).mockReturnValue({ models: { generateContent } } as any);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  async function ask() {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    await handler({ body: { language: 'en' }, sessionId, sessionProfile: { workerType: 'delivery' } } as any, res as any, vi.fn());
    return res.json.mock.calls[0][0];
  }

  it('says empty without calling the model when there are no entries', async () => {
    expect(await ask()).toMatchObject({ empty: true });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("uses only this session's entries, and the model's text when it is faithful", async () => {
    const now = Date.now();
    db.prepare('INSERT INTO sessions (id, language, worker_type, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      sessionId,
      'en',
      'delivery',
      'Punjab',
      now,
      now
    );
    const insert = db.prepare(
      'INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insert.run(`entry_${crypto.randomUUID()}`, sessionId, 'earning', 100000, 'Swiggy', null, today, now, now);
    insert.run(`entry_${crypto.randomUUID()}`, sessionId, 'expense', 20000, 'Fuel', null, addDaysToDateString(today, -1), now, now);

    generateContent.mockResolvedValue({ text: JSON.stringify({ summary: 'You kept ₹800.', tips: ['Fuel took 100% of spending.'], warning: null }) });
    const body = await ask();
    expect(body).toMatchObject({ summary: 'You kept ₹800.', usedFallback: false, facts: { earnedRupees: 1000, spentRupees: 200 } });
    expect(generateContent.mock.calls[0][0].contents).toContain('<user_input>');

    generateContent.mockResolvedValue({ text: JSON.stringify({ summary: 'You kept ₹9,000!', tips: ['x'] }) });
    const invented = await ask();
    expect(invented.usedFallback).toBe(true);
    expect(invented.summary).toContain('₹800');
  });
});
