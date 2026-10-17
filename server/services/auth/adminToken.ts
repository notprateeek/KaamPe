import crypto from 'node:crypto';
import type { Response } from 'express';
import type { ServerEnv } from '../../config/env.js';
import { createSignedToken, verifySignedToken } from './credentials.js';

export const ADMIN_COOKIE_NAME = 'kaampe_admin';
const ADMIN_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // one working day

export const DEFAULT_ADMIN_PASSWORD = 'kaampe-admin';

export interface AdminAuth {
  /** False in production while ADMIN_PASSWORD is still the public default. */
  enabled: boolean;
  credentials: { username: string; password: string };
  /** Sets the signed admin cookie on the response. */
  issue: (res: Response) => void;
  clear: (res: Response) => void;
  verify: (token: unknown) => boolean;
}

/**
 * Admin session tokens, shared by /api/admin and the main sign-in form (admin
 * credentials typed there open the panel). One instance per app so both
 * routers sign with the same secret.
 */
export function createAdminAuth(env: ServerEnv): AdminAuth {
  // The documented default password is fine on a laptop but must never guard a public deploy.
  // Hosting platforms are detected too, in case NODE_ENV wasn't set to production there.
  const hosted = env.isProduction || !!(process.env.VERCEL || process.env.K_SERVICE || process.env.RENDER);
  const enabled = !(hosted && env.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD);
  if (!enabled) {
    console.warn('[KaamPe Server] Admin panel disabled: set ADMIN_PASSWORD (not the default) to enable it in production.');
  }
  // Without an explicit secret, derive a stable one from the credentials so tokens work across
  // serverless instances / restarts and rotate with the password. scrypt (not a fast hash) so a
  // leaked token can't be used to guess the password offline cheaply.
  const secret =
    env.ADMIN_TOKEN_SECRET ??
    crypto
      .scryptSync(`${env.ADMIN_USERNAME}\0${env.ADMIN_PASSWORD}`, 'kaampe-admin-token-v1', 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
      .toString('hex');
  const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: env.isProduction, path: '/api/admin' };

  return {
    enabled,
    credentials: { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD },
    issue: (res) =>
      res.cookie(ADMIN_COOKIE_NAME, createSignedToken(secret, ADMIN_TOKEN_TTL_MS), {
        ...cookieOptions,
        maxAge: ADMIN_TOKEN_TTL_MS,
      }),
    clear: (res) => res.clearCookie(ADMIN_COOKIE_NAME, cookieOptions),
    verify: (token) => enabled && verifySignedToken(token, secret),
  };
}
