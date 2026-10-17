import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/index.js';

export interface KaampeSession {
  id: string;
  language: 'hi' | 'en' | 'pa';
  workerType: string;
  state: string;
  createdAt: number;
  updatedAt: number;
}

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
      sessionProfile?: KaampeSession;
    }
  }
}

const COOKIE_NAME = 'kaampe_session_id';

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  let sessionId = req.headers['x-session-id'] || req.cookies?.[COOKIE_NAME];

  if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(sessionId)) {
    // Generate new cryptographically random 24-byte hex session id
    sessionId = 'kp_' + crypto.randomBytes(16).toString('hex');
  }

  // Ensure cookie is attached to response
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });

  // Also return in header for easy client / test access
  res.setHeader('X-Session-ID', sessionId);
  req.sessionId = sessionId;

  // Retrieve or create session in DB
  const stmt = db.prepare('SELECT id, language, worker_type, state, created_at, updated_at FROM sessions WHERE id = ?');
  const existing = stmt.get(sessionId) as any;

  const now = Date.now();
  if (!existing) {
    db.prepare(`
      INSERT INTO sessions (id, language, worker_type, state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, 'hi', 'delivery', 'Punjab', now, now);

    req.sessionProfile = {
      id: sessionId,
      language: 'hi',
      workerType: 'delivery',
      state: 'Punjab',
      createdAt: now,
      updatedAt: now,
    };
  } else {
    req.sessionProfile = {
      id: existing.id,
      language: existing.language,
      workerType: existing.worker_type,
      state: existing.state,
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
    };
  }

  next();
}
