import crypto from 'node:crypto';
import { db } from '../../db/index.js';
import { addDaysToDateString, getTodayDateString } from '../money/calculator.js';

/** Demo sessions are recognisable by id so no schema change is needed. */
export const DEMO_SESSION_PREFIX = 'kp_demo_';

export function isDemoSessionId(id: string): boolean {
  return id.startsWith(DEMO_SESSION_PREFIX);
}

export const DEMO_PROFILE = { workerType: 'delivery', state: 'Punjab' } as const;

/** Days of history the demo account starts with (today included). */
export const DEMO_HISTORY_DAYS = 21;

interface SeedEntry {
  type: 'earning' | 'expense';
  amountPaise: number;
  label: string;
  note: string | null;
  date: string;
}

/** Small deterministic PRNG so every demo account gets the same believable history. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole rupees in [min, max] rounded to `step`, returned as integer paise. */
function rupees(rand: () => number, min: number, max: number, step = 10): number {
  const value = min + Math.floor(rand() * ((max - min) / step + 1)) * step;
  return value * 100;
}

/**
 * Three weeks of a Ludhiana delivery rider's ledger: two or three apps a day,
 * fuel almost daily, food, a weekly recharge, a servicing bill and one rest day
 * a week. All amounts are integer paise.
 */
export function buildDemoEntries(today: string = getTodayDateString(), seed = 20261017): SeedEntry[] {
  const rand = mulberry32(seed);
  const entries: SeedEntry[] = [];

  for (let back = DEMO_HISTORY_DAYS - 1; back >= 0; back--) {
    const date = addDaysToDateString(today, -back);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    const isToday = back === 0;

    // Tuesday off, except it's never "today" so the home screen always has numbers
    if (weekday === 2 && !isToday) continue;

    const weekend = weekday === 0 || weekday === 6;
    entries.push({ type: 'earning', amountPaise: rupees(rand, weekend ? 520 : 380, weekend ? 760 : 620), label: 'Swiggy', note: null, date });
    entries.push({ type: 'earning', amountPaise: rupees(rand, 240, weekend ? 480 : 380), label: 'Zomato', note: null, date });
    if (rand() < 0.45) {
      entries.push({ type: 'earning', amountPaise: rupees(rand, 120, 260), label: 'Zepto', note: null, date });
    }
    if (rand() < 0.3) {
      entries.push({ type: 'earning', amountPaise: rupees(rand, 30, 80, 5), label: 'Tips', note: 'Customer tip', date });
    }

    entries.push({ type: 'expense', amountPaise: rupees(rand, 150, 240), label: 'Fuel', note: null, date });
    if (rand() < 0.7) {
      entries.push({ type: 'expense', amountPaise: rupees(rand, 60, 140), label: 'Food', note: null, date });
    }
    if (weekday === 1) {
      entries.push({ type: 'expense', amountPaise: 29900, label: 'Mobile/data', note: 'Weekly data pack', date });
    }
    if (back === 9) {
      entries.push({ type: 'expense', amountPaise: 85000, label: 'Maintenance', note: 'Bike servicing + chain', date });
    }
    if (back === 15) {
      entries.push({ type: 'expense', amountPaise: 45000, label: 'Equipment', note: 'Rain jacket', date });
    }
  }
  return entries;
}

/**
 * Creates a fresh demo session with sample money history. Each login gets its
 * own session, so testers never see each other's edits.
 */
export function createDemoSession(language: 'hi' | 'en' | 'pa' = 'hi'): string {
  const sessionId = DEMO_SESSION_PREFIX + crypto.randomBytes(12).toString('hex');
  const now = Date.now();
  const entries = buildDemoEntries();

  db.exec('BEGIN');
  try {
    db.prepare(
      'INSERT INTO sessions (id, language, worker_type, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(sessionId, language, DEMO_PROFILE.workerType, DEMO_PROFILE.state, now, now);

    const insert = db.prepare(`
      INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    entries.forEach((e, i) => {
      // created_at follows the entry date so "recent entries" sort naturally
      const createdAt = Date.parse(`${e.date}T06:00:00Z`) + i * 60_000;
      insert.run('entry_' + crypto.randomUUID(), sessionId, e.type, e.amountPaise, e.label, e.note, e.date, createdAt, createdAt);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return sessionId;
}
