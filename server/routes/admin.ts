import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { sendApiError } from '../middleware/errorHandler.js';
import { credentialsMatch } from '../services/auth/credentials.js';
import { ADMIN_COOKIE_NAME, type AdminAuth } from '../services/auth/adminToken.js';
import { DEMO_SESSION_PREFIX } from '../services/demo/seed.js';
import { addDaysToDateString, getTodayDateString } from '../services/money/calculator.js';

export { ADMIN_COOKIE_NAME };
const ACTIVITY_DAYS = 14;
const IST_OFFSET_MS = 330 * 60_000;

const LoginSchema = z.object({
  username: z.string().max(128),
  password: z.string().max(256),
});

/** IST calendar date (YYYY-MM-DD) of a millisecond timestamp. */
const istDate = (ms: number) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Only counts and coarse profile fields; never message text, notes or full session ids. */
function collectStats() {
  const now = Date.now();
  const today = getTodayDateString();
  const firstDay = addDaysToDateString(today, -(ACTIVITY_DAYS - 1));
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const demoLike = `${DEMO_SESSION_PREFIX}%`;
  const one = <T>(sql: string, ...params: Array<string | number>) => db.prepare(sql).get(...params) as T;
  const all = <T>(sql: string, ...params: Array<string | number>) => db.prepare(sql).all(...params) as T[];

  const totals = {
    sessions: one<{ n: number }>('SELECT COUNT(*) AS n FROM sessions').n,
    activeSessions7d: one<{ n: number }>('SELECT COUNT(*) AS n FROM sessions WHERE updated_at >= ?', weekAgo).n,
    demoSessions: one<{ n: number }>('SELECT COUNT(*) AS n FROM sessions WHERE id LIKE ?', demoLike).n,
    moneyEntries: one<{ n: number }>('SELECT COUNT(*) AS n FROM money_entries').n,
    earningsPaise: one<{ n: number | null }>("SELECT SUM(amount_paise) AS n FROM money_entries WHERE type = 'earning'").n ?? 0,
    expensesPaise: one<{ n: number | null }>("SELECT SUM(amount_paise) AS n FROM money_entries WHERE type = 'expense'").n ?? 0,
    conversations: one<{ n: number }>('SELECT COUNT(*) AS n FROM conversations').n,
    messages: one<{ n: number }>('SELECT COUNT(*) AS n FROM messages').n,
    documents: one<{ n: number }>('SELECT COUNT(*) AS n FROM documents').n,
  };

  const breakdown = (column: 'worker_type' | 'state' | 'language') =>
    all<{ key: string; count: number }>(
      `SELECT ${column} AS key, COUNT(*) AS count FROM sessions GROUP BY ${column} ORDER BY count DESC LIMIT 12`
    );

  // Daily activity (IST): new sessions and money entries logged
  const days = Array.from({ length: ACTIVITY_DAYS }, (_, i) => addDaysToDateString(firstDay, i));
  const sinceMs = Date.parse(`${firstDay}T00:00:00Z`) - IST_OFFSET_MS;
  const sessionDays = new Map<string, number>();
  for (const row of all<{ created_at: number }>('SELECT created_at FROM sessions WHERE created_at >= ?', sinceMs)) {
    const d = istDate(row.created_at);
    sessionDays.set(d, (sessionDays.get(d) ?? 0) + 1);
  }
  const entryDays = new Map(
    all<{ date: string; count: number }>(
      'SELECT date, COUNT(*) AS count FROM money_entries WHERE date >= ? GROUP BY date',
      firstDay
    ).map((r) => [r.date, r.count])
  );
  const activity = days.map((date) => ({
    date,
    newSessions: sessionDays.get(date) ?? 0,
    moneyEntries: entryDays.get(date) ?? 0,
  }));

  // What people ask about: the stored reply type of each assistant message
  const topics = all<{ key: string | null; count: number }>(`
    SELECT json_extract(structured_data, '$.type') AS key, COUNT(*) AS count
    FROM messages
    WHERE role = 'assistant' AND structured_data IS NOT NULL AND json_valid(structured_data)
    GROUP BY key ORDER BY count DESC LIMIT 10
  `).map((r) => ({ key: r.key ?? 'unknown', count: r.count }));

  const recentSessions = all<{
    id: string;
    worker_type: string;
    state: string;
    language: string;
    created_at: number;
    updated_at: number;
    entries: number;
  }>(`
    SELECT s.id, s.worker_type, s.state, s.language, s.created_at, s.updated_at,
           (SELECT COUNT(*) FROM money_entries m WHERE m.session_id = s.id) AS entries
    FROM sessions s ORDER BY s.updated_at DESC LIMIT 15
  `).map((r) => ({
    // Short, non-reversible label instead of the session id (which is a bearer credential)
    ref: crypto.createHash('sha256').update(r.id).digest('hex').slice(0, 8),
    isDemo: r.id.startsWith(DEMO_SESSION_PREFIX),
    workerType: r.worker_type,
    state: r.state,
    language: r.language,
    createdAt: r.created_at,
    lastActiveAt: r.updated_at,
    entries: r.entries,
  }));

  return {
    generatedAt: now,
    totals,
    byWorkerType: breakdown('worker_type'),
    byState: breakdown('state'),
    byLanguage: breakdown('language'),
    activity,
    topics,
    recentSessions,
  };
}

/**
 * Operator panel API (/api/admin). Mounted before the guest-session middleware,
 * so admin calls never create or touch worker sessions.
 */
export function createAdminRouter(admin: AdminAuth) {
  const router = Router();
  // Disabled (production with the default password): behave as if the panel doesn't exist.
  router.use((req, res, next) => (admin.enabled ? next() : sendApiError(req, res, 404, 'not_found')));

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (admin.verify(req.cookies?.[ADMIN_COOKIE_NAME])) return next();
    return sendApiError(req, res, 401, 'unauthorized');
  };

  router.post('/login', (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success || !credentialsMatch(parsed.data, admin.credentials)) {
      return sendApiError(req, res, 401, 'invalid_credentials');
    }
    admin.issue(res);
    res.json({ success: true });
  });

  router.post('/logout', (req, res) => {
    admin.clear(res);
    res.json({ success: true });
  });

  router.get('/me', requireAdmin, (req, res) => {
    res.json({ authenticated: true });
  });

  router.get('/stats', requireAdmin, (req, res) => {
    res.json(collectStats());
  });

  return router;
}
