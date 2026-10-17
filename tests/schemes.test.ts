import { afterEach, describe, expect, it, vi } from 'vitest';
import { SCHEMES, type SchemeLanguage } from '../shared/schemes';
import {
  matchSchemes,
  evaluateScheme,
  localizeMatches,
  localizeCheck,
  localizeReason,
  schemeDisclaimer,
  type SchemeProfile,
} from '../server/services/schemes/match';
import { isTrustedGovernmentDomain } from '../server/services/ai/gemini';
import { rupeesToPaise } from '../server/services/money/calculator';
import aiRouter from '../server/routes/ai';

const LANGS: SchemeLanguage[] = ['hi', 'en', 'pa'];
const scheme = (id: string) => SCHEMES.find((s) => s.id === id)!;
const ids = (profile: SchemeProfile) => matchSchemes(profile).map((m) => m.scheme.id);

describe('Scheme data integrity', () => {
  it('has unique ids and official https URLs on the trusted allowlist', () => {
    expect(new Set(SCHEMES.map((s) => s.id)).size).toBe(SCHEMES.length);
    for (const s of SCHEMES) {
      expect(s.officialUrl.startsWith('https://')).toBe(true);
      expect(isTrustedGovernmentDomain(s.officialUrl)).toBe(true);
    }
  });

  it('has non-empty names, benefits and checks in all three languages', () => {
    for (const s of SCHEMES) {
      for (const lang of LANGS) {
        expect(s.name[lang]?.trim()).toBeTruthy();
        expect(s.benefit[lang]?.trim()).toBeTruthy();
        for (const extra of s.extraChecks ?? []) expect(extra[lang]?.trim()).toBeTruthy();
        if (s.eligibility.workerTypeLabel) expect(s.eligibility.workerTypeLabel[lang]?.trim()).toBeTruthy();
      }
      // Punjabi strings are in Gurmukhi.
      expect(s.benefit.pa).toMatch(/[਀-੿]/);
    }
  });

  it('stores income limits as integer paise', () => {
    for (const s of SCHEMES) {
      const max = s.eligibility.maxMonthlyIncomePaise;
      if (max !== undefined) expect(Number.isInteger(max)).toBe(true);
    }
    expect(scheme('pm_sym').eligibility.maxMonthlyIncomePaise).toBe(rupeesToPaise(15000));
  });
});

