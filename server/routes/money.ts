import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import {
  paiseToRupees,
  calculateDailySummary,
  calculateWeeklySummary,
  getTodayDateString,
  validateEntryDate,
  addDaysToDateString,
  parseRupeeAmount,
  MoneyValidationError,
  MoneyEntryRecord,
} from '../services/money/calculator.js';
import { sendApiError } from '../middleware/errorHandler.js';

const router = Router();

// Zod schemas for validation. Amounts are re-validated strictly by parseRupeeAmount
// (finite, > 0, <= ₹10,00,000, at most 2 decimals) and converted to integer paise.
const AmountInput = z.union([z.number(), z.string().max(32)]);
const DateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
/** Entry ids are server-generated (`entry_<uuid>`); reject anything outside a safe id alphabet. */
const EntryIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);

const CreateEarningSchema = z.object({
  amount: AmountInput,
  source: z.string().trim().max(50).optional().nullable(),
  date: DateInput.optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

const CreateExpenseSchema = z.object({
  amount: AmountInput,
  category: z.enum(['Fuel', 'Food', 'Maintenance', 'Mobile/data', 'Equipment', 'Other']),
  date: DateInput.optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

type Validated =
  | { ok: true; amountPaise: number; date: string }
  | { ok: false; error: string; field: 'amount' | 'date' };

/** Validates amount + date shared by earnings and expenses. */
function validateAmountAndDate(amount: unknown, date: string | undefined): Validated {
  let amountPaise: number;
  try {
    amountPaise = parseRupeeAmount(amount);
  } catch (err) {
    const message = err instanceof MoneyValidationError ? err.message : 'Invalid amount';
    return { ok: false, error: message, field: 'amount' };
  }
  const today = getTodayDateString();
  const entryDate = date ?? today;
  const dateError = validateEntryDate(entryDate, today);
  if (dateError) return { ok: false, error: dateError, field: 'date' };
  return { ok: true, amountPaise, date: entryDate };
}

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

  // Only the 7-day window is needed for totals (served by idx_money_entries_session_date)
  const weekRows = db.prepare(`
    SELECT * FROM money_entries
    WHERE session_id = ? AND date >= ? AND date <= ?
  `).all(sessionId, addDaysToDateString(today, -6), today);

  const weekEntries = weekRows.map(rowToRecord);
  const todaySummary = calculateDailySummary(weekEntries, today);
  const weeklySummary = calculateWeeklySummary(weekEntries, today);

  // Recent 20 entries
  const recentEntries = db.prepare(`
    SELECT * FROM money_entries
    WHERE session_id = ?
    ORDER BY date DESC, created_at DESC
    LIMIT 20
  `).all(sessionId).map((r) => {
    const e = rowToRecord(r);
    return { ...e, amountRupees: paiseToRupees(e.amountPaise) };
  });

  res.json({
    today: todaySummary,
    weekly: weeklySummary,
    recentEntries,
  });
});

const MAX_ENTRIES_RETURNED = 1000;

// GET /api/money/entries - Get entries for this session (newest first, bounded)
router.get('/entries', (req, res) => {
  const sessionId = req.sessionId;
  const rows = db.prepare(`
    SELECT * FROM money_entries
    WHERE session_id = ?
    ORDER BY date DESC, created_at DESC
    LIMIT ${MAX_ENTRIES_RETURNED}
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
    return sendApiError(req, res, 400, 'validation_failed', {
      details: parsed.error.errors.map((e) => ({ path: e.path, message: e.message })),
    });
  }

  const checked = validateAmountAndDate(parsed.data.amount, parsed.data.date);
  if (!checked.ok) {
    return sendApiError(req, res, 400, 'validation_failed', {
      details: [{ path: [checked.field], message: checked.error }],
    });
  }
  const { amountPaise, date } = checked;
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
    return sendApiError(req, res, 400, 'validation_failed', {
      details: parsed.error.errors.map((e) => ({ path: e.path, message: e.message })),
    });
  }

  const checked = validateAmountAndDate(parsed.data.amount, parsed.data.date);
  if (!checked.ok) {
    return sendApiError(req, res, 400, 'validation_failed', {
      details: [{ path: [checked.field], message: checked.error }],
    });
  }
  const { amountPaise, date } = checked;
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
  const idCheck = EntryIdSchema.safeParse(req.params.id);
  if (!idCheck.success) {
    return sendApiError(req, res, 400, 'validation_failed', {
      details: [{ path: ['id'], message: 'Invalid entry id' }],
    });
  }
  const entryId = idCheck.data;
  const sessionId = req.sessionId;

  // Verify ownership
  const entry = db.prepare('SELECT id, session_id FROM money_entries WHERE id = ?').get(entryId) as any;

  if (!entry) {
    return sendApiError(req, res, 404, 'not_found');
  }

  if (entry.session_id !== sessionId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this entry', code: 'forbidden' });
  }

  db.prepare('DELETE FROM money_entries WHERE id = ? AND session_id = ?').run(entryId, sessionId);

  res.json({ success: true, message: 'Entry deleted successfully' });
});

export default router;
