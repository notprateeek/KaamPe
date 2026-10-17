import React from 'react';

export interface ChartDay {
  date: string; // YYYY-MM-DD
  earningsPaise: number;
  expensesPaise: number;
  netPaise: number;
  entryCount: number;
}

interface WeeklyBarChartProps {
  days: ChartDay[];
  /** Date (YYYY-MM-DD) to highlight as today. */
  todayDate?: string;
  caption: string;
  labels: {
    day: string;
    earned: string;
    spent: string;
    net: string;
    today: string;
    noEntries: string;
  };
  locale: string;
  formatMoney: (paise: number, opts?: { sign?: boolean }) => string;
  formatCompact: (paise: number) => string;
}

const parseDate = (date: string) => new Date(`${date}T00:00:00`);

/**
 * Diverging bar chart of daily net (earnings − expenses) in pure CSS. The visual
 * layer is aria-hidden; screen readers get an equivalent sr-only data table.
 */
export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  days,
  todayDate,
  caption,
  labels,
  locale,
  formatMoney,
  formatCompact,
}) => {
  const maxPos = Math.max(0, ...days.map((d) => d.netPaise));
  const maxNeg = Math.max(0, ...days.map((d) => -d.netPaise));
  const range = maxPos + maxNeg || 1;
  // Share of the plot height above the zero line
  const posArea = maxPos + maxNeg === 0 ? 100 : (maxPos / range) * 100;
  const negArea = 100 - posArea;

  const weekday = (date: string) => parseDate(date).toLocaleDateString(locale, { weekday: 'short' });
  const dayNum = (date: string) => parseDate(date).toLocaleDateString(locale, { day: 'numeric' });
  const longDay = (date: string) =>
    parseDate(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div>
      <div aria-hidden="true" className="select-none">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const isToday = d.date === todayDate;
            const empty = d.entryCount === 0;
            const heightPct = (Math.abs(d.netPaise) / range) * 100;
            const positive = d.netPaise >= 0;
            return (
              <div key={d.date} className="flex flex-col items-center min-w-0">
                <span
                  className={`text-[10px] leading-4 tabular-nums truncate max-w-full ${
                    empty ? 'text-ink-muted' : positive ? 'text-ink font-semibold' : 'text-semantic-error font-semibold'
                  }`}
                >
                  {empty ? '–' : formatCompact(d.netPaise)}
                </span>
                <div
                  className={`relative w-full h-24 mt-1 rounded-subtle ${isToday ? 'bg-accent-light' : 'bg-surface-2/60'}`}
                >
                  {/* zero line */}
                  <div className="absolute inset-x-0 border-t border-hairline" style={{ top: `${posArea}%` }} />
                  {!empty && d.netPaise !== 0 && (
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-3/5 max-w-[22px] min-h-[2px] ${
                        positive ? 'bg-semantic-success rounded-t-[4px]' : 'bg-semantic-error rounded-b-[4px]'
                      }`}
                      style={
                        positive
                          ? { bottom: `${negArea}%`, height: `${heightPct}%` }
                          : { top: `${posArea}%`, height: `${heightPct}%` }
                      }
                    />
                  )}
                  {empty && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-hairline"
                      style={{ top: `calc(${posArea}% - 3px)` }}
                    />
                  )}
                </div>
                <span className={`mt-1 text-[10px] leading-3 truncate max-w-full ${isToday ? 'font-bold text-accent' : 'text-ink-muted'}`}>
                  {isToday ? labels.today : weekday(d.date)}
                </span>
                <span className={`text-[10px] leading-3 tabular-nums ${isToday ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                  {dayNum(d.date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.day}</th>
            <th scope="col">{labels.earned}</th>
            <th scope="col">{labels.spent}</th>
            <th scope="col">{labels.net}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">
                {longDay(d.date)}
                {d.date === todayDate ? ` (${labels.today})` : ''}
              </th>
              {d.entryCount === 0 ? (
                <td colSpan={3}>{labels.noEntries}</td>
              ) : (
                <>
                  <td>{formatMoney(d.earningsPaise)}</td>
                  <td>{formatMoney(d.expensesPaise)}</td>
                  <td>{formatMoney(d.netPaise, { sign: true })}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
