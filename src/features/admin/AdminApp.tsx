import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, LogOut, RefreshCw, ShieldCheck, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { fill, formatPaise } from '../money/moneyUtils';
import type { UserProfile } from '../../context/AppContext';

interface Count {
  key: string;
  count: number;
}

interface AdminStats {
  generatedAt: number;
  totals: {
    sessions: number;
    activeSessions7d: number;
    demoSessions: number;
    moneyEntries: number;
    earningsPaise: number;
    expensesPaise: number;
    conversations: number;
    messages: number;
    documents: number;
  };
  byWorkerType: Count[];
  byState: Count[];
  byLanguage: Count[];
  activity: Array<{ date: string; newSessions: number; moneyEntries: number }>;
  topics: Count[];
  recentSessions: Array<{
    ref: string;
    isDemo: boolean;
    workerType: string;
    state: string;
    language: string;
    createdAt: number;
    lastActiveAt: number;
    entries: number;
  }>;
}

const LANGUAGE_NAMES: Record<string, string> = { hi: 'हिन्दी / Hinglish', en: 'English', pa: 'ਪੰਜਾਬੀ' };

const card = 'rounded-card bg-surface-1 border border-hairline p-4 md:p-5';

/** Horizontal share bars for one breakdown. */
const BreakdownList: React.FC<{ title: string; rows: Count[]; label: (key: string) => string; empty: string }> = ({
  title,
  rows,
  label,
  empty,
}) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className={card} aria-label={title}>
      <h2 className="text-sm font-semibold text-ink-muted mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-ink truncate">{label(r.key)}</span>
                <span className="font-bold tabular-nums text-ink">{r.count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-wash overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-ink" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** 14-day column chart; one series at a time keeps it readable on a phone. */
const ActivityChart: React.FC<{ stats: AdminStats; locale: string }> = ({ stats, locale }) => {
  const { t } = useApp();
  const [series, setSeries] = useState<'newSessions' | 'moneyEntries'>('moneyEntries');
  const values = stats.activity.map((d) => d[series]);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <section className={`${card} lg:col-span-2`} aria-labelledby="admin-activity">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 id="admin-activity" className="text-sm font-semibold text-ink-muted">
          {t.admin.activity} · <span className="text-ink tabular-nums">{total}</span>
        </h2>
        <div role="group" aria-label={t.admin.activity} className="flex gap-1 p-1 rounded-subtle bg-surface-2">
          {(['moneyEntries', 'newSessions'] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={series === id}
              onClick={() => setSeries(id)}
              className={`min-h-[36px] px-3 rounded-[10px] text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                series === id ? 'bg-ink text-inverse' : 'text-ink hover:bg-wash'
              }`}
            >
              {id === 'moneyEntries' ? t.admin.entriesLogged : t.admin.newSessions}
            </button>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>{t.admin.activity}</caption>
        <tbody>
          {stats.activity.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d[series]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-end gap-1 h-40" aria-hidden="true">
        {stats.activity.map((d) => {
          const v = d[series];
          return (
            <div key={d.date} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1">
              <span className="text-[0.625rem] text-ink-muted tabular-nums">{v || ''}</span>
              <div
                className={`w-full rounded-t-[4px] ${v ? 'bg-marigold' : 'bg-hairline-soft'}`}
                style={{ height: `${v ? Math.max(6, (v / max) * 100) : 3}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1.5" aria-hidden="true">
        {stats.activity.map((d, i) => (
          <span key={d.date} className="flex-1 min-w-0 text-center text-[0.625rem] text-ink-muted">
            {i % 2 === 0 ? new Date(`${d.date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''}
          </span>
        ))}
      </div>
    </section>
  );
};

const AdminLogin: React.FC<{ onLoggedIn: () => void }> = ({ onLoggedIn }) => {
  const { t } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t.common.error);
        return;
      }
      onLoggedIn();
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 md:mt-20">
      <div className={`${card} p-6 md:p-7 shadow-lift`}>
        <span className="w-12 h-12 rounded-full bg-ink text-inverse flex items-center justify-center mb-4" aria-hidden="true">
          <Lock className="w-5 h-5" />
        </span>
        <h1 className="text-2xl font-extrabold font-wide text-ink">{t.admin.loginTitle}</h1>
        <p className="text-sm text-ink-muted mt-1 mb-5">{t.admin.subtitle}</p>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Input
            id="admin-username"
            label={t.demo.username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            id="admin-password"
            label={t.demo.password}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-semantic-error">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="md" fullWidth isLoading={busy} disabled={!username.trim() || !password}>
            {busy ? t.admin.loggingIn : t.admin.login}
          </Button>
        </form>
      </div>
    </div>
  );
};

/** Operator dashboard at /admin: aggregate usage, no personal data. */
export const AdminApp: React.FC = () => {
  const { t, profile } = useApp();
  const [state, setState] = useState<'checking' | 'login' | 'ready'>('checking');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const locale = profile.language === 'pa' ? 'pa-IN' : 'en-IN';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      if (res.status === 401) {
        setState('login');
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setStats(await res.json());
      setState('ready');
    } catch {
      setError(t.admin.loadFailed);
      setState((s) => (s === 'checking' ? 'ready' : s));
    } finally {
      setLoading(false);
    }
  }, [t.admin.loadFailed]);

  useEffect(() => {
    document.title = `${t.admin.title} · KaamPe`;
    void load();
    // load once on mount; language changes only relabel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setStats(null);
    setState('login');
  };

  const workerLabel = (key: string) =>
    t.profileEditor.workerShort[key as UserProfile['workerType']] ?? key;

  const tiles = stats
    ? [
        { label: t.admin.totalSessions, value: stats.totals.sessions.toLocaleString('en-IN') },
        { label: t.admin.active7d, value: stats.totals.activeSessions7d.toLocaleString('en-IN') },
        { label: t.admin.moneyEntries, value: stats.totals.moneyEntries.toLocaleString('en-IN') },
        { label: t.admin.earningsTracked, value: formatPaise(stats.totals.earningsPaise), tone: 'text-semantic-success' },
        { label: t.admin.expensesTracked, value: formatPaise(stats.totals.expensesPaise), tone: 'text-semantic-error' },
        { label: t.admin.conversations, value: stats.totals.conversations.toLocaleString('en-IN') },
        { label: t.admin.messages, value: stats.totals.messages.toLocaleString('en-IN') },
        { label: t.admin.documents, value: stats.totals.documents.toLocaleString('en-IN') },
        { label: t.admin.demoSessions, value: stats.totals.demoSessions.toLocaleString('en-IN') },
      ]
    : [];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-md border-b border-hairline">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[1.5rem] leading-none font-extrabold font-wide text-ink shrink-0">
              Kaam<span className="bg-marigold text-marigold-ink px-1 rounded-md ml-0.5">Pe</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-accent">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <a
              href="/"
              aria-label={t.admin.backToApp}
              className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-full text-sm font-semibold text-ink hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.admin.backToApp}</span>
            </a>
            {state === 'ready' && (
              <Button variant="secondary" size="sm" onClick={logout} className="gap-1.5">
                <LogOut className="w-4 h-4" aria-hidden="true" />
                {t.admin.logout}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 focus:outline-none">
        {state === 'checking' && <p className="text-sm text-ink-muted" role="status">{t.a11y.loading}</p>}
        {state === 'login' && <AdminLogin onLoggedIn={load} />}

        {state === 'ready' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[1.75rem] md:text-4xl font-extrabold font-wide text-ink leading-tight">{t.admin.title}</h1>
                <p className="text-sm text-ink-muted mt-1">{t.admin.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {stats && (
                  <span className="text-xs text-ink-muted">
                    {fill(t.admin.updated, {
                      time: new Date(stats.generatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
                    })}
                  </span>
                )}
                <Button variant="secondary" size="sm" onClick={load} isLoading={loading} className="gap-1.5">
                  {!loading && <RefreshCw className="w-4 h-4" aria-hidden="true" />}
                  {t.admin.refresh}
                </Button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-semantic-error">
                {error}
              </p>
            )}

            {stats && (
              <>
                <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {tiles.map((tile) => (
                    <div key={tile.label} className={`${card} flex flex-col-reverse justify-end gap-1`}>
                      <dt className="text-xs text-ink-muted leading-snug">{tile.label}</dt>
                      <dd className={`text-2xl md:text-[1.75rem] font-extrabold font-wide tabular-nums leading-none ${tile.tone ?? 'text-ink'}`}>
                        {tile.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="grid gap-4 lg:grid-cols-3">
                  <ActivityChart stats={stats} locale={locale} />
                  <BreakdownList
                    title={t.admin.topics}
                    rows={stats.topics}
                    label={(k) => k.replace(/_/g, ' ')}
                    empty={t.admin.none}
                  />
                  <BreakdownList title={t.admin.byWorker} rows={stats.byWorkerType} label={workerLabel} empty={t.admin.none} />
                  <BreakdownList title={t.admin.byState} rows={stats.byState} label={(k) => k} empty={t.admin.none} />
                  <BreakdownList
                    title={t.admin.byLanguage}
                    rows={stats.byLanguage}
                    label={(k) => LANGUAGE_NAMES[k] ?? k}
                    empty={t.admin.none}
                  />
                </div>

                <section className={`${card} overflow-hidden p-0 md:p-0`} aria-labelledby="admin-recent">
                  <h2 id="admin-recent" className="text-sm font-semibold text-ink-muted px-4 md:px-5 pt-4 pb-2">
                    {t.admin.recent}
                  </h2>
                  {stats.recentSessions.length === 0 ? (
                    <p className="px-5 pb-4 text-sm text-ink-muted">{t.admin.none}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-ink-muted border-b border-hairline">
                            <th scope="col" className="px-4 md:px-5 py-2 font-semibold">{t.admin.colRef}</th>
                            <th scope="col" className="px-3 py-2 font-semibold">{t.admin.colWho}</th>
                            <th scope="col" className="px-3 py-2 font-semibold text-right">{t.admin.colEntries}</th>
                            <th scope="col" className="px-4 md:px-5 py-2 font-semibold text-right">{t.admin.colLastActive}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline-soft">
                          {stats.recentSessions.map((s) => (
                            <tr key={s.ref}>
                              <td className="px-4 md:px-5 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                                {s.ref}
                                {s.isDemo && (
                                  <span className="ml-2 font-sans text-[0.6875rem] font-bold px-1.5 py-0.5 rounded bg-accent-light text-accent">
                                    {t.admin.demoTag}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-ink whitespace-nowrap">
                                {workerLabel(s.workerType)} · {s.state} · {s.language.toUpperCase()}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-ink">{s.entries}</td>
                              <td className="px-4 md:px-5 py-2.5 text-right text-ink-muted whitespace-nowrap">
                                {new Date(s.lastActiveAt).toLocaleString(locale, {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <p className="flex gap-2 text-sm text-ink-muted">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-semantic-success" aria-hidden="true" />
                  {t.admin.privacyNote}
                </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminApp;
