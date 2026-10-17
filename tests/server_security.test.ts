import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createApp } from '../server/index';
import { loadEnv } from '../server/config/env';
import { errorHandler } from '../server/middleware/errorHandler';
import { db } from '../server/db/index';
import { hasMatchingMagicBytes } from '../server/routes/document';

let server: Server;
let base: string;
const createdSessions: string[] = [];

function newSessionId() {
  const id = 'vt_' + crypto.randomBytes(12).toString('hex');
  createdSessions.push(id);
  return id;
}

async function listen(app: express.Express): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as AddressInfo;
      resolve({ server: s, base: `http://127.0.0.1:${port}` });
    });
  });
}

function postJson(url: string, body: unknown, sessionId = newSessionId()) {
  return fetch(base + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeAll(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const env = loadEnv({ NODE_ENV: 'test', RATE_LIMIT_API_MAX: '1000', RATE_LIMIT_AI_MAX: '1000' });
  ({ server, base } = await listen(createApp(env)));
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const del = db.prepare('DELETE FROM sessions WHERE id = ?');
  const delEntries = db.prepare('DELETE FROM money_entries WHERE session_id = ?');
  for (const id of createdSessions) {
    delEntries.run(id);
    del.run(id);
  }
  vi.restoreAllMocks();
});

describe('Security headers', () => {
  it('sets CSP, frame, sniffing, referrer and permissions headers and hides x-powered-by', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('permissions-policy')).toContain('microphone=(self)');
    expect(res.headers.get('permissions-policy')).toContain('geolocation=(self)');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('sends HSTS only in production', async () => {
    expect((await fetch(`${base}/api/health`)).headers.get('strict-transport-security')).toBeNull();
    const prod = await listen(createApp(loadEnv({ NODE_ENV: 'production' })));
    try {
      const res = await fetch(`${prod.base}/api/health`);
      expect(res.headers.get('strict-transport-security')).toMatch(/max-age=\d+/);
    } finally {
      await new Promise<void>((resolve) => prod.server.close(() => resolve()));
    }
  });

  it('health check does not echo the session id', async () => {
    const id = newSessionId();
    const body = await (await fetch(`${base}/api/health`, { headers: { 'X-Session-ID': id } })).json();
    expect(JSON.stringify(body)).not.toContain(id);
    expect(body.status).toBe('ok');
  });

  it('unknown API routes return JSON 404, not the SPA shell', async () => {
    const res = await fetch(`${base}/api/does-not-exist`);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('not_found');
  });
});

describe('Error handling', () => {
  it('returns a generic 500 without leaking the internal error message', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new Error('SQLITE_CORRUPT at /srv/secret/path GEMINI_API_KEY=AIza123');
    });
    app.use(errorHandler);
    const s = await listen(app);
    try {
      const res = await fetch(`${s.base}/boom`);
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).not.toMatch(/SQLITE|secret|AIza|GEMINI/);
      expect(JSON.parse(text).code).toBe('internal_error');
    } finally {
      await new Promise<void>((resolve) => s.server.close(() => resolve()));
    }
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await postJson('/api/money/earning', '{"amount": 85');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('invalid_json');
    expect(JSON.stringify(body)).not.toMatch(/Unexpected|position/);
  });

  it('rejects oversized JSON bodies with 413', async () => {
    const res = await postJson('/api/money/earning', { amount: 10, note: 'x'.repeat(200 * 1024) });
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe('payload_too_large');
  });
});

describe('Money input validation', () => {
  it.each([
    ['exponent string "1e400"', '1e400'],
    ['infinite JSON number 1e400', null],
    ['negative', -5],
    ['negative string', '-5'],
    ['sub-paise', 0.001],
    ['three decimals string', '10.505'],
    ['zero', 0],
    ['above ₹10,00,000 cap', 1_000_001],
    ['non-numeric string', 'abc'],
    ['hex string', '0x10'],
    ['empty string', ''],
    ['boolean', true],
  ])('rejects %s with 400', async (_label, amount) => {
    const body = amount === null ? '{"amount":1e400}' : { amount };
    const res = await postJson('/api/money/earning', body);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('validation_failed');
  });

  it('accepts valid amounts and stores integer paise', async () => {
    const res = await postJson('/api/money/earning', { amount: '1,200.75', source: 'Swiggy' });
    expect(res.status).toBe(201);
    const { entry } = await res.json();
    expect(entry.amountPaise).toBe(120075);
    const res2 = await postJson('/api/money/expense', { amount: 0.29, category: 'Fuel' });
    expect(res2.status).toBe(201);
    expect((await res2.json()).entry.amountPaise).toBe(29);
  });

  it.each(['2026-02-30', '2026-13-01', '17-10-2026', '2099-01-01', '1999-12-31'])('rejects invalid or far-future date %s', async (date) => {
    const res = await postJson('/api/money/expense', { amount: 100, category: 'Fuel', date });
    expect(res.status).toBe(400);
  });

  it('validates DELETE ids and keeps 404/403 ownership semantics', async () => {
    const owner = newSessionId();
    const other = newSessionId();
    const created = await (await postJson('/api/money/earning', { amount: 850 }, owner)).json();
    const del = (id: string, sid: string) =>
      fetch(`${base}/api/money/entries/${id}`, { method: 'DELETE', headers: { 'X-Session-ID': sid } });

    expect((await del(encodeURIComponent("x' OR 1=1 --"), owner)).status).toBe(400);
    expect((await del('a'.repeat(200), owner)).status).toBe(400);
    expect((await del('entry_does_not_exist', owner)).status).toBe(404);
    expect((await del(created.entry.id, other)).status).toBe(403);
    expect((await del(created.entry.id, owner)).status).toBe(200);
  });
});

