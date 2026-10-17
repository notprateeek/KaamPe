import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { WeeklyBarChart } from '../../components/charts/WeeklyBarChart';
import { todayLocalISODate } from '../../lib/date';
import { PlatformBreakdown } from './PlatformBreakdown';
import { AmountChips, SourceChips } from './QuickChips';
import { useToast } from '../../components/ui/Toast';
import { WORKER_PLATFORMS } from '../../constants/workerIcons';
import {
  MoneyEntry,
  MoneySummary,
  computePlatformStats,
  deleteMoneyEntry,
  fetchMoneyEntries,
  fetchMoneySummary,
  fill,
  formatPaise,
  formatPaiseCompact,
  parseRupeesToPaise,
} from './moneyUtils';
import { Trash2, ArrowUpRight, ArrowDownLeft, Calendar, BarChart3, Share2 } from 'lucide-react';

type ExpenseCategory = 'Fuel' | 'Food' | 'Maintenance' | 'Mobile/data' | 'Equipment' | 'Other';
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Fuel', 'Food', 'Maintenance', 'Mobile/data', 'Equipment', 'Other'];

/** Reads a server error body `{ error: <localized message>, code }`, else a localized fallback. */
async function readServerError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  } catch {
    /* non-JSON body */
  }
  return fallback;
}

