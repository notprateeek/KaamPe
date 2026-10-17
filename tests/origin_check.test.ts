import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createOriginCheck } from '../server/middleware/originCheck';

function start(options: Parameters<typeof createOriginCheck>[0]) {
  const app = express();
  app.use('/api', createOriginCheck(options));
  app.all('/api/thing', (_req, res) => res.json({ ok: true }));
  return new Promise<{ server: Server; base: string }>((resolve) => {
    const server = app.listen(0, () => resolve({ server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }));
  });
}

describe('origin check (CSRF)', () => {
  let prod: { server: Server; base: string };
  let dev: { server: Server; base: string };

  beforeAll(async () => {
    prod = await start({ isProduction: true, allowedOrigin: 'https://kaampe.example.in' });
    dev = await start({ isProduction: false });
  });
  afterAll(() => {
    prod.server.close();
    dev.server.close();
  });

  const post = (base: string, headers: Record<string, string> = {}) => fetch(`${base}/api/thing`, { method: 'POST', headers });

  it('allows same-origin, configured-origin and Origin-less requests', async () => {
    expect((await post(prod.base, { Origin: prod.base })).status).toBe(200);
    expect((await post(prod.base, { Origin: 'https://kaampe.example.in' })).status).toBe(200);
    expect((await post(prod.base)).status).toBe(200);
  });

  it('blocks other sites with a localized 403', async () => {
    const res = await post(prod.base, { Origin: 'https://evil.example', 'Accept-Language': 'en' });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'cross_site_blocked' });
    expect((await post(prod.base, { Origin: 'null' })).status).toBe(403);
    expect((await post(prod.base, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
  });

  it('never blocks reads', async () => {
    expect((await fetch(`${prod.base}/api/thing`, { headers: { Origin: 'https://evil.example' } })).status).toBe(200);
  });

  it('allows the Vite dev proxy origin only outside production', async () => {
    expect((await post(dev.base, { Origin: 'http://localhost:5173' })).status).toBe(200);
    expect((await post(prod.base, { Origin: 'http://localhost:5173' })).status).toBe(403);
    expect((await post(dev.base, { Origin: 'https://evil.example' })).status).toBe(403);
  });
});
