import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Minus, Trash2, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';

interface Entry {
  id: string;
  type: 'earning' | 'expense';
  amountPaise: number;
  amountRupees: number;
  categoryOrSource: string | null;
  note: string | null;
  date: string;
  createdAt: number;
}

interface SummaryData {
  today: {
    date: string;
    earningsRupees: number;
    expensesRupees: number;
    netRupees: number;
    entryCount: number;
  };
  weekly: {
    totalEarningsRupees: number;
    totalExpensesRupees: number;
    netRupees: number;
    days: Array<{
      date: string;
      earningsRupees: number;
      expensesRupees: number;
      netRupees: number;
      entryCount: number;
    }>;
  };
  recentEntries: Entry[];
}

export const MoneyView: React.FC<{ onEntryAdded?: () => void }> = ({ onEntryAdded }) => {
  const { t, profile } = useApp();
  const [data, setData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState<'Fuel' | 'Food' | 'Maintenance' | 'Mobile/data' | 'Equipment' | 'Other'>('Fuel');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/money/summary', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load money summary');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleAddEarning = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/money/earning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parsedAmount,
          source: source.trim() || undefined,
          date,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add earning');
      }

      setShowEarningModal(false);
      setAmount('');
      setSource('');
      setNote('');
      await fetchSummary();
      if (onEntryAdded) onEntryAdded();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/money/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parsedAmount,
          category,
          date,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add expense');
      }

      setShowExpenseModal(false);
      setAmount('');
      setNote('');
      await fetchSummary();
      if (onEntryAdded) onEntryAdded();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.money.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/money/entries/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete entry');
      await fetchSummary();
      if (onEntryAdded) onEntryAdded();
    } catch (err: any) {
      alert(err.message || 'Error deleting entry');
    }
  };

  const formatCurrency = (val: number) => {
    const isNeg = val < 0;
    const abs = Math.abs(val);
    const str = abs % 1 === 0 ? abs.toLocaleString('en-IN') : abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNeg ? `-₹${str}` : `₹${str}`;
  };

  const todayNet = data?.today.netRupees ?? 0;
  const todayEarned = data?.today.earningsRupees ?? 0;
  const todaySpent = data?.today.expensesRupees ?? 0;
  const hasEntries = (data?.recentEntries.length ?? 0) > 0;
  const weekDays = data?.weekly.days ?? [];
  const maxDayEarning = Math.max(1, ...weekDays.map((d) => d.earningsRupees));
  // Hindi copy is written in Roman script, so day names use en-IN for it too
  const dateLocale = profile.language === 'pa' ? 'pa-IN' : 'en-IN';
  const formatDay = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric' });

  return (
    <div className="space-y-5 md:space-y-6">
      <h1 className="text-xl md:text-3xl font-bold tracking-tight text-ink">{t.money.title}</h1>

      {error && (
        <p className="text-sm text-semantic-error font-medium" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-5 md:gap-6 lg:grid-cols-5 lg:items-start">
      {/* HERO: Net Today */}
      <Card className="bg-surface-1 border border-hairline text-center py-6 px-4 md:py-8 lg:col-span-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {t.money.netToday}
        </span>
        <div className={`text-4xl md:text-5xl font-extrabold tracking-tight my-1.5 ${todayNet >= 0 ? 'text-ink' : 'text-semantic-error'}`}>
          {formatCurrency(todayNet)}
        </div>

        {/* Sub totals */}
        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-hairline-soft text-sm">
          <div className="flex items-center gap-1.5 text-semantic-success font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>{t.money.earned} {formatCurrency(todayEarned)}</span>
          </div>
          <div className="h-4 w-px bg-hairline" />
          <div className="flex items-center gap-1.5 text-ink-muted font-medium">
            <ArrowDownLeft className="w-4 h-4 text-semantic-error" />
            <span>{t.money.spent} {formatCurrency(todaySpent)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-5 max-w-sm mx-auto">
          <Button
            variant="accent"
            size="md"
            onClick={() => {
              setFormError('');
              setAmount('');
              setShowEarningModal(true);
            }}
            className="flex items-center justify-center gap-2"
          >
            <span>{t.money.addEarningBtn}</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setFormError('');
              setAmount('');
              setShowExpenseModal(true);
            }}
            className="flex items-center justify-center gap-2"
          >
            <span>{t.money.addExpenseBtn}</span>
          </Button>
        </div>
      </Card>

      {/* THIS WEEK SUMMARY */}
      <Card className="bg-surface-1 border border-hairline p-4 md:p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span>{t.money.thisWeek}</span>
          </h2>
          <span className="text-xs font-bold text-ink">
            {t.money.weekNet}: {formatCurrency(data?.weekly.netRupees ?? 0)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-surface-2 p-3 rounded-xl border border-hairline-soft">
          <div>
            <span className="text-ink-muted block">{t.money.earned}</span>
            <span className="font-semibold text-semantic-success text-sm">
              {formatCurrency(data?.weekly.totalEarningsRupees ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-ink-muted block">{t.money.spent}</span>
            <span className="font-semibold text-semantic-error text-sm">
              {formatCurrency(data?.weekly.totalExpensesRupees ?? 0)}
            </span>
          </div>
        </div>

        {weekDays.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
              {t.money.dailyBreakdown}
            </h3>
            <ul className="space-y-1.5">
              {weekDays.map((day) => (
                <li key={day.date} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                  <span className="text-ink-muted">{formatDay(day.date)}</span>
                  <span className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-semantic-success/70"
                      style={{ width: `${(day.earningsRupees / maxDayEarning) * 100}%` }}
                    />
                  </span>
                  <span className={`text-right tabular-nums ${day.entryCount === 0 ? 'text-ink-muted' : day.netRupees < 0 ? 'font-semibold text-semantic-error' : 'font-semibold text-ink'}`}>
                    {day.entryCount === 0 ? t.money.noEntriesDay : `${day.netRupees > 0 ? '+' : ''}${formatCurrency(day.netRupees)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
      </div>

      {/* RECENT ACTIVITY */}
      <section>
        <h2 className="text-sm md:text-base font-semibold text-ink mb-2.5 px-1">
          {t.money.recentActivity}
        </h2>

        {!hasEntries ? (
          <Card className="bg-surface-1 border border-hairline text-center py-8 px-4">
            <p className="text-sm text-ink-muted mb-1">{t.money.emptyActivity}</p>
            <p className="text-xs text-ink-tertiary mb-4">{t.money.addFirstPrompt}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEarningModal(true)}
            >
              {t.money.addEarningBtn}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {data?.recentEntries.map((entry) => {
              const isEarning = entry.type === 'earning';
              return (
                <div
                  key={entry.id}
                  className="bg-surface-1 border border-hairline rounded-xl p-3.5 flex items-center justify-between shadow-subtle hover:border-hairline transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                        isEarning ? 'bg-semantic-success/10 text-semantic-success' : 'bg-semantic-error/10 text-semantic-error'
                      }`}
                    >
                      {isEarning ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">
                        {isEarning
                          ? `+ ₹${entry.amountRupees.toLocaleString('en-IN')}`
                          : `− ₹${entry.amountRupees.toLocaleString('en-IN')}`}
                        <span className="text-xs font-normal text-ink-muted ml-2">
                          ·{' '}
                          {(!isEarning && t.money.categories[entry.categoryOrSource as keyof typeof t.money.categories]) ||
                            entry.categoryOrSource ||
                            (isEarning ? t.money.earned : t.money.spent)}
                        </span>
                      </div>
                      <div className="text-xs text-ink-tertiary flex items-center gap-2 mt-0.5">
                        <span>{entry.date}</span>
                        {entry.note && <span>• {entry.note}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(entry.id)}
                    aria-label={`Delete ${entry.type} of ${entry.amountRupees}`}
                    className="p-2 text-ink-tertiary hover:text-semantic-error rounded-lg hover:bg-surface-2 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ADD EARNING MODAL */}
      {showEarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm bg-surface-1 shadow-float border border-hairline p-5">
            <h3 className="text-lg font-bold text-ink mb-4">
              {t.money.earningModalTitle}
            </h3>

            <form onSubmit={handleAddEarning} className="space-y-4">
              <Input
                label={t.money.amountLabel}
                type="number"
                step="any"
                min="0.01"
                placeholder="e.g. 850"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
              />

              <Input
                label={t.money.sourceLabel}
                type="text"
                placeholder="e.g. Swiggy, Zomato, Cash"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />

              <Input
                label={t.money.dateLabel}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label={t.money.noteLabel}
                type="text"
                placeholder="Optional details"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {formError && (
                <p className="text-xs text-semantic-error font-medium" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowEarningModal(false)}
                  className="flex-1"
                >
                  {t.money.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  {t.money.save}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm bg-surface-1 shadow-float border border-hairline p-5">
            <h3 className="text-lg font-bold text-ink mb-4">
              {t.money.expenseModalTitle}
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <Input
                label={t.money.amountLabel}
                type="number"
                step="any"
                min="0.01"
                placeholder="e.g. 200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
              />

              <div>
                <label htmlFor="expense-category-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  {t.money.categoryLabel}
                </label>
                <select
                  id="expense-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-surface-1 text-ink border border-hairline rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="Fuel">{t.money.categories.Fuel}</option>
                  <option value="Food">{t.money.categories.Food}</option>
                  <option value="Maintenance">{t.money.categories.Maintenance}</option>
                  <option value="Mobile/data">{t.money.categories['Mobile/data']}</option>
                  <option value="Equipment">{t.money.categories.Equipment}</option>
                  <option value="Other">{t.money.categories.Other}</option>
                </select>
              </div>

              <Input
                label={t.money.dateLabel}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label={t.money.noteLabel}
                type="text"
                placeholder="Optional details"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {formError && (
                <p className="text-xs text-semantic-error font-medium" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1"
                >
                  {t.money.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  {t.money.save}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