describe('Guest sessions', () => {
  it('does not persist a session row for read-only requests', async () => {
    const id = newSessionId();
    const res = await fetch(`${base}/api/money/summary`, { headers: { 'X-Session-ID': id } });
    expect(res.status).toBe(200);
    expect(db.prepare('SELECT id FROM sessions WHERE id = ?').get(id)).toBeUndefined();

    await postJson('/api/money/earning', { amount: 100 }, id);
    expect(db.prepare('SELECT id FROM sessions WHERE id = ?').get(id)).toBeDefined();
  });

  it('issues a random id when none (or an invalid one) is supplied, and does not reset an unchanged cookie', async () => {
    const res = await fetch(`${base}/api/session`, { headers: { 'X-Session-ID': 'bad id!' } });
    const issued = res.headers.get('x-session-id')!;
    expect(issued).toMatch(/^kp_[0-9a-f]{32}$/);
    expect(res.headers.get('set-cookie')).toContain(`kaampe_session_id=${issued}`);

    const again = await fetch(`${base}/api/session`, { headers: { Cookie: `kaampe_session_id=${issued}` } });
    expect(again.headers.get('x-session-id')).toBe(issued);
    expect(again.headers.get('set-cookie')).toBeNull();
  });
});

describe('Document upload hardening', () => {
  const uploadDir = path.resolve(__dirname, '../uploads_tmp');

  function upload(name: string, type: string, content: Buffer | string, language?: string) {
    const form = new FormData();
    if (language !== undefined) form.append('language', language);
    form.append('document', new Blob([typeof content === 'string' ? content : new Uint8Array(content)], { type }), name);
    return fetch(`${base}/api/document/explain`, { method: 'POST', body: form, headers: { 'X-Session-ID': newSessionId() } });
  }

  it('rejects a script disguised as a PDF (magic-byte mismatch) and deletes the temp file', async () => {
    const before = new Set(fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []);
    const res = await upload('invoice.pdf', 'application/pdf', '#!/bin/bash\necho pwned');
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('unsupported_file_type');
    const leftover = fs.readdirSync(uploadDir).filter((f) => !before.has(f));
    expect(leftover).toEqual([]);
  });

  it('rejects a PNG whose bytes are actually a JPEG', async () => {
    const res = await upload('photo.png', 'image/png', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]));
    expect(res.status).toBe(400);
  });

  it('accepts WebP by its RIFF....WEBP header and rejects other RIFF files (e.g. WAV) named .webp', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaampe-webp-'));
    try {
      const webp = path.join(dir, 'a.webp');
      const wav = path.join(dir, 'b.webp');
      fs.writeFileSync(webp, Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]));
      fs.writeFileSync(wav, Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]));
      expect(hasMatchingMagicBytes(webp, 'image/webp')).toBe(true);
      expect(hasMatchingMagicBytes(wav, 'image/webp')).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    const res = await upload('photo.webp', 'image/webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('unsupported_file_type');
  });

  it('rejects disallowed file types with 400', async () => {
    const res = await upload('run.sh', 'application/x-sh', '#!/bin/bash');
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('unsupported_file_type');
  });

  it('rejects files over 10MB with 413', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 10, 0x20);
    big.write('%PDF-1.4', 0, 'ascii');
    const res = await upload('big.pdf', 'application/pdf', big);
    expect(res.status).toBe(413);
  });

  it('rejects an unknown language with 400', async () => {
    const res = await upload('doc.pdf', 'application/pdf', '%PDF-1.4\n%%EOF', 'fr');
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('validation_failed');
  });
});
