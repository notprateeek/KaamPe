import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { loadEnv } from '../server/config/env';
import { db } from '../server/db/index';
import { buildDemoEntries, DEMO_HISTORY_DAYS } from '../server/services/demo/seed';
import { createSignedToken, verifySignedToken } from '../server/services/auth/credentials';

let server: Server;
let base: string;
const demoSessions: string[] = [];
const createdUsernames: string[] = [];
const uniqueUser = () => {
  const u = 'u_' + Math.random().toString(36).slice(2, 10);
  createdUsernames.push(u);
  return u;
};

const env = loadEnv({
  NODE_ENV: 'test',
  RATE_LIMIT_ENABLED: 'false',
  DEMO_USERNAME: 'demo',
  DEMO_PASSWORD: 'demo-pass',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'admin-pass',
});

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

/** "name=value" for a Set-Cookie header with the given cookie name. */
const cookieFrom = (res: Response, name: string) =>
  res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))?.split(';')[0];

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = createApp(env).listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const id of demoSessions) db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  for (const u of createdUsernames) {
    const row = db.prepare('SELECT session_id FROM accounts WHERE username = ?').get(u) as { session_id: string } | undefined;
    if (row) db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
  }
});

describe('demo seed data', () => {
  it('builds integer-paise entries covering the history window, including today', () => {
    const entries = buildDemoEntries('2026-10-17');
    expect(entries.length).toBeGreaterThan(40);
    expect(entries.every((e) => Number.isInteger(e.amountPaise) && e.amountPaise > 0)).toBe(true);
    const dates = new Set(entries.map((e) => e.date));
    expect(dates.has('2026-10-17')).toBe(true);
    expect([...dates].every((d) => d >= '2026-09-27' && d <= '2026-10-17')).toBe(true);
    expect(dates.size).toBeLessThanOrEqual(DEMO_HISTORY_DAYS);
  });

  it('is deterministic', () => {
    expect(buildDemoEntries('2026-10-17')).toEqual(buildDemoEntries('2026-10-17'));
  });
});

