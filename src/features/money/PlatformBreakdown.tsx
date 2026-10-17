import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Store } from 'lucide-react';
import { PlatformStat, fill, formatPaise } from './moneyUtils';

/** Earnings per platform over the last 7 days, with estimated net per working day. */
export const PlatformBreakdown: React.FC<{ stats: PlatformStat[] }> = ({ stats }) => {
  const { t } = useApp();
  const named = stats.filter((s) => s.label);
  const best =
    named.length >= 2 ? named.reduce((a, b) => (b.netPerDayPaise > a.netPerDayPaise ? b : a)) : null;

  return (
    <Card className="bg-surface-1 border border-hairline p-4 md:p-5">
      <h2 className="text-sm font-semibold text-ink flex items-center gap-2 mb-3">
        <Store className="w-4 h-4 text-accent" aria-hidden="true" />
        <span>{t.money.platformTitle}</span>
      </h2>

      {stats.length === 0 ? (
        <p className="text-xs text-ink-muted">{t.money.chartEmpty}</p>
      ) : (
        <>
          <ul className="space-y-3">
            {stats.map((s) => (
              <li key={s.key} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm text-ink truncate">
                    {s.label ?? t.money.platformUnspecified}
                    {best?.key === s.key && (
                      <span className="ml-2 align-middle inline-block rounded-full bg-accent-light text-accent text-[10px] font-bold px-2 py-0.5">
                        {t.money.platformBest}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-semantic-success tabular-nums shrink-0">
                    {`${t.money.earned} ${formatPaise(s.earningsPaise)}`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-ink" style={{ width: `${s.sharePct}%` }} />
                </div>
                <p className="mt-1.5 text-ink-muted flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{fill(t.money.platformShare, { pct: s.sharePct })}</span>
                  <span>{fill(t.money.platformDays, { n: s.activeDays })}</span>
                  <span>{fill(t.money.platformEarnPerDay, { amount: formatPaise(s.earnPerDayPaise) })}</span>
                  <span className={`font-semibold ${s.netPerDayPaise < 0 ? 'text-semantic-error' : 'text-ink'}`}>
                    {fill(t.money.platformNetPerDay, { amount: formatPaise(s.netPerDayPaise) })}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 pt-3 border-t border-hairline-soft text-[11px] text-ink-muted leading-relaxed">
            {named.length === 0 ? t.money.platformEmpty : t.money.platformNote}
          </p>
        </>
      )}
    </Card>
  );
};