export const MoneyView: React.FC<{ onEntryAdded?: () => void }> = ({ onEntryAdded }) => {
  const { t, profile, buzz } = useApp();
  const { showToast } = useToast();
  const [data, setData] = useState<MoneySummary | null>(null);
  const [entries, setEntries] = useState<MoneyEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [openForm, setOpenForm] = useState<'earning' | 'expense' | null>(null);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Fuel');
  const [date, setDate] = useState(() => todayLocalISODate());
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<MoneyEntry | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    const [summary, list] = await Promise.allSettled([fetchMoneySummary(), fetchMoneyEntries()]);
    if (summary.status === 'fulfilled') setData(summary.value);
    else setLoadFailed(true);
    // The platform breakdown is optional; hide it if entries fail to load
    setEntries(list.status === 'fulfilled' ? list.value : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openEntryForm = (kind: 'earning' | 'expense') => {
    setFormError('');
    setAmount('');
    setSource('');
    setNote('');
    setDate(todayLocalISODate());
    setOpenForm(kind);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openForm) return;
    setFormError('');

    const paise = parseRupeesToPaise(amount);
    if (paise === null) {
      setFormError(t.money.errorAmountInvalid);
      return;
    }

    setIsSubmitting(true);
    try {
      // API accepts rupees and converts to integer paise server-side; paise/100 has at most 2 decimals
      const rupees = paise / 100;
      const body =
        openForm === 'earning'
          ? { amount: rupees, source: source.trim() || undefined, date, note: note.trim() || undefined }
          : { amount: rupees, category, date, note: note.trim() || undefined };

      const res = await fetch(`/api/money/${openForm}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setFormError(
          await readServerError(res, res.status === 400 ? t.money.errorAmountInvalid : t.money.errorSaveFailed)
        );
        return;
      }

      const saved = await res.json().catch(() => null);
      const entryId: string | undefined = saved?.entry?.id;
      const kind = openForm;
      setOpenForm(null);
      buzz();
      await fetchAll();
      onEntryAdded?.();
      showToast(
        fill(kind === 'earning' ? t.money.savedEarningToast : t.money.savedExpenseToast, { amount: formatPaise(paise) }),
        entryId
          ? {
              label: t.common.undo,
              onAction: () =>
                deleteMoneyEntry(entryId)
                  .then(async () => {
                    await fetchAll();
                    onEntryAdded?.();
                    showToast(t.money.undoneToast);
                  })
                  .catch(() => showToast(t.money.errorDelete)),
            }
          : undefined
      );
    } catch {
      setFormError(t.money.errorSaveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/money/entries/${encodeURIComponent(pendingDelete.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setDeleteError(await readServerError(res, t.money.errorDelete));
        return;
      }
      setPendingDelete(null);
      await fetchAll();
      onEntryAdded?.();
      showToast(t.money.undoneToast);
    } catch {
      setDeleteError(t.money.errorDelete);
    } finally {
      setIsDeleting(false);
    }
  };

  const todayNet = data?.today.netPaise ?? 0;
  const todayEarned = data?.today.earningsPaise ?? 0;
  const todaySpent = data?.today.expensesPaise ?? 0;
  const recentEntries = data?.recentEntries ?? [];
  const hasEntries = recentEntries.length > 0;
  const weekDays = data?.weekly.days ?? [];
  const weekHasEntries = weekDays.some((d) => d.entryCount > 0);
  // Hindi copy is written in Roman script, so dates use en-IN for it too
  const dateLocale = profile.language === 'pa' ? 'pa-IN' : 'en-IN';
  const formatEntryDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });

  const platformStats = useMemo(
    () => (entries ? computePlatformStats(entries, weekDays.map((d) => d.date)) : null),
    [entries, weekDays]
  );

  const shareWeek = async () => {
    const text = fill(t.money.shareWeekText, {
      earned: formatPaise(data?.weekly.totalEarningsPaise ?? 0),
      spent: formatPaise(data?.weekly.totalExpensesPaise ?? 0),
      net: formatPaise(data?.weekly.netPaise ?? 0),
    });
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled: fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(t.money.shareCopied);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  };

  const entryLabel = (entry: MoneyEntry) =>
    entry.type === 'earning'
      ? entry.categoryOrSource || t.money.earned
      : t.money.categories[entry.categoryOrSource as ExpenseCategory] || entry.categoryOrSource || t.money.spent;

  const formButtons = (
    <div className="flex gap-2 pt-2">
      <Button type="button" variant="secondary" size="md" onClick={() => setOpenForm(null)} className="flex-1">
        {t.money.cancel}
      </Button>
      <Button type="submit" variant="accent" size="md" isLoading={isSubmitting} className="flex-1">
        {t.money.save}
      </Button>
    </div>
  );

  const sharedFields = (
    <>
      <Input
        id="money-date"
        label={t.money.dateLabel}
        type="date"
        value={date}
        max={todayLocalISODate()}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <Input
        id="money-note"
        label={t.money.noteLabel}
        type="text"
        maxLength={200}
        placeholder={t.money.notePlaceholder}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {formError && (
        <p className="text-xs text-semantic-error font-medium" role="alert">
          {formError}
        </p>
      )}
    </>
  );

  const amountField = (
    <Input
      id="money-amount"
      label={t.money.amountLabel}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={t.money.amountPlaceholder}
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      required
    />
  );
  const amountChips = <AmountChips value={amount} onPick={setAmount} label={t.money.quickAmounts} />;

  return (
    <div className="space-y-5 md:space-y-6">
      <h1 className="pt-1 text-[1.75rem] md:text-[2.75rem] leading-tight font-extrabold font-wide text-ink">{t.money.title}</h1>

      {loadFailed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-semantic-error/30 bg-semantic-error/5 p-3">
          <p className="text-sm text-semantic-error font-medium">{t.money.errorLoad}</p>
          <Button variant="secondary" size="sm" onClick={fetchAll}>
            {t.common.retry}
          </Button>
        </div>
      )}
      {isLoading && !data && (
        <p className="text-xs text-ink-muted" role="status">
          {t.money.loading}
        </p>
      )}

      <div className="grid gap-5 md:gap-6 lg:grid-cols-5 lg:items-start">
        {/* HERO: Net Today */}
        <Card className="bg-surface-1 border-[1.5px] border-ink p-5 md:p-7 lg:col-span-3 shadow-[0_12px_32px_rgba(23,33,77,0.10)]">
          <span className="text-sm font-semibold text-ink-muted">{t.money.netToday}</span>
          <div
            className={`text-[3.5rem] md:text-7xl leading-none font-extrabold font-wide tabular-nums my-2 ${todayNet >= 0 ? 'text-ink' : 'text-semantic-error'}`}
          >
            {formatPaise(todayNet)}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 pt-3 border-t border-hairline text-base">
            <div className="flex items-center gap-1.5 text-semantic-success font-medium">
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              <span>{`${t.money.earned} ${formatPaise(todayEarned)}`}</span>
            </div>
            <div className="h-4 w-px bg-hairline" />
            <div className="flex items-center gap-1.5 text-ink-muted font-medium">
              <ArrowDownLeft className="w-4 h-4 text-semantic-error" aria-hidden="true" />
              <span>{`${t.money.spent} ${formatPaise(todaySpent)}`}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5 sm:max-w-md">
            <Button variant="accent" size="lg" onClick={() => openEntryForm('earning')}>
              <span>{t.money.addEarningBtn}</span>
            </Button>
            <Button variant="secondary" size="lg" onClick={() => openEntryForm('expense')}>
              <span>{t.money.addExpenseBtn}</span>
            </Button>
          </div>
        </Card>

        {/* THIS WEEK SUMMARY + CHART */}
        <Card className="bg-surface-1 border border-hairline p-4 md:p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>{t.money.thisWeek}</span>
            </h2>
            <button
              type="button"
              onClick={shareWeek}
              disabled={!weekHasEntries}
              aria-label={t.money.shareWeek}
              title={t.money.shareWeek}
              className="flex items-center justify-center shrink-0 w-11 h-11 rounded-full text-accent hover:bg-accent-light disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Share2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-surface-2 p-3 rounded-subtle">
            <div>
              <span className="text-ink-muted block">{t.money.earned}</span>
              <span className="font-semibold text-semantic-success text-sm">
                {formatPaise(data?.weekly.totalEarningsPaise ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block">{t.money.spent}</span>
              <span className="font-semibold text-semantic-error text-sm">
                {formatPaise(data?.weekly.totalExpensesPaise ?? 0)}
              </span>
            </div>
          </div>
          <p className="mt-2 px-1 text-sm font-semibold text-ink">
            {`${t.money.weekNet}: ${formatPaise(data?.weekly.netPaise ?? 0)}`}
          </p>

          {weekDays.length > 0 && (
            <figure className="mt-4">
              <figcaption className="text-xs font-semibold text-ink-muted mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                {t.money.chartTitle}
              </figcaption>
              <WeeklyBarChart
                days={weekDays}
                todayDate={data?.today.date}
                caption={t.money.chartCaption}
                labels={{
                  day: t.money.colDay,
                  earned: t.money.colEarned,
                  spent: t.money.colSpent,
                  net: t.money.colNet,
                  today: t.money.today,
                  noEntries: t.money.noEntriesDay,
                }}
                locale={dateLocale}
                formatMoney={formatPaise}
                formatCompact={formatPaiseCompact}
              />
              {!weekHasEntries && <p className="mt-2 text-xs text-ink-muted">{t.money.chartEmpty}</p>}
            </figure>
          )}
        </Card>
      </div>

      {/* PER-PLATFORM BREAKDOWN */}
      {platformStats && platformStats.length > 0 && <PlatformBreakdown stats={platformStats} />}

      {/* RECENT ACTIVITY */}
      <section>
        <h2 className="text-base md:text-lg font-bold text-ink mb-2.5 px-1">{t.money.recentActivity}</h2>

        {!hasEntries ? (
          <Card className="bg-surface-1 border border-hairline text-center py-8 px-4">
            <p className="text-sm text-ink-muted mb-1">{t.money.emptyActivity}</p>
            <p className="text-xs text-ink-tertiary mb-4">{t.money.addFirstPrompt}</p>
            <Button variant="secondary" size="sm" onClick={() => openEntryForm('earning')}>
              {t.money.addEarningBtn}
            </Button>
          </Card>
        ) : (
          <ul className="relative overflow-hidden rounded-card border border-hairline bg-surface-1">
            <li aria-hidden="true" className="absolute inset-y-0 left-[4.5rem] w-0.5 bg-rule" />
            {recentEntries.map((entry) => {
              const isEarning = entry.type === 'earning';
              const amountText = formatPaise(entry.amountPaise);
              return (
                <li
                  key={entry.id}
                  className="relative grid grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 min-h-[3.25rem] pr-2 border-b border-hairline last:border-b-0"
                >
                  <span className="text-xs text-ink-muted text-center px-1 leading-tight">{formatEntryDate(entry.date)}</span>
                  <span className="min-w-0 pl-2">
                    <span className="block text-base text-ink truncate">{entryLabel(entry)}</span>
                    {entry.note && <span className="block text-xs text-ink-muted truncate">{entry.note}</span>}
                  </span>
                  <span className={`text-base font-bold tabular-nums ${isEarning ? 'text-semantic-success' : 'text-semantic-error'}`}>
                    <span className="sr-only">{isEarning ? t.money.typeEarning : t.money.typeExpense}: </span>
                    {isEarning ? `+ ${amountText}` : `− ${amountText}`}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError('');
                      setPendingDelete(entry);
                    }}
                    aria-label={fill(t.money.deleteEntryLabel, {
                      type: isEarning ? t.money.typeEarning : t.money.typeExpense,
                      amount: amountText,
                      date: formatEntryDate(entry.date),
                    })}
                    className="p-2 text-ink-tertiary hover:text-semantic-error rounded-lg hover:bg-surface-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ADD EARNING */}
      <Dialog open={openForm === 'earning'} onClose={() => setOpenForm(null)} title={t.money.earningModalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {amountField}
          {amountChips}
          <Input
            id="money-source"
            label={t.money.sourceLabel}
            type="text"
            maxLength={50}
            placeholder={t.money.sourcePlaceholder}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <SourceChips options={WORKER_PLATFORMS[profile.workerType]} value={source} onPick={setSource} label={t.money.quickSources} />
          {sharedFields}
          {formButtons}
        </form>
      </Dialog>

      {/* ADD EXPENSE */}
      <Dialog open={openForm === 'expense'} onClose={() => setOpenForm(null)} title={t.money.expenseModalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {amountField}
          {amountChips}
          <div>
            <label
              htmlFor="expense-category-select"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              {t.money.categoryLabel}
            </label>
            <select
              id="expense-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full min-h-[48px] bg-surface-1 text-ink border-[1.5px] border-hairline rounded-subtle px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.money.categories[c]}
                </option>
              ))}
            </select>
          </div>
          {sharedFields}
          {formButtons}
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title={t.money.deleteConfirm}>
        {pendingDelete && (
          <div className="space-y-4">
            <p className="text-sm text-ink bg-surface-2 rounded-xl border border-hairline-soft px-3 py-2.5">
              {`${pendingDelete.type === 'earning' ? '+' : '−'} ${formatPaise(pendingDelete.amountPaise)} · ${entryLabel(
                pendingDelete
              )} · ${formatEntryDate(pendingDelete.date)}`}
            </p>
            {deleteError && (
              <p className="text-xs text-semantic-error font-medium" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setPendingDelete(null)}>
                {t.money.cancel}
              </Button>
              <Button variant="danger" size="md" className="flex-1" isLoading={isDeleting} onClick={confirmDelete}>
                {t.money.deleteConfirmBtn}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