describe('matchSchemes rules', () => {
  const full: SchemeProfile = {
    age: 30,
    monthlyIncomePaise: rupeesToPaise(12000),
    workerType: 'delivery',
    state: 'Punjab',
    hasEpfo: 'no',
    hasEsic: 'no',
    isIncomeTaxPayer: 'no',
  };

  it('matches the core schemes for a typical Punjab delivery worker', () => {
    const result = ids(full);
    expect(result).toEqual(expect.arrayContaining(['eshram', 'pm_sym', 'apy', 'pmsby', 'pmjjby', 'pmjay']));
    expect(result).not.toContain('punjab_bocw'); // not a construction worker
    expect(result).not.toContain('pm_svanidhi'); // not a street vendor
  });

  it('PM-SYM: age 18-40 inclusive boundaries', () => {
    expect(evaluateScheme(scheme('pm_sym'), { ...full, age: 18 })).not.toBeNull();
    expect(evaluateScheme(scheme('pm_sym'), { ...full, age: 40 })).not.toBeNull();
    expect(evaluateScheme(scheme('pm_sym'), { ...full, age: 17 })).toBeNull();
    expect(evaluateScheme(scheme('pm_sym'), { ...full, age: 41 })).toBeNull();
  });

  it('PM-SYM: income limit of ₹15,000 is inclusive and compared in paise', () => {
    expect(evaluateScheme(scheme('pm_sym'), { ...full, monthlyIncomePaise: rupeesToPaise(15000) })).not.toBeNull();
    expect(evaluateScheme(scheme('pm_sym'), { ...full, monthlyIncomePaise: rupeesToPaise(15000.01) })).toBeNull();
  });

  it('PM-SYM: excluded for EPFO, ESIC members and income-tax payers', () => {
    expect(evaluateScheme(scheme('pm_sym'), { ...full, hasEpfo: 'yes' })).toBeNull();
    expect(evaluateScheme(scheme('pm_sym'), { ...full, hasEsic: 'yes' })).toBeNull();
    expect(evaluateScheme(scheme('pm_sym'), { ...full, isIncomeTaxPayer: 'yes' })).toBeNull();
  });

  it('APY excludes income-tax payers; PMSBY/PMJJBY age limits', () => {
    expect(evaluateScheme(scheme('apy'), { ...full, isIncomeTaxPayer: 'yes' })).toBeNull();
    expect(evaluateScheme(scheme('pmsby'), { ...full, age: 70 })).not.toBeNull();
    expect(evaluateScheme(scheme('pmsby'), { ...full, age: 71 })).toBeNull();
    expect(evaluateScheme(scheme('pmjjby'), { ...full, age: 50 })).not.toBeNull();
    expect(evaluateScheme(scheme('pmjjby'), { ...full, age: 51 })).toBeNull();
  });

  it('e-Shram: 16-59, excluded for EPFO/ESIC', () => {
    expect(evaluateScheme(scheme('eshram'), { ...full, age: 16 })).not.toBeNull();
    expect(evaluateScheme(scheme('eshram'), { ...full, age: 59 })).not.toBeNull();
    expect(evaluateScheme(scheme('eshram'), { ...full, age: 60 })).toBeNull();
    expect(evaluateScheme(scheme('eshram'), { ...full, hasEsic: 'yes' })).toBeNull();
  });

  it('Punjab BOCW only for construction workers in Punjab', () => {
    expect(ids({ ...full, workerType: 'construction' })).toContain('punjab_bocw');
    expect(ids({ ...full, workerType: 'construction', state: 'Haryana' })).not.toContain('punjab_bocw');
    expect(ids({ ...full, workerType: 'construction', age: 61 })).not.toContain('punjab_bocw');
  });

  it('PM SVANidhi for street vendors', () => {
    expect(ids({ ...full, workerType: 'street_vendor' })).toContain('pm_svanidhi');
  });
});

describe('Unknown never excludes', () => {
  it('an empty profile keeps every scheme, with all criteria as needs-check', () => {
    const matches = matchSchemes({});
    expect(matches.map((m) => m.scheme.id).sort()).toEqual(SCHEMES.map((s) => s.id).sort());
    const pmsym = matches.find((m) => m.scheme.id === 'pm_sym')!;
    expect(pmsym.needsCheck.map((c) => c.code)).toEqual(expect.arrayContaining(['age', 'income', 'epfo', 'esic', 'taxpayer']));
  });

  it("'unknown' tri-state and 'other' worker type do not exclude", () => {
    const profile: SchemeProfile = { age: 30, hasEpfo: 'unknown', hasEsic: 'unknown', isIncomeTaxPayer: 'unknown', workerType: 'other' };
    const result = ids(profile);
    expect(result).toContain('pm_sym');
    expect(result).toContain('pm_svanidhi');
    expect(result).toContain('punjab_bocw');
    const svanidhi = matchSchemes(profile).find((m) => m.scheme.id === 'pm_svanidhi')!;
    expect(svanidhi.needsCheck.some((c) => c.code === 'worker_type')).toBe(true);
  });

  it('known values become reasons; more certain matches sort first', () => {
    const matches = matchSchemes({ age: 30, monthlyIncomePaise: rupeesToPaise(10000), hasEpfo: 'no', hasEsic: 'no', isIncomeTaxPayer: 'no', workerType: 'delivery', state: 'Punjab' });
    const pmsym = matches.find((m) => m.scheme.id === 'pm_sym')!;
    expect(pmsym.reasons.map((r) => r.code)).toEqual(['age_ok', 'income_ok', 'not_epfo', 'not_esic', 'not_taxpayer']);
    expect(pmsym.needsCheck.every((c) => c.code === 'extra')).toBe(true);
    // PM-JAY has only an "extra" check, so it ties with fully-confirmed schemes and keeps curated order.
    expect(matches[0].scheme.id).toBe('eshram');
  });
});

