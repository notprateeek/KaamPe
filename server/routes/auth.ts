import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import type { ServerEnv } from '../config/env.js';
import { db } from '../db/index.js';
import { SESSION_COOKIE_NAME, isValidSessionId, sessionCookieOptions } from '../middleware/session.js';
import { sendApiError } from '../middleware/errorHandler.js';
import {
  credentialsMatch,
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from '../services/auth/credentials.js';
import type { AdminAuth } from '../services/auth/adminToken.js';
import { createDemoSession, DEMO_PROFILE, isDemoSessionId } from '../services/demo/seed.js';

const Language = z.enum(['hi', 'en', 'pa']);

const LoginSchema = z.object({
  username: z.string().max(128),
  password: z.string().max(256),
  language: Language.optional(),
});

const SignupSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.]{3,32}$/, 'username'),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(60).optional(),
  language: Language.optional(),
});

interface AccountRow {
  id: string;
  username: string;
  display_name: string | null;
  password_hash: string;
  session_id: string;
}

/** Public account shape returned to the client. */
export function accountForSession(sessionId: string): { username: string; name: string | null } | null {
  const row = db
    .prepare('SELECT username, display_name FROM accounts WHERE session_id = ?')
    .get(sessionId) as { username: string; display_name: string | null } | undefined;
  return row ? { username: row.username, name: row.display_name } : null;
}

function setSession(res: Response, sessionId: string) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
  res.setHeader('X-Session-ID', sessionId);
}

const newSessionId = () => 'kp_' + crypto.randomBytes(16).toString('hex');

/** Tables whose rows belong to a session (besides `sessions` and `accounts`). */
const SESSION_OWNED_TABLES = ['money_entries', 'conversations', 'messages', 'documents'] as const;

/**
 * Moves a session's data to a brand-new id and returns it. The session id is the
 * bearer credential, so rotating it on sign-up / login / logout means an id that
 * was planted, shared or leaked earlier stops working. Call inside a transaction.
 */
function rotateSession(oldId: string, now: number): string {
  const nextId = newSessionId();
  db.prepare(
    `INSERT INTO sessions (id, language, worker_type, state, created_at, updated_at)
     SELECT ?, language, worker_type, state, created_at, ? FROM sessions WHERE id = ?`
  ).run(nextId, now, oldId);
  for (const table of SESSION_OWNED_TABLES) {
    db.prepare(`UPDATE ${table} SET session_id = ? WHERE session_id = ?`).run(nextId, oldId);
  }
  db.prepare('UPDATE accounts SET session_id = ? WHERE session_id = ?').run(nextId, oldId);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(oldId);
  return nextId;
}

function inTransaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Session id presented by this request (header first, then cookie), if well-formed. */
function presentedSessionId(req: Request): string | null {
  const header = req.headers['x-session-id'];
  const id = isValidSessionId(header) ? header : req.cookies?.[SESSION_COOKIE_NAME];
  return isValidSessionId(id) ? id : null;
}

function insertSession(sessionId: string, language: string, now: number) {
  db.prepare(
    `INSERT OR IGNORE INTO sessions (id, language, worker_type, state, created_at, updated_at)
     VALUES (?, ?, 'delivery', 'Punjab', ?, ?)`
  ).run(sessionId, language, now, now);
}

/** Current guest session from header/cookie whose data a new account may take over. */
function claimableGuestSession(req: Request): string | null {
  const id = presentedSessionId(req);
  if (!id || isDemoSessionId(id) || accountForSession(id)) return null;
  return db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(id) ? id : null;
}

function sessionPayload(sessionId: string) {
  const row = db
    .prepare('SELECT id, language, worker_type, state FROM sessions WHERE id = ?')
    .get(sessionId) as { id: string; language: string; worker_type: string; state: string } | undefined;
  return {
    id: sessionId,
    language: row?.language ?? 'hi',
    workerType: row?.worker_type ?? 'delivery',
    state: row?.state ?? 'Punjab',
    isDemo: isDemoSessionId(sessionId),
    account: accountForSession(sessionId),
  };
}

/**
 * Sign-in for the landing screen: one-tap demo, username/password accounts
 * (an account owns one session, so all existing session-scoped data and
 * checks keep working), and admin credentials that open the operator panel.
 * Mounted before the guest-session middleware: these routes replace the session.
 */
