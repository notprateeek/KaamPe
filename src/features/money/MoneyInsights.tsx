import React, { useRef, useState } from 'react';
import { AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RichText } from '../../components/ui/RichText';
import { ReadAloudButton } from '../../components/speech/ReadAloudButton';

interface Insights {
  summary: string;
  tips: string[];
  warning?: string;
}

/**
 * "Get AI insights" for the last 30 days. Totals are computed by the server in
 * paise; the model only explains them, and any invented number falls back to
 * plain computed text.
 */
export const MoneyInsights: React.FC<{ hasEntries: boolean }> = ({ hasEntries }) => {
  const { t, profile } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/money-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: profile.language }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error(typeof body?.error === 'string' ? body.error : t.common.error);
      if (body.empty) {
        setEmpty(true);
        setInsights(null);
        return;
      }
      setEmpty(false);
      setInsights({
        summary: String(body.summary ?? ''),
        tips: Array.isArray(body.tips) ? body.tips.filter((x: unknown): x is string => typeof x === 'string') : [],
        warning: typeof body.warning === 'string' ? body.warning : undefined,
      });
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  const readable = insights ? [insights.summary, ...insights.tips, insights.warning ?? ''].filter(Boolean).join('. ') : '';

  return (
    <Card className="bg-surface-1 border border-hairline p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-ink flex items-center gap-2 focus:outline-none">
            <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
            {t.moneyInsights.title}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">{t.moneyInsights.intro}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={busy}
          disabled={!hasEntries}
          onClick={() => void load()}
        >
          {busy ? t.moneyInsights.getting : insights ? t.moneyInsights.refresh : t.moneyInsights.get}
        </Button>
      </div>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-semantic-error">
            {error}
          </p>
        )}
        {(empty || !hasEntries) && !insights && <p className="mt-3 text-xs text-ink-muted">{t.moneyInsights.empty}</p>}
        {insights && (
          <div className="mt-4 space-y-3">
            <p className="text-[0.9375rem] font-semibold text-ink leading-relaxed">
              <RichText text={insights.summary} />
            </p>
            {insights.tips.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">{t.moneyInsights.tipsTitle}</h3>
                <ul className="space-y-1.5">
                  {insights.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink leading-relaxed">
                      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                      <span>
                        <RichText text={tip} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.warning && (
              <p className="flex gap-2 rounded-subtle bg-surface-2 p-3 text-sm text-ink">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-semantic-error" aria-hidden="true" />
                <span>
                  <span className="sr-only">{t.moneyInsights.warningTitle}: </span>
                  {insights.warning}
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <ReadAloudButton text={readable} />
              <p className="text-[11px] text-ink-muted">{t.trust.aiNote}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