describe('Localization', () => {
  it.each(LANGS)('localizes every reason, check and disclaimer (%s)', (lang) => {
    const all = [...matchSchemes({}), ...matchSchemes({ age: 30, monthlyIncomePaise: 0, hasEpfo: 'no', hasEsic: 'no', isIncomeTaxPayer: 'no', workerType: 'construction', state: 'Punjab' })];
    for (const m of all) {
      for (const r of m.reasons) expect(localizeReason(r, lang).trim()).toBeTruthy();
      for (const c of m.needsCheck) expect(localizeCheck(c, lang).trim()).toBeTruthy();
    }
    const localized = localizeMatches(all, lang);
    for (const m of localized) {
      expect(Object.keys(m).sort()).toEqual(['benefit', 'id', 'name', 'needsCheck', 'officialUrl', 'reasons']);
      if (lang === 'pa') expect(m.benefit).toMatch(/[਀-੿]/);
    }
    expect(schemeDisclaimer(lang)).toContain('14434');
    expect(schemeDisclaimer(lang)).toContain('CSC');
  });

  it('formats the income limit in rupees for the user', () => {
    expect(localizeCheck({ code: 'income', maxPaise: rupeesToPaise(15000) }, 'en')).toBe('Monthly income must be ₹15,000 or less.');
  });
});

describe('POST /api/ai/schemes/eligibility', () => {
  const handler = aiRouter.stack.find((l: any) => l.route?.path === '/schemes/eligibility')!.route!.stack.at(-1)!.handle;
  function call(body: unknown, profile: any = { language: 'hi', workerType: 'delivery', state: 'Punjab' }) {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    handler({ body, sessionProfile: profile, sessionId: 'kp_test_session_123456' } as any, res as any, vi.fn());
    return res;
  }
  afterEach(() => vi.restoreAllMocks());

  it('returns localized matches and disclaimer per the contract', () => {
    const res = call({ age: 30, monthlyIncomeRupees: 12000, hasEpfo: 'no', hasEsic: 'no', isIncomeTaxPayer: 'no', language: 'pa' });
    expect(res.status).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.disclaimer).toContain('14434');
    expect(body.matches.length).toBeGreaterThan(0);
    for (const m of body.matches) {
      expect(typeof m.id).toBe('string');
      expect(m.name).toMatch(/[਀-੿]|PM/);
      expect(Array.isArray(m.reasons)).toBe(true);
      expect(Array.isArray(m.needsCheck)).toBe(true);
      expect(isTrustedGovernmentDomain(m.officialUrl)).toBe(true);
    }
    // Defaults to the session profile: delivery worker -> no BOCW.
    expect(body.matches.map((m: any) => m.id)).not.toContain('punjab_bocw');
  });

  it('uses request workerType over the session profile', () => {
    const res = call({ workerType: 'construction', state: 'Punjab', hasEpfo: 'unknown', hasEsic: 'unknown', isIncomeTaxPayer: 'unknown', language: 'en' });
    expect(res.json.mock.calls[0][0].matches.map((m: any) => m.id)).toContain('punjab_bocw');
  });

  it.each([
    { age: 13, hasEpfo: 'no', hasEsic: 'no', isIncomeTaxPayer: 'no', language: 'en' },
    { age: 30.5, hasEpfo: 'no', hasEsic: 'no', isIncomeTaxPayer: 'no', language: 'en' },
    { monthlyIncomeRupees: -1, hasEpfo: 'no', hasEsic: 'no', isIncomeTaxPayer: 'no', language: 'en' },
    { hasEpfo: 'maybe', hasEsic: 'no', isIncomeTaxPayer: 'no', language: 'en' },
    { hasEpfo: 'no', hasEsic: 'no', isIncomeTaxPayer: 'no', language: 'fr' },
  ])('rejects invalid input with 400 {error, message}: %j', (body) => {
    const res = call(body, { language: 'en' });
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(typeof payload.error).toBe('string');
    expect(typeof payload.message).toBe('string');
  });
});