export function createAuthRouter(env: ServerEnv, admin: AdminAuth) {
  const router = Router();
  const demo = { username: env.DEMO_USERNAME, password: env.DEMO_PASSWORD };

  const startDemo = (res: Response, language: 'hi' | 'en' | 'pa') => {
    const sessionId = createDemoSession(language);
    setSession(res, sessionId);
    res.json({ success: true, kind: 'demo', session: { id: sessionId, language, ...DEMO_PROFILE, isDemo: true, account: null } });
  };

  // The demo credentials are meant to be shared (README, login screen).
  router.get('/demo', (req, res) => {
    if (!env.DEMO_LOGIN_ENABLED) return res.json({ enabled: false });
    res.json({ enabled: true, username: demo.username, password: demo.password });
  });

  // One tap: no credentials needed for the public demo.
  router.post('/demo', (req, res) => {
    if (!env.DEMO_LOGIN_ENABLED) return sendApiError(req, res, 404, 'not_found');
    const language = Language.safeParse(req.body?.language);
    startDemo(res, language.success ? language.data : 'hi');
  });

  router.post('/demo-login', (req, res) => {
    if (!env.DEMO_LOGIN_ENABLED) return sendApiError(req, res, 404, 'not_found');
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success || !credentialsMatch(parsed.data, demo)) {
      return sendApiError(req, res, 401, 'invalid_credentials');
    }
    startDemo(res, parsed.data.language ?? 'hi');
  });

  /** Accepts account, demo or admin credentials. */
  router.post('/login', (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return sendApiError(req, res, 401, 'invalid_credentials');
    const { username, password } = parsed.data;

    if (admin.enabled && credentialsMatch({ username, password }, admin.credentials)) {
      admin.issue(res);
      return res.json({ success: true, kind: 'admin', redirect: '/admin' });
    }
    if (env.DEMO_LOGIN_ENABLED && credentialsMatch({ username, password }, demo)) {
      return startDemo(res, parsed.data.language ?? 'hi');
    }

    const row = db
      .prepare('SELECT id, username, display_name, password_hash, session_id FROM accounts WHERE username = ?')
      .get(username.trim()) as AccountRow | undefined;
    const ok = verifyPassword(password, row?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (!row || !ok) return sendApiError(req, res, 401, 'invalid_credentials');

    // Fresh id on every login: earlier copies of the id (other devices, leaks) stop working.
    const now = Date.now();
    const sessionId = inTransaction(() => {
      db.prepare('UPDATE accounts SET last_login_at = ? WHERE id = ?').run(now, row.id);
      return rotateSession(row.session_id, now);
    });
    setSession(res, sessionId);
    res.json({ success: true, kind: 'account', session: sessionPayload(sessionId) });
  });

  router.post('/signup', (req, res) => {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, 'validation_failed', {
        fields: parsed.error.errors.map((e) => e.path[0]),
      });
    }
    const { username, password, name } = parsed.data;
    const language = parsed.data.language ?? 'hi';
    const reserved = [admin.credentials.username, demo.username].map((u) => u.toLowerCase());
    const taken =
      reserved.includes(username.toLowerCase()) ||
      !!db.prepare('SELECT 1 FROM accounts WHERE username = ?').get(username);
    if (taken) return sendApiError(req, res, 409, 'username_taken');

    // Keep anything already logged on this device, but under a new id: the old
    // (client-supplied) id must not become a key to the account.
    const now = Date.now();
    const guest = claimableGuestSession(req);
    const passwordHash = hashPassword(password);
    const sessionId = inTransaction(() => {
      let id: string;
      if (guest) {
        id = rotateSession(guest, now);
      } else {
        id = newSessionId();
        insertSession(id, language, now);
      }
      db.prepare(
        `INSERT INTO accounts (id, username, display_name, password_hash, session_id, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run('acct_' + crypto.randomUUID(), username, name || null, passwordHash, id, now, now);
      return id;
    });
    setSession(res, sessionId);
    res.status(201).json({ success: true, kind: 'account', session: sessionPayload(sessionId) });
  });

  // Leaves the current session (demo, account or guest) and starts a fresh guest one.
  // For an account, its data moves to a new id nobody holds, so the old id is revoked.
  router.post('/logout', (req, res) => {
    const current = presentedSessionId(req);
    if (current && accountForSession(current)) {
      inTransaction(() => rotateSession(current, Date.now()));
    }
    const sessionId = newSessionId();
    setSession(res, sessionId);
    res.json({ success: true, session: { id: sessionId, isDemo: false, account: null } });
  });

  return router;
}
