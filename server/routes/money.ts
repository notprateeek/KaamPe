import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
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

// Zod schemas for validation
const CreateEarningSchema = z.object({
  amount: z.union([z.number().positive(), z.string()]),
  source: z.string().trim().max(50).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

const CreateExpenseSchema = z.object({
  amount: z.union([z.number().positive(), z.string()]),
  category: z.enum(['Fuel', 'Food', 'Maintenance', 'Mobile/data', 'Equipment', 'Other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

function rowToRecord(row: any): MoneyEntryRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    amountPaise: row.amount_paise,
    categoryOrSource: row.category_or_source,
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/money/summary - Returns today's summary, weekly summary, and recent entries
router.get('/summary', (req, res) => {
  const today = getTodayDateString();
  const sessionId = req.sessionId;

  // Retrieve all entries for this session
  const rows = db.prepare(`
    SELECT * FROM money_entries
    WHERE session_id = ?
    ORDER BY date DESC, created_at DESC
  `).all(sessionId);

  const entries = rows.map(rowToRecord);
  const todaySummary = calculateDailySummary(entries, today);
  const weeklySummary = calculateWeeklySummary(entries, today);

  // Recent 20 entries
  const recentEntries = entries.slice(0, 20).map((e) => ({
    ...e,
    amountRupees: paiseToRupees(e.amountPaise),
  }));

  res.json({
    today: todaySummary,
    weekly: weeklySummary,
    recentEntries,
  });
});

// GET /api/money/entries - Get all entries for this session
router.get('/entries', (req, res) => {
  const sessionId = req.sessionId;
  const rows = db.prepare(`
    SELECT * FROM money_entries
    WHERE session_id = ?
    ORDER BY date DESC, created_at DESC
  `).all(sessionId);

  const entries = rows.map((r) => {
    const rec = rowToRecord(r);
    return {
      ...rec,
      amountRupees: paiseToRupees(rec.amountPaise),
    };
  });

  res.json({ entries });
});

// POST /api/money/earning - Record an earning
router.post('/earning', (req, res) => {
  const parsed = CreateEarningSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
  }

  let amountPaise: number;
  try {
    amountPaise = rupeesToPaise(parsed.data.amount);
    if (amountPaise <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  const date = parsed.data.date || getTodayDateString();
  const source = parsed.data.source || null;
  const note = parsed.data.note || null;
  const id = 'entry_' + crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
    VALUES (?, ?, 'earning', ?, ?, ?, ?, ?, ?)
  `).run(id, req.sessionId, amountPaise, source, note, date, now, now);

  res.status(201).json({
    success: true,
    entry: {
      id,
      sessionId: req.sessionId,
      type: 'earning',
      amountPaise,
      amountRupees: paiseToRupees(amountPaise),
      categoryOrSource: source,
      note,
      date,
      createdAt: now,
      updatedAt: now,
    },
  });
});

// POST /api/money/expense - Record an expense
router.post('/expense', (req, res) => {
  const parsed = CreateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
  }

  let amountPaise: number;
  try {
    amountPaise = rupeesToPaise(parsed.data.amount);
    if (amountPaise <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  const date = parsed.data.date || getTodayDateString();
  const category = parsed.data.category;
  const note = parsed.data.note || null;
  const id = 'entry_' + crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
    VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?)
  `).run(id, req.sessionId, amountPaise, category, note, date, now, now);

  res.status(201).json({
    success: true,
    entry: {
      id,
      sessionId: req.sessionId,
      type: 'expense',
      amountPaise,
      amountRupees: paiseToRupees(amountPaise),
      categoryOrSource: category,
      note,
      date,
      createdAt: now,
      updatedAt: now,
    },
  });
});

// DELETE /api/money/entries/:id - Delete with strict session ownership verification
router.delete('/entries/:id', (req, res) => {
  const entryId = req.params.id;
  const sessionId = req.sessionId;

  // Verify ownership
  const entry = db.prepare('SELECT id, session_id FROM money_entries WHERE id = ?').get(entryId) as any;

  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  if (entry.session_id !== sessionId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this entry' });
  }

  db.prepare('DELETE FROM money_entries WHERE id = ? AND session_id = ?').run(entryId, sessionId);

  res.json({ success: true, message: 'Entry deleted successfully' });
});

export default router;
