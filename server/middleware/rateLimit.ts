import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { sendApiError } from './errorHandler.js';

export interface RateLimitOptions {
  /** Short label used in logs. */
  name: string;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed per key per window. */
  max: number;
  /** Derives the bucket key from a request. Defaults to client IP + guest session id. */
  keyGenerator?: (req: Request) => string;
  /** Upper bound on tracked keys; oldest buckets are evicted beyond this (memory safety). */
  maxKeys?: number;
  /** When false the middleware is a no-op. */
  enabled?: boolean;
  /** Emit RateLimit-* informational headers (Retry-After is always sent on 429). */
  standardHeaders?: boolean;
  /** Clock override for tests. */
  now?: () => number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export type RateLimiter = RequestHandler & { reset: () => void; size: () => number };

/** Default key: client IP (honours `trust proxy`) combined with the guest session id. */
export function clientKey(req: Request): string {
  return `${req.ip ?? req.socket.remoteAddress ?? 'unknown'}|${req.sessionId ?? '-'}`;
}

/** IP-only key, for coarse limits that hold even if a client rotates session ids. */
export function ipKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

/**
 * Dependency-free fixed-window rate limiter backed by a bounded in-memory Map.
 * Suitable for a single instance; a multi-instance deployment would move buckets to a shared store.
 * Responds 429 with `Retry-After` and `{ error, code: 'rate_limited', retryAfterSeconds }`.
 */
export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const {
    windowMs,
    max,
    keyGenerator = clientKey,
    maxKeys = 10_000,
    enabled = true,
    standardHeaders = true,
    now = Date.now,
  } = options;

  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error('rateLimit: windowMs must be > 0');
  if (!Number.isInteger(max) || max <= 0) throw new Error('rateLimit: max must be a positive integer');

  const buckets = new Map<string, Bucket>();

  function evict(currentTime: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= currentTime) buckets.delete(key);
    }
    // Still full: drop the oldest buckets (Map preserves insertion order = window start order).
    while (buckets.size >= maxKeys) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  }

  const middleware = ((req: Request, res: Response, next: NextFunction) => {
    if (!enabled) return next();

    const currentTime = now();
    const key = keyGenerator(req);
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= currentTime) {
      if (bucket) buckets.delete(key);
      if (buckets.size >= maxKeys) evict(currentTime);
      bucket = { count: 0, resetAt: currentTime + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));

    if (standardHeaders) {
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(resetSeconds));
    }

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      if (bucket.count === max + 1) {
        console.warn(`[RateLimit:${options.name}] limit exceeded`, { ip: req.ip, path: req.originalUrl });
      }
      return sendApiError(req, res, 429, 'rate_limited', { retryAfterSeconds: resetSeconds });
    }

    next();
  }) as RateLimiter;

  middleware.reset = () => buckets.clear();
  middleware.size = () => buckets.size;
  return middleware;
}