describe('demo login', () => {
  it('rejects wrong credentials with 401 and no session switch', async () => {
    const res = await post('/api/auth/demo-login', { username: 'demo', password: 'nope' });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('invalid_credentials');
  });

  it('creates a fresh seeded demo session per login', async () => {
    const res = await post('/api/auth/demo-login', { username: 'Demo', password: 'demo-pass', language: 'en' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session).toMatchObject({ isDemo: true, workerType: 'delivery', state: 'Punjab', language: 'en' });
    const sessionId = res.headers.get('x-session-id')!;
    demoSessions.push(sessionId);
    expect(cookieFrom(res, 'kaampe_session_id')).toBe(`kaampe_session_id=${sessionId}`);

    const entries = await fetch(base + '/api/money/entries', { headers: { 'X-Session-ID': sessionId } }).then((r) => r.json());
    expect(entries.entries.length).toBeGreaterThan(40);

    const session = await fetch(base + '/api/session', { headers: { 'X-Session-ID': sessionId } }).then((r) => r.json());
    expect(session.session.isDemo).toBe(true);

    const second = await post('/api/auth/demo-login', { username: 'demo', password: 'demo-pass' });
    demoSessions.push(second.headers.get('x-session-id')!);
    expect(second.headers.get('x-session-id')).not.toBe(sessionId);
  });

  it('logout issues a new guest session id', async () => {
    const res = await post('/api/auth/logout', {}, { 'X-Session-ID': 'kp_demo_aaaaaaaaaaaaaaaaaaaaaaaa' });
    const body = await res.json();
    expect(body.session.isDemo).toBe(false);
    expect(body.session.id).toMatch(/^kp_[0-9a-f]{32}$/);
  });
});

describe('admin panel API', () => {
  it('requires login for stats', async () => {
    const res = await fetch(base + '/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('rejects bad credentials', async () => {
    const res = await post('/api/admin/login', { username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects a forged token', async () => {
    const forged = createSignedToken('not-the-server-secret-at-all', 60_000);
    const res = await fetch(base + '/api/admin/stats', { headers: { Cookie: `kaampe_admin=${forged}` } });
    expect(res.status).toBe(401);
  });

  it('returns aggregate stats without session ids or message text after login', async () => {
    const login = await post('/api/admin/login', { username: 'admin', password: 'admin-pass' });
    expect(login.status).toBe(200);
    const cookie = cookieFrom(login, 'kaampe_admin')!;
    expect(cookie).toBeTruthy();

    const res = await fetch(base + '/api/admin/stats', { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.totals.sessions).toBeGreaterThan(0);
    expect(stats.activity).toHaveLength(14);
    const raw = JSON.stringify(stats);
    for (const id of demoSessions) expect(raw).not.toContain(id);
    expect(stats.recentSessions.every((s: { ref: string }) => /^[0-9a-f]{8}$/.test(s.ref))).toBe(true);
  });
});

describe('signed tokens', () => {
  it('expire and reject tampering', () => {
    const token = createSignedToken('secret-secret-secret', 1000, 1_000_000_000_000);
    expect(verifySignedToken(token, 'secret-secret-secret', 1_000_000_000_500)).toBe(true);
    expect(verifySignedToken(token, 'secret-secret-secret', 1_000_000_001_001)).toBe(false);
    expect(verifySignedToken(token.replace(/^\d/, '9'), 'secret-secret-secret', 1_000_000_000_500)).toBe(false);
    expect(verifySignedToken(undefined, 'secret-secret-secret')).toBe(false);
  });
});

describe('accounts', () => {
  it('signs up, signs in, and rejects wrong passwords', async () => {
    const username = uniqueUser();
    const signup = await post('/api/auth/signup', { username, password: 'longenough1', name: 'Ravi' });
    expect(signup.status).toBe(201);
    const created = await signup.json();
    expect(created.session.account).toEqual({ username, name: 'Ravi' });
    const sessionId = created.session.id;

    const wrong = await post('/api/auth/login', { username, password: 'nope-nope' });
    expect(wrong.status).toBe(401);

    const login = await post('/api/auth/login', { username: username.toUpperCase(), password: 'longenough1' });
    expect(login.status).toBe(200);
    const body = await login.json();
    expect(body.kind).toBe('account');
    expect(body.session.id).not.toBe(sessionId); // rotated on login

    const session = await fetch(base + '/api/session', { headers: { 'X-Session-ID': body.session.id } }).then((r) => r.json());
    expect(session.session.account.username).toBe(username);
  });

  it('rejects duplicate, reserved and malformed usernames and short passwords', async () => {
    const username = uniqueUser();
    expect((await post('/api/auth/signup', { username, password: 'longenough1' })).status).toBe(201);
    expect((await post('/api/auth/signup', { username, password: 'longenough1' })).status).toBe(409);
    expect((await post('/api/auth/signup', { username: 'admin', password: 'longenough1' })).status).toBe(409);
    expect((await post('/api/auth/signup', { username: 'a b', password: 'longenough1' })).status).toBe(400);
    expect((await post('/api/auth/signup', { username: uniqueUser(), password: 'short' })).status).toBe(400);
  });

  it('keeps guest data on sign-up but never adopts the client-supplied session id', async () => {
    const planted = 'kp_' + 'g'.repeat(26) + Math.random().toString(36).slice(2, 8);
    await post('/api/money/earning', { amount: 500, source: 'Swiggy' }, { 'X-Session-ID': planted });
    const signup = await post('/api/auth/signup', { username: uniqueUser(), password: 'longenough1' }, { 'X-Session-ID': planted });
    const { session } = await signup.json();
    expect(session.id).not.toBe(planted);

    const own = await fetch(base + '/api/money/entries', { headers: { 'X-Session-ID': session.id } }).then((r) => r.json());
    expect(own.entries).toHaveLength(1);
    const viaPlanted = await fetch(base + '/api/money/entries', { headers: { 'X-Session-ID': planted } }).then((r) => r.json());
    expect(viaPlanted.entries).toHaveLength(0);
    const who = await fetch(base + '/api/session', { headers: { 'X-Session-ID': planted } }).then((r) => r.json());
    expect(who.session.account).toBeNull();
  });

  it('rotates the session id on every login and revokes it on logout', async () => {
    const username = uniqueUser();
    const first = (await (await post('/api/auth/signup', { username, password: 'longenough1' })).json()).session.id;
    await post('/api/money/earning', { amount: 300 }, { 'X-Session-ID': first });

    const second = (await (await post('/api/auth/login', { username, password: 'longenough1' })).json()).session.id;
    expect(second).not.toBe(first);
    const stale = await fetch(base + '/api/money/entries', { headers: { 'X-Session-ID': first } }).then((r) => r.json());
    expect(stale.entries).toHaveLength(0);
    const live = await fetch(base + '/api/money/entries', { headers: { 'X-Session-ID': second } }).then((r) => r.json());
    expect(live.entries).toHaveLength(1);

    await post('/api/auth/logout', {}, { 'X-Session-ID': second });
    const afterLogout = await fetch(base + '/api/money/entries', { headers: { 'X-Session-ID': second } }).then((r) => r.json());
    expect(afterLogout.entries).toHaveLength(0);

    const third = (await (await post('/api/auth/login', { username, password: 'longenough1' })).json()).session.id;
    const back = await fetch(base + '/api/money/entries', { headers: { 'X-Session-ID': third } }).then((r) => r.json());
    expect(back.entries).toHaveLength(1);
  });

  it('opens the admin panel when admin credentials are typed into the main sign-in', async () => {
    const res = await post('/api/auth/login', { username: 'admin', password: 'admin-pass' });
    const body = await res.json();
    expect(body).toMatchObject({ kind: 'admin', redirect: '/admin' });
    const cookie = cookieFrom(res, 'kaampe_admin')!;
    expect((await fetch(base + '/api/admin/stats', { headers: { Cookie: cookie } })).status).toBe(200);
  });

  it('logs into the demo with the demo credentials too', async () => {
    const res = await post('/api/auth/login', { username: 'demo', password: 'demo-pass' });
    const body = await res.json();
    demoSessions.push(body.session.id);
    expect(body.kind).toBe('demo');
  });

  it('one-tap demo needs no credentials', async () => {
    const res = await post('/api/auth/demo', { language: 'pa' });
    const body = await res.json();
    demoSessions.push(body.session.id);
    expect(body.session).toMatchObject({ isDemo: true, language: 'pa' });
  });
});

describe('admin panel in production', () => {
  it('is disabled (404) while the password is the public default', async () => {
    const prodEnv = loadEnv({ NODE_ENV: 'production', RATE_LIMIT_ENABLED: 'false' });
    const prod = await new Promise<Server>((resolve) => {
      const s = createApp(prodEnv).listen(0, '127.0.0.1', () => resolve(s));
    });
    const prodBase = `http://127.0.0.1:${(prod.address() as AddressInfo).port}`;
    try {
      const res = await fetch(prodBase + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'kaampe-admin' }),
      });
      expect(res.status).toBe(404);
      const viaMain = await fetch(prodBase + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'kaampe-admin' }),
      });
      expect(viaMain.status).toBe(401);
    } finally {
      await new Promise<void>((resolve) => prod.close(() => resolve()));
    }
  });
});

describe('admin panel on a hosting platform without NODE_ENV=production', () => {
  it('is still disabled with the default password', async () => {
    process.env.VERCEL = '1';
    try {
      const app = createApp(loadEnv({ NODE_ENV: 'development', RATE_LIMIT_ENABLED: 'false' }));
      const srv = await new Promise<Server>((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      try {
        const res = await fetch(`http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/admin/stats`);
        expect(res.status).toBe(404);
      } finally {
        await new Promise<void>((resolve) => srv.close(() => resolve()));
      }
    } finally {
      delete process.env.VERCEL;
    }
  });
});
