import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createRateLimiter } from '../server/middleware/rateLimit';
import { createApp } from '../server/index';
import { loadEnv } from '../server/config/env';
import { db } from '../server/db/index';

describe('createRateLimiter (unit)', () => {
  function run(limiter: ReturnType<typeof createRateLimiter>, key: string) {
    const headers: Record<string, string> = {};
    let statusCode = 200;
    let body: any;
    let passed = false;
    const req = { ip: key, sessionId: 's', originalUrl: '/x', socket: {} } as any;
    const res = {
      setHeader: (k: string, v: string) => { headers[k] = v; },
      status(code: number) { statusCode = code; return this; },
      json(b: any) { body = b; return this; },
    } as any;
    limiter(req, res, () => { passed = true; });
    return { headers, statusCode, body, passed };
  }

  it('allows up to max requests per window, then 429s until the window resets', () => {
    let t = 1_000_000;
    const limiter = createRateLimiter({ name: 't', windowMs: 60_000, max: 2, now: () => t });
    expect(run(limiter, 'a').passed).toBe(true);
    expect(run(limiter, 'a').passed).toBe(true);
    const blocked = run(limiter, 'a');
    expect(blocked.passed).toBe(false);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['Retry-After']).toBe('60');
    expect(blocked.body).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 60 });
    expect(typeof blocked.body.error).toBe('string');

    // Other clients are unaffected
    expect(run(limiter, 'b').passed).toBe(true);

    t += 30_000;
    expect(run(limiter, 'a').headers['Retry-After']).toBe('30');
    t += 30_000;
    expect(run(limiter, 'a').passed).toBe(true);
  });

  it('bounds memory by evicting old buckets', () => {
    let t = 0;
    const limiter = createRateLimiter({ name: 't', windowMs: 1_000, max: 1, maxKeys: 100, now: () => t });
    for (let i = 0; i < 1_000; i++) run(limiter, `ip${i}`);
    expect(limiter.size()).toBeLessThanOrEqual(100);
    t += 2_000;
    run(limiter, 'fresh');
    expect(limiter.size()).toBeLessThanOrEqual(100);
  });

  it('is a no-op when disabled', () => {
    const limiter = createRateLimiter({ name: 't', windowMs: 1_000, max: 1, enabled: false });
    for (let i = 0; i < 5; i++) expect(run(limiter, 'a').passed).toBe(true);
  });

  it('rejects invalid configuration', () => {
    expect(() => createRateLimiter({ name: 't', windowMs: 0, max: 1 })).toThrow();
    expect(() => createRateLimiter({ name: 't', windowMs: 1000, max: 0 })).toThrow();
  });
});

describe('Rate limiting (integration)', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const env = loadEnv({ NODE_ENV: 'test', RATE_LIMIT_API_MAX: '3', RATE_LIMIT_AI_MAX: '1' });
    const app = createApp(env);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.prepare("DELETE FROM sessions WHERE id LIKE 'rl_test_session_%'").run();
  });

  it('returns 429 JSON with Retry-After once the general API limit is exceeded', async () => {
    const headers = { 'X-Session-ID': 'rl_test_session_general_01' };
    for (let i = 0; i < 3; i++) {
      expect((await fetch(`${base}/api/health`, { headers })).status).toBe(200);
    }
    const res = await fetch(`${base}/api/health`, { headers });
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    const body = await res.json();
    expect(body.code).toBe('rate_limited');
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('applies the stricter AI limit to /api/ai and /api/document', async () => {
    const headers = { 'X-Session-ID': 'rl_test_session_ai_000001', 'Content-Type': 'application/json' };
    // First call passes the limiter (and fails validation); second is throttled.
    const first = await fetch(`${base}/api/ai/confirm-money`, { method: 'POST', headers, body: '{}' });
    expect(first.status).not.toBe(429);
    const second = await fetch(`${base}/api/document/explain`, { method: 'POST', headers, body: '{}' });
    expect(second.status).toBe(429);
  });

  it('defaults to generous limits outside production and strict ones in production', () => {
    expect(loadEnv({ NODE_ENV: 'development' }).rateLimitApiMax).toBeGreaterThanOrEqual(1000);
    const prod = loadEnv({ NODE_ENV: 'production' });
    expect(prod.rateLimitApiMax).toBe(120);
    expect(prod.rateLimitAiMax).toBe(20);
    expect(prod.trustProxyHops).toBe(1);
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });
});
