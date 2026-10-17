import React, { useId, useRef, useState } from 'react';
import { CarFront, CloudRain, KeyRound, MoonStar, Phone, ShieldAlert, ShieldCheck, Sun, type LucideIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RichText } from '../../components/ui/RichText';
import { VoiceInputButton } from '../../components/voice/VoiceInputButton';
import { ReadAloudButton } from '../../components/speech/ReadAloudButton';
import type { Translations } from '../../i18n/translations';

type Situation = 'night' | 'rain' | 'heat' | 'harassment' | 'accident' | 'otp';

const SITUATIONS: { id: Situation; icon: LucideIcon }[] = [
  { id: 'night', icon: MoonStar },
  { id: 'rain', icon: CloudRain },
  { id: 'heat', icon: Sun },
  { id: 'harassment', icon: ShieldAlert },
  { id: 'accident', icon: CarFront },
  { id: 'otp', icon: KeyRound },
];

const MAX_CHARS = 1000;

interface SafetyAnswer {
  directAnswer: string;
  steps: string[];
  helplines: { id: string; label: string; number: string }[];
}

const situationText = (t: Translations, id: Situation) => t.safetyCoach.situations[id];

/**
 * Safety coach: pick a situation (or describe one, by voice or text) and get a
 * short checklist. Helplines always come from the trusted list on the server.
 */
export const SafetyCoach: React.FC = () => {
  const { t, profile } = useApp();
  const fieldId = useId();
  const [situation, setSituation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<SafetyAnswer | null>(null);
  const answerRef = useRef<HTMLHeadingElement>(null);

  const ask = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ situation: clean, language: profile.language }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || typeof body.directAnswer !== 'string') {
        throw new Error(typeof body?.error === 'string' ? body.error : t.common.error);
      }
      setAnswer({
        directAnswer: body.directAnswer,
        steps: Array.isArray(body.steps) ? body.steps.filter((s: unknown): s is string => typeof s === 'string') : [],
        helplines: Array.isArray(body.helplines) ? body.helplines : [],
      });
      requestAnimationFrame(() => answerRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  const readable = answer ? [answer.directAnswer, ...answer.steps].join('. ') : '';

  return (
    <div className="space-y-4">
      <Card className="bg-surface-1 border-2 border-ink shadow-offset-sm md:shadow-offset p-5 md:p-6">
        <h2 className="text-sm font-bold text-ink mb-1">{t.safetyCoach.title}</h2>
        <p className="text-xs text-ink-muted mb-4">{t.safetyCoach.intro}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(situation);
          }}
          className="space-y-4"
        >
          <fieldset>
            <legend className="text-sm font-semibold text-ink mb-2">{t.safetyCoach.quickLabel}</legend>
            <div className="flex flex-wrap gap-2">
              {SITUATIONS.map(({ id, icon: Icon }) => {
                const text = situationText(t, id);
                const pressed = situation === text;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setSituation(text)}
                    className={`inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      pressed ? 'bg-ink text-inverse border-ink' : 'bg-surface-1 text-ink border-hairline hover:border-ink'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {text}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor={fieldId} className="block text-sm font-semibold text-ink mb-1.5">
              {t.safetyCoach.situationLabel}
            </label>
            <div className="relative">
              <textarea
                id={fieldId}
                rows={3}
                maxLength={MAX_CHARS}
                value={situation}
                placeholder={t.safetyCoach.placeholder}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full bg-surface-1 text-ink placeholder:text-ink-tertiary border border-hairline rounded-xl px-3.5 pt-2.5 pb-12 text-base sm:text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent"
              />
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                <span aria-hidden="true" className="pl-1.5 text-[11px] tabular-nums text-ink-muted">
                  {situation.length}/{MAX_CHARS}
                </span>
                <VoiceInputButton
                  value={situation}
                  onChange={(next) => setSituation(next.slice(0, MAX_CHARS))}
                  controlsId={fieldId}
                  errorPlacement="top"
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-semantic-error">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={!situation.trim()} className="w-full gap-2">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            {busy ? t.safetyCoach.getting : t.safetyCoach.get}
          </Button>
        </form>
      </Card>

      {answer && (
        <Card className="bg-surface-1 border border-hairline p-5 space-y-3" aria-live="polite">
          <h3 ref={answerRef} tabIndex={-1} className="text-xs font-bold uppercase tracking-wider text-accent focus:outline-none">
            {t.safetyCoach.firstStep}
          </h3>
          <p className="text-base font-semibold text-ink leading-relaxed">
            <RichText text={answer.directAnswer} newTabLabel={t.trust.newTab} />
          </p>
          {answer.steps.length > 0 && (
            <ol className="list-decimal pl-5 space-y-1.5 text-[0.9375rem] text-ink leading-relaxed marker:font-bold marker:text-accent">
              {answer.steps.map((step, i) => (
                <li key={i}>
                  <RichText text={step} newTabLabel={t.trust.newTab} />
                </li>
              ))}
            </ol>
          )}
          <ReadAloudButton text={readable} />
          <p className="text-[11px] text-ink-muted">{t.trust.aiNote}</p>
        </Card>
      )}

      {answer && answer.helplines.length > 0 && (
        <Card className="bg-surface-1 border border-hairline p-5">
          <h3 className="text-sm font-bold text-ink mb-3">{t.safetyCoach.helplinesTitle}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {answer.helplines.map((h) => (
              <li key={h.id}>
                <a
                  href={`tel:${h.number}`}
                  className="flex items-center gap-3 min-h-[52px] rounded-subtle bg-surface-2 px-3 py-2 hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Phone className="w-4 h-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="text-lg font-extrabold tabular-nums text-ink min-w-[3.5rem]">{h.number}</span>
                  <span className="text-xs text-ink-muted leading-snug">{h.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
