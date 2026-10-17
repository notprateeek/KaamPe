import type { NextFunction, Request, Response } from 'express';
import { sendApiError } from './errorHandler.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * CSRF defence on top of SameSite cookies: a state-changing /api request that a
 * browser marks as coming from another site is refused with 403.
 *
 * - `Sec-Fetch-Site: cross-site` is always refused.
 * - An `Origin` header must match this server's host, or `allowedOrigin`
 *   (CORS_ORIGIN). Outside production any localhost origin is allowed, because
 *   the Vite dev server proxies from another port.
 * - Requests without `Origin` (curl, server-to-server, tests) pass: browsers
 *   always send it on cross-site POST/PUT/DELETE.
 */
export function createOriginCheck(options: { allowedOrigin?: string; isProduction: boolean }) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.get('sec-fetch-site') === 'cross-site') return sendApiError(req, res, 403, 'cross_site_blocked');

    const origin = req.get('origin');
    if (!origin) return next();

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      return sendApiError(req, res, 403, 'cross_site_blocked');
    }
    if (parsed.host === req.get('host')) return next();
    if (options.allowedOrigin && parsed.origin === new URL(options.allowedOrigin).origin) return next();
    if (!options.isProduction && LOCAL_HOSTS.has(parsed.hostname)) return next();
    return sendApiError(req, res, 403, 'cross_site_blocked');
  };
}
