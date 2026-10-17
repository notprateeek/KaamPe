import { describe, it, expect } from 'vitest';
import { isTrustedGovernmentDomain, IntentSchema } from '../server/services/ai/gemini';
import { db } from '../server/db/index';

describe('Security & Validation Checks', () => {
  it('validates official government domains and rejects untrusted links', () => {
    // Trusted
    expect(isTrustedGovernmentDomain('https://eshram.gov.in/schemes')).toBe(true);
    expect(isTrustedGovernmentDomain('https://labour.gov.in/policies')).toBe(true);
    expect(isTrustedGovernmentDomain('https://myscheme.gov.in/schemes/pm-sym')).toBe(true);
    expect(isTrustedGovernmentDomain('https://bocw.punjab.gov.in/registration')).toBe(true);
    expect(isTrustedGovernmentDomain('https://pblabour.gov.in')).toBe(true);

    // Untrusted / Phishing / Fabricated
    expect(isTrustedGovernmentDomain('https://fake-eshram.com')).toBe(false);
    expect(isTrustedGovernmentDomain('https://punjab-schemes.xyz')).toBe(false);
    expect(isTrustedGovernmentDomain('https://google.com')).toBe(false);
    expect(isTrustedGovernmentDomain('invalid-url')).toBe(false);
  });

  it('allowlist matches by hostname with a dot boundary and rejects bypass tricks', () => {
    // Genuine government subdomains and official scheme portals
    expect(isTrustedGovernmentDomain('https://pmjay.gov.in')).toBe(true);
    expect(isTrustedGovernmentDomain('https://labour.punjab.gov.in/x')).toBe(true);
    expect(isTrustedGovernmentDomain('https://www.jansuraksha.gov.in')).toBe(true);
    expect(isTrustedGovernmentDomain('https://maandhan.in')).toBe(true);
    expect(isTrustedGovernmentDomain('https://ESHRAM.GOV.IN/')).toBe(true);
    expect(isTrustedGovernmentDomain('https://eshram.gov.in./')).toBe(true);

    // No dot boundary
    expect(isTrustedGovernmentDomain('https://evilgov.in')).toBe(false);
    expect(isTrustedGovernmentDomain('https://fakemaandhan.in')).toBe(false);
    expect(isTrustedGovernmentDomain('https://notnic.in')).toBe(false);
    // Allowlisted name used as a prefix of an attacker domain
    expect(isTrustedGovernmentDomain('https://gov.in.evil.com')).toBe(false);
    expect(isTrustedGovernmentDomain('https://eshram.gov.in.attacker.example/login')).toBe(false);
    // Userinfo tricks
    expect(isTrustedGovernmentDomain('https://eshram.gov.in@evil.com')).toBe(false);
    expect(isTrustedGovernmentDomain('https://user:pass@eshram.gov.in')).toBe(false);
    // Scheme / port / path tricks
    expect(isTrustedGovernmentDomain('http://eshram.gov.in')).toBe(false);
    expect(isTrustedGovernmentDomain('javascript://eshram.gov.in/%0aalert(1)')).toBe(false);
    expect(isTrustedGovernmentDomain('https://eshram.gov.in:8443/')).toBe(false);
    expect(isTrustedGovernmentDomain('https://evil.com/eshram.gov.in')).toBe(false);
    expect(isTrustedGovernmentDomain('https://evil.com?u=https://eshram.gov.in')).toBe(false);
    expect(isTrustedGovernmentDomain('https://evil.com#eshram.gov.in')).toBe(false);
    expect(isTrustedGovernmentDomain('//eshram.gov.in')).toBe(false);
    expect(isTrustedGovernmentDomain('https://127.0.0.1')).toBe(false);
    expect(isTrustedGovernmentDomain('')).toBe(false);
  });

  it('validates structured AI intent schemas using Zod', () => {
    const validMoney = {
      intent: 'record_money',
      earning: { amount: 850, source: 'Swiggy' },
      expense: { amount: 200, category: 'Fuel' },
    };
    expect(IntentSchema.safeParse(validMoney).success).toBe(true);

    const validDispute = {
      intent: 'grievance',
      dispute: { amount: 3200, days: 8 },
    };
    expect(IntentSchema.safeParse(validDispute).success).toBe(true);

    // Malformed intent
    const invalid = {
      intent: 'unknown_action_type',
    };
    expect(IntentSchema.safeParse(invalid).success).toBe(false);

    // Negative amount rejected
    const negative = {
      intent: 'record_money',
      earning: { amount: -500 },
    };
    expect(IntentSchema.safeParse(negative).success).toBe(false);
  });

  it('enforces strict cross-session ownership in database', () => {
    const sessionA = 'test_sess_A_' + Date.now();
    const sessionB = 'test_sess_B_' + Date.now();
    const now = Date.now();

    // Create sessions
    db.prepare(`
      INSERT INTO sessions (id, language, worker_type, state, created_at, updated_at)
      VALUES (?, 'hi', 'delivery', 'Punjab', ?, ?)
    `).run(sessionA, now, now);

    db.prepare(`
      INSERT INTO sessions (id, language, worker_type, state, created_at, updated_at)
      VALUES (?, 'hi', 'driver', 'Delhi', ?, ?)
    `).run(sessionB, now, now);

    // Session A creates a money entry
    const entryId = 'test_entry_' + Date.now();
    db.prepare(`
      INSERT INTO money_entries (id, session_id, type, amount_paise, category_or_source, note, date, created_at, updated_at)
      VALUES (?, ?, 'earning', 85000, 'Swiggy', NULL, '2026-10-17', ?, ?)
    `).run(entryId, sessionA, now, now);

    // Session B attempts to read Session A's entry
    const resultForB = db.prepare(`
      SELECT * FROM money_entries WHERE id = ? AND session_id = ?
    `).get(entryId, sessionB);

    expect(resultForB).toBeUndefined();

    // Session A reads its own entry
    const resultForA = db.prepare(`
      SELECT * FROM money_entries WHERE id = ? AND session_id = ?
    `).get(entryId, sessionA) as any;

    expect(resultForA).toBeDefined();
    expect(resultForA.id).toBe(entryId);
    expect(resultForA.amount_paise).toBe(85000);
  });
});
