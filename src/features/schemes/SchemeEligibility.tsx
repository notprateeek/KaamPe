import React, { useEffect, useId, useRef, useState } from 'react';
import { useApp, UserProfile } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { INDIAN_STATES, WORKER_TYPES } from '../../constants/profile';
import { ArrowRight, CheckCircle2, ExternalLink, Info, Landmark, ListChecks } from 'lucide-react';

type TriState = 'yes' | 'no' | 'unknown';

export interface SchemeMatch {
  id: string;
  name: string;
  benefit: string;
  reasons: string[];
  needsCheck: string[];
  officialUrl: string;
}

interface EligibilityResult {
  matches: SchemeMatch[];
  disclaimer: string;
}

const selectClass =
  'w-full bg-surface-1 text-ink border border-hairline rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent';
const fieldLabelClass = 'block text-sm font-semibold text-ink mb-1.5';

const safeHttpUrl = (url: unknown): string | null => {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
};

const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Yes / No / Don't know radio group rendered as a segmented control. */
const TriStateGroup: React.FC<{
  name: string;
  legend: string;
  hint?: string;
  value: TriState;
  onChange: (v: TriState) => void;
}> = ({ name, legend, hint, value, onChange }) => {
  const { t } = useApp();
  const hintId = useId();
  const options: Array<{ v: TriState; label: string }> = [
    { v: 'yes', label: t.schemes.yes },
    { v: 'no', label: t.schemes.no },
    { v: 'unknown', label: t.schemes.unknown },
  ];
  return (
    <fieldset aria-describedby={hint ? hintId : undefined}>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted mt-0.5">
          {hint}
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <label key={o.v} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.v}
              checked={value === o.v}
              onChange={() => onChange(o.v)}
              className="peer sr-only"
            />
            <span className="flex min-h-[44px] items-center justify-center rounded-xl border border-hairline bg-surface-1 px-2 text-center text-sm font-medium text-ink transition-colors hover:bg-surface-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export const SchemeEligibility: React.FC<{ onAskAboutScheme?: (prompt: string) => void }> = ({ onAskAboutScheme }) => {
  const { t, profile } = useApp();
  const [age, setAge] = useState('');
  const [income, setIncome] = useState('');
  const [workerType, setWorkerType] = useState<UserProfile['workerType']>(profile.workerType);
  const [state, setState] = useState(profile.state);
  const [hasEpfo, setHasEpfo] = useState<TriState>('unknown');
  const [hasEsic, setHasEsic] = useState<TriState>('unknown');
  const [isIncomeTaxPayer, setIsIncomeTaxPayer] = useState<TriState>('unknown');
  const [touchedProfile, setTouchedProfile] = useState(false);

  const [ageError, setAgeError] = useState('');
  const [incomeError, setIncomeError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  // Keep prefilled profile values in sync (session sync can land after mount) until the user edits them
  useEffect(() => {
    if (touchedProfile) return;
    setWorkerType(profile.workerType);
    setState(profile.state);
  }, [profile.workerType, profile.state, touchedProfile]);

  useEffect(() => {
    if (result && !isLoading) resultsHeadingRef.current?.focus();
  }, [result, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let valid = true;

    let ageNum: number | undefined;
    if (age.trim()) {
      ageNum = Number(age.trim());
      if (!/^\d{1,3}$/.test(age.trim()) || ageNum < 14 || ageNum > 100) {
        setAgeError(t.schemes.errorAge);
        valid = false;
      } else setAgeError('');
    } else setAgeError('');

    let incomeNum: number | undefined;
    const incomeClean = income.replace(/,/g, '').trim();
    if (incomeClean) {
      incomeNum = Number(incomeClean);
      if (!/^\d{1,9}(\.\d{1,2})?$/.test(incomeClean) || !Number.isFinite(incomeNum)) {
        setIncomeError(t.schemes.errorIncome);
        valid = false;
      } else setIncomeError('');
    } else setIncomeError('');

    if (!valid) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/schemes/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          age: ageNum,
          monthlyIncomeRupees: incomeNum,
          workerType,
          state,
          hasEpfo,
          hasEsic,
          isIncomeTaxPayer,
          language: profile.language,
        }),
      });
      const body = await res.json().catch(() => null);

      // Server errors are `{ error: <localized message>, code, ...extra }`
      const serverMessage = typeof body?.error === 'string' && body.error.trim() ? body.error : null;
      if (res.status === 429) {
        const seconds = Number(body?.retryAfterSeconds ?? res.headers.get('Retry-After')) || 30;
        setError(serverMessage ?? t.schemes.errorRateLimit.replace('{seconds}', String(Math.ceil(seconds))));
        return;
      }
      if (res.status === 400) {
        setError(serverMessage ?? t.schemes.errorInvalid);
        return;
      }
      if (!res.ok || !body || !Array.isArray(body.matches)) {
        setError(serverMessage ?? t.common.error);
        return;
      }

      setResult({
        matches: body.matches
          .filter((m: any) => m && typeof m.name === 'string')
          .map((m: any, i: number) => ({
            id: typeof m.id === 'string' ? m.id : `scheme-${i}`,
            name: m.name,
            benefit: typeof m.benefit === 'string' ? m.benefit : '',
            reasons: asStringArray(m.reasons),
            needsCheck: asStringArray(m.needsCheck),
            officialUrl: typeof m.officialUrl === 'string' ? m.officialUrl : '',
          })),
        disclaimer: typeof body.disclaimer === 'string' ? body.disclaimer : '',
      });
    } catch {
      setError(t.schemes.errorNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="bg-surface-1 border-2 border-ink shadow-offset-sm md:shadow-offset p-5 md:p-6 lg:sticky lg:top-8">
        <h2 className="text-sm font-bold text-ink mb-1">{t.schemes.title}</h2>
        <p className="text-xs text-ink-muted mb-4">{t.schemes.intro}</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-ink mb-2">{t.schemes.aboutYouLegend}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="scheme-age"
                label={t.schemes.ageLabel}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={3}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                error={ageError || undefined}
              />
              <Input
                id="scheme-income"
                label={t.schemes.incomeLabel}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                maxLength={12}
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                error={incomeError || undefined}
              />
            </div>
            <p className="text-[11px] text-ink-muted -mt-1">{t.schemes.optionalHint}</p>

            <div>
              <label htmlFor="scheme-worker" className={fieldLabelClass}>
                {t.schemes.workerTypeLabel}
              </label>
              <select
                id="scheme-worker"
                value={workerType}
                onChange={(e) => {
                  setTouchedProfile(true);
                  setWorkerType(e.target.value as UserProfile['workerType']);
                }}
                className={selectClass}
              >
                {WORKER_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {t.onboarding.workerTypes[w]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scheme-state" className={fieldLabelClass}>
                {t.schemes.stateLabel}
              </label>
              <select
                id="scheme-state"
                value={state}
                onChange={(e) => {
                  setTouchedProfile(true);
                  setState(e.target.value);
                }}
                className={selectClass}
              >
                {(INDIAN_STATES.includes(state) ? INDIAN_STATES : [state, ...INDIAN_STATES]).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <TriStateGroup name="scheme-epfo" legend={t.schemes.epfoLegend} hint={t.schemes.epfoHint} value={hasEpfo} onChange={setHasEpfo} />
          <TriStateGroup name="scheme-esic" legend={t.schemes.esicLegend} hint={t.schemes.esicHint} value={hasEsic} onChange={setHasEsic} />
          <TriStateGroup name="scheme-tax" legend={t.schemes.taxLegend} value={isIncomeTaxPayer} onChange={setIsIncomeTaxPayer} />

          {error && (
            <p className="text-xs text-semantic-error font-medium" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="accent" size="md" fullWidth isLoading={isLoading}>
            {isLoading ? t.schemes.checking : t.schemes.submit}
          </Button>
        </form>
      </Card>

      {/* RESULTS */}
      <section aria-label={t.schemes.resultsRegionLabel} aria-live="polite" aria-busy={isLoading} className="space-y-3">
        {!result && (
          <div className="hidden lg:flex flex-col items-center justify-center text-center gap-3 rounded-card border border-dashed border-hairline p-10 min-h-[280px]">
            <div className="w-10 h-10 rounded-full bg-surface-2 text-ink-muted flex items-center justify-center">
              <Landmark className="w-5 h-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-ink-muted max-w-xs">{t.schemes.placeholder}</p>
          </div>
        )}

        {result && (
          <>
            <h3
              id={headingId}
              ref={resultsHeadingRef}
              tabIndex={-1}
              className="text-sm font-bold text-ink px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-subtle"
            >
              {result.matches.length > 0
                ? t.schemes.resultsTitle.replace('{n}', String(result.matches.length))
                : t.schemes.noMatches}
            </h3>

            {result.matches.length > 0 && (
              <ul className="space-y-3" aria-labelledby={headingId}>
                {result.matches.map((m) => {
                  const url = safeHttpUrl(m.officialUrl);
                  return (
                    <li key={m.id}>
                      <Card className="bg-surface-1 border border-hairline p-4">
                        <h4 className="text-base font-bold text-ink leading-snug">{m.name}</h4>
                        {m.benefit && (
                          <p className="mt-1 text-sm text-ink">
                            <span className="font-semibold text-accent">{t.schemes.benefitLabel}: </span>
                            {m.benefit}
                          </p>
                        )}

                        {m.reasons.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-semibold text-semantic-success flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              {t.schemes.whyQualify}
                            </h5>
                            <ul className="mt-1.5 space-y-1 text-xs text-ink list-disc pl-5">
                              {m.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {m.needsCheck.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-semibold text-ink-muted flex items-center gap-1.5">
                              <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
                              {t.schemes.pleaseCheck}
                            </h5>
                            <ul className="mt-1.5 space-y-1 text-xs text-ink list-disc pl-5">
                              {m.needsCheck.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-hairline bg-surface-1 px-3.5 text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <span>{t.schemes.officialLink}</span>
                              <span className="sr-only">
                                {`: ${m.name} ${t.schemes.opensNewTab}`}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            </a>
                          )}
                          {onAskAboutScheme && (
                            <Button
                              variant="ghost"
                              size="md"
                              onClick={() => onAskAboutScheme(t.schemes.askPrompt.replace('{scheme}', m.name))}
                              className="gap-1"
                            >
                              <span>{t.schemes.askAbout}</span>
                              <span className="sr-only">: {m.name}</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}

            {result.disclaimer && (
              <Card className="bg-surface-2 border border-hairline-soft p-3.5">
                <p className="text-xs text-ink leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 shrink-0 text-ink-muted mt-px" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{t.schemes.disclaimerTitle}: </span>
                    {result.disclaimer}
                  </span>
                </p>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
};
