import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { isDemoSessionId } from '../services/demo/seed.js';

export interface KaampeSession {
  id: string;
  language: 'hi' | 'en' | 'pa';
  workerType: string;
  state: string;
  createdAt: number;
  updatedAt: number;
  /** Seeded demo account (see services/demo/seed.ts). */
  isDemo?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
      sessionProfile?: KaampeSession;
    }
  }
}

export const SESSION_COOKIE_NAME = 'kaampe_session_id';
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{16,64}$/;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Methods that never write data; they don't need a persisted session row. */
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

/** Options for the httpOnly guest-session cookie (also used by demo login / logout). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}

function defaultProfile(id: string, now: number): KaampeSession {
  return { id, language: 'hi', workerType: 'delivery', state: 'Punjab', createdAt: now, updatedAt: now };
}

/**
 * Guest session middleware (no auth). Identity comes from the `X-Session-ID` header
 * or the httpOnly `kaampe_session_id` cookie; otherwise a random id is issued.
 *
 * - The sessions row is created lazily on the first state-changing request
 *   (POST/PUT/PATCH/DELETE), so anonymous page loads and GETs with arbitrary ids
 *   never grow the database.
 * - The cookie is only (re)written when its value changes.
 */
export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerId = req.headers['x-session-id'];
  const cookieId = req.cookies?.[SESSION_COOKIE_NAME];

  let sessionId: string;
  let isNewId = false;
  if (isValidSessionId(headerId)) {
    sessionId = headerId;
  } else if (isValidSessionId(cookieId)) {
    sessionId = cookieId;
  } else {
    // Cryptographically random 128-bit id
    sessionId = 'kp_' + crypto.randomBytes(16).toString('hex');
    isNewId = true;
  }

  if (cookieId !== sessionId) {
    res.cookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
  }

  // Also return in header for easy client / test access
  res.setHeader('X-Session-ID', sessionId);
  req.sessionId = sessionId;

  const existing = isNewId
    ? undefined
    : (db
        .prepare('SELECT id, language, worker_type, state, created_at, updated_at FROM sessions WHERE id = ?')
        .get(sessionId) as any);

  if (existing) {
    req.sessionProfile = {
      id: existing.id,
      language: existing.language,
      workerType: existing.worker_type,
      state: existing.state,
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
      ...(isDemoSessionId(existing.id) ? { isDemo: true } : {}),
    };
    return next();
  }

  const now = Date.now();
  req.sessionProfile = defaultProfile(sessionId, now);

  if (!READ_ONLY_METHODS.has(req.method)) {
    // Money entries / conversations reference sessions(id), so persist before any write.
    db.prepare(`
      INSERT OR IGNORE INTO sessions (id, language, worker_type, state, created_at, updated_at)
      VALUES (?, 'hi', 'delivery', 'Punjab', ?, ?)
    `).run(sessionId, now, now);
  }

  next();
}
