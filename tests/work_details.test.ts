import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import crypto from 'node:crypto';
import { parseTrips, parseWorkHours } from '../server/services/money/calculator';
import { extractIntent, fallbackIntentExtraction } from '../server/services/ai/gemini';
import { createApp } from '../server/index';
import { loadEnv } from '../server/config/env';

vi.mock('../server/services/ai/gemini', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server/services/ai/gemini')>()),
  extractIntent: vi.fn(),
}));

let server: Server;
let base: string;
beforeAll(async () => {
  const app = createApp(loadEnv({ NODE_ENV: 'test', RATE_LIMIT_ENABLED: 'false' } as any));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => vi.mocked(extractIntent).mockReset());

const sid = () => `kp_${crypto.randomBytes(16).toString('hex')}`;
const post = (path: string, session: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-ID': session }, body: JSON.stringify(body) });

describe('parseTrips / parseWorkHours', () => {
  it('accepts blanks as null and valid values', () => {
    expect(parseTrips(undefined)).toBeNull();
    expect(parseTrips('')).toBeNull();
    expect(parseTrips('14')).toBe(14);
    expect(parseWorkHours(null)).toBeNull();
    expect(parseWorkHours('8.5')).toBe(510);
    expect(parseWorkHours(9)).toBe(540);
  });
  it('rejects bad values', () => {
    for (const bad of ['1.5', '-1', '1001', 'abc']) expect(() => parseTrips(bad)).toThrow();
    for (const bad of ['0', '25', '-2', 'x']) expect(() => parseWorkHours(bad)).toThrow();
  });
});

describe('fallback extraction', () => {
  it('reads deliveries and hours from a Hinglish note', () => {
    const intent = fallbackIntentExtraction('aaj 14 delivery, 9 ghante, Swiggy se 920 mile');
    expect(intent).toMatchObject({ intent: 'record_money', earning: { amount: 920, source: 'Swiggy', trips: 14, hours: 9 } });
  });
  it('leaves them out when not said', () => {
    expect(fallbackIntentExtraction('aaj 500 kamaye').earning).toEqual({ amount: 500, source: 'Earning' });
  });
});

describe('earnings with trips and hours', () => {
  it('POST /api/money/earning stores them and lists them back', async () => {
    const session = sid();
    const res = await post('/api/money/earning', session, { amount: 920, source: 'Swiggy', trips: 14, hours: '8.5' });
    expect(res.status).toBe(201);
    expect((await res.json()).entry).toMatchObject({ trips: 14, workMinutes: 510 });
    const list = await (await fetch(`${base}/api/money/entries`, { headers: { 'X-Session-ID': session } })).json();
    expect(list.entries[0]).toMatchObject({ trips: 14, workMinutes: 510 });
  });

  it('rejects impossible values with 400', async () => {
    expect((await post('/api/money/earning', sid(), { amount: 100, hours: 30 })).status).toBe(400);
    expect((await post('/api/money/earning', sid(), { amount: 100, trips: 2.5 })).status).toBe(400);
  });

  it('chat keeps trips/hours only if the worker said those numbers, and confirm-money saves them', async () => {
    vi.mocked(extractIntent).mockResolvedValue({
      intent: 'record_money',
      earning: { amount: 920, source: 'Swiggy', trips: 14, hours: 10 },
    } as any);
    const session = sid();
    const chat = await (await post('/api/ai/chat', session, { message: 'aaj 14 delivery, 920 mile', language: 'en' })).json();
    expect(chat.confirmation.earning).toMatchObject({ amountRupees: 920, trips: 14 });
    expect(chat.confirmation.earning.hours).toBeUndefined(); // "10" was never said

    const saved = await (await post('/api/ai/confirm-money', session, { earning: { amount: 920, source: 'Swiggy', trips: 14 } })).json();
    expect(saved.savedEntries[0]).toMatchObject({ trips: 14, workMinutes: null });
  });
});

describe('opt-in auto-save from chat', () => {
  it('saves right away when autoSave is on, returning ids for Undo', async () => {
    vi.mocked(extractIntent).mockResolvedValue({
      intent: 'record_money',
      earning: { amount: 920, source: 'Swiggy', trips: 14 },
      expense: { amount: 180, category: 'Fuel' },
    } as any);
    const session = sid();
    const body = await (await post('/api/ai/chat', session, { message: 'aaj 14 delivery, 920 mile, petrol 180', language: 'en', autoSave: true })).json();
    expect(body.type).toBe('saved');
    expect(body.savedEntries.map((e: { type: string }) => e.type)).toEqual(['earning', 'expense']);
    expect(body.updatedToday).toMatchObject({ earningsPaise: 92000, expensesPaise: 18000 });
    const list = await (await fetch(`${base}/api/money/entries`, { headers: { 'X-Session-ID': session } })).json();
    expect(list.entries).toHaveLength(2);
  });

  it('only shows the confirmation card when autoSave is off (the default)', async () => {
    vi.mocked(extractIntent).mockResolvedValue({ intent: 'record_money', earning: { amount: 500 } } as any);
    const session = sid();
    const body = await (await post('/api/ai/chat', session, { message: 'aaj 500 kamaye', language: 'en' })).json();
    expect(body.type).toBe('confirmation');
    const list = await (await fetch(`${base}/api/money/entries`, { headers: { 'X-Session-ID': session } })).json();
    expect(list.entries).toHaveLength(0);
  });

  it('falls back to the card when the extracted amount is invalid', async () => {
    vi.mocked(extractIntent).mockResolvedValue({ intent: 'record_money', earning: { amount: 50_000_000 } } as any);
    const body = await (await post('/api/ai/chat', sid(), { message: 'aaj 50000000 kamaye', language: 'en', autoSave: true })).json();
    expect(body.type).toBe('confirmation');
  });
});
