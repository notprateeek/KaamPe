import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Clock,
  ExternalLink,
  Gavel,
  HandCoins,
  HeartPulse,
  Landmark,
  MessageCircleQuestion,
  Scale,
  ShieldCheck,
  Smartphone,
  Users,
  Flame,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReadAloudButton } from '../../components/speech/ReadAloudButton';
import { rightOfTheDay, type RightIcon, type RightTopic } from '../../content/rights';
import { SCHEMES } from '../../../shared/schemes';
import { fill, formatPaise, formatPaiseCompact, type WeeklySummary } from '../money/moneyUtils';

export const RIGHT_ICONS: Record<RightIcon, LucideIcon> = {
  wage: HandCoins,
  clock: Clock,
  shield: ShieldCheck,
  scale: Scale,
  heart: HeartPulse,
  users: Users,
  phone: Smartphone,
  gavel: Gavel,
};

/** Plain text of a rights topic for read-aloud. */
export function rightSpeech(topic: RightTopic, lang: 'hi' | 'en' | 'pa'): string {
  return [topic.title[lang], topic.summary[lang], ...topic.points.map((p) => p[lang])].join('\n');
}

/** "Know your rights" card: one topic a day, with Next, Listen and Ask. */
export const RightsTipCard: React.FC<{ onAsk: (prompt: string) => void; onOpenLibrary: () => void }> = ({
  onAsk,
  onOpenLibrary,
}) => {
  const { t, profile } = useApp();
  const lang = profile.language;
  const [offset, setOffset] = useState(0);
  const topic = rightOfTheDay(new Date(), offset);
  const Icon = RIGHT_ICONS[topic.icon];

  return (
    <section
      aria-labelledby="home-tip-title"
      className="relative overflow-hidden rounded-card border border-hairline bg-surface-1"
    >
      <div className="block-print h-2" aria-hidden="true" />
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 id="home-tip-title" className="text-sm font-semibold text-ink-muted">
            {t.insights.tipTitle}
          </h2>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            className="flex items-center gap-1 min-h-[40px] px-2.5 -mr-2 rounded-[10px] text-sm font-semibold text-accent hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t.insights.tipNext}
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-3 mt-1" aria-live="polite">
          <span className="w-11 h-11 rounded-full bg-accent-light text-accent flex items-center justify-center shrink-0" aria-hidden="true">
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-extrabold font-wide text-ink leading-tight">{topic.title[lang]}</p>
            <p className="text-[0.9375rem] text-ink mt-1 leading-snug">{topic.summary[lang]}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => onAsk(topic.ask[lang])}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full bg-ink text-inverse text-xs font-semibold hover:bg-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <MessageCircleQuestion className="w-4 h-4" aria-hidden="true" />
            {t.insights.tipAsk}
          </button>
          <ReadAloudButton text={rightSpeech(topic, lang)} lang={lang} />
          <button
            type="button"
            onClick={onOpenLibrary}
            className="inline-flex items-center gap-1 min-h-[44px] px-2 text-xs font-semibold text-accent hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t.insights.rightsTab}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

/** Schemes relevant to the worker's type of work (from the curated shared list). */
export const SchemesForYou: React.FC<{ onCheckEligibility: () => void }> = ({ onCheckEligibility }) => {
  const { t, profile } = useApp();
  const lang = profile.language;
  const schemes = SCHEMES.filter(
    (s) => !s.eligibility.workerTypes || s.eligibility.workerTypes.includes(profile.workerType)
  ).filter((s) => !s.eligibility.states || s.eligibility.states.includes(profile.state.toLowerCase()));

  if (!schemes.length) return null;

  return (
    <section aria-labelledby="home-schemes-title">
      <div className="flex items-end justify-between gap-2 mb-2 px-1">
        <div className="min-w-0">
          <h2 id="home-schemes-title" className="text-sm font-semibold text-ink-muted">
            {t.insights.schemesTitle}
          </h2>
          <p className="text-xs text-ink-muted">{t.insights.schemesHint}</p>
        </div>
        <button
          type="button"
          onClick={onCheckEligibility}
          className="shrink-0 flex items-center gap-1 min-h-[40px] px-2 rounded text-sm font-semibold text-accent hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t.insights.checkAll}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:overflow-visible">
        {schemes.map((s) => (
          <li
            key={s.id}
            className="relative snap-start shrink-0 w-[78%] max-w-[18rem] md:w-auto md:max-w-none flex flex-col rounded-card bg-surface-1 border border-hairline p-4"
          >
            <span className="w-9 h-9 rounded-full bg-wash text-ink flex items-center justify-center mb-2" aria-hidden="true">
              <Landmark className="w-[1.125rem] h-[1.125rem]" />
            </span>
            <p className="text-[0.9375rem] font-bold text-ink leading-tight">{s.name[lang]}</p>
            <p className="text-sm text-ink-muted mt-1 leading-snug flex-1">{s.benefit[lang]}</p>
            <a
              href={s.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 min-h-[40px] self-start text-sm font-semibold text-accent hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t.insights.officialSite}
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">: {s.name[lang]}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Compact 7-day earnings strip with best day and days worked. */
export const WeekPulse: React.FC<{ weekly: WeeklySummary | null; todayISO: string; onOpen: () => void }> = ({
  weekly,
  todayISO,
  onOpen,
}) => {
  const { t, profile } = useApp();
  if (!weekly) return null;
  const locale = profile.language === 'pa' ? 'pa-IN' : 'en-IN';
  const days = weekly.days;
  const max = Math.max(1, ...days.map((d) => d.earningsPaise));
  const worked = days.filter((d) => d.earningsPaise > 0).length;
  const best = days.reduce((a, b) => (b.earningsPaise > a.earningsPaise ? b : a), days[0]);
  const dayName = (iso: string, style: 'short' | 'long') =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { weekday: style });

  return (
    <section aria-labelledby="home-week-title" className="rounded-card border border-hairline bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="home-week-title" className="text-sm font-semibold text-ink-muted">
            {t.insights.weekTitle}
          </h2>
          {weekly.totalEarningsPaise > 0 ? (
            <p className="text-2xl font-extrabold font-wide text-ink tabular-nums leading-tight">
              {fill(t.insights.weekEarned, { amount: formatPaise(weekly.totalEarningsPaise) })}
            </p>
          ) : (
            <p className="text-[0.9375rem] text-ink mt-0.5">{t.insights.weekEmpty}</p>
          )}
        </div>
        {worked > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-accent-light text-accent">
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            {fill(t.insights.activeDays, { count: worked })}
          </span>
        )}
      </div>

      {weekly.totalEarningsPaise > 0 && (
        <>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`${t.insights.weekTitle}: ${fill(t.insights.weekEarned, { amount: formatPaise(weekly.totalEarningsPaise) })}`}
            className="mt-3 w-full flex items-end gap-1.5 h-20 rounded-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {days.map((d) => (
              <span key={d.date} className="flex-1 h-full flex flex-col justify-end items-center gap-1" aria-hidden="true">
                <span
                  className={`w-full rounded-t-[4px] ${d.date === todayISO ? 'bg-marigold' : d.earningsPaise ? 'bg-ink' : 'bg-hairline-soft'}`}
                  style={{ height: `${d.earningsPaise ? Math.max(8, (d.earningsPaise / max) * 100) : 4}%` }}
                  title={formatPaiseCompact(d.earningsPaise)}
                />
              </span>
            ))}
          </button>
          <div className="flex gap-1.5 mt-1" aria-hidden="true">
            {days.map((d) => (
              <span
                key={d.date}
                className={`flex-1 text-center text-[0.6875rem] ${d.date === todayISO ? 'font-bold text-ink' : 'text-ink-muted'}`}
              >
                {dayName(d.date, 'short').slice(0, 2)}
              </span>
            ))}
          </div>
          {best.earningsPaise > 0 && (
            <p className="mt-2 text-sm text-ink">
              {fill(t.insights.bestDay, { day: dayName(best.date, 'long'), amount: formatPaise(best.earningsPaise) })}
            </p>
          )}
        </>
      )}
    </section>
  );
};
