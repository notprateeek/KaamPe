import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { fill } from '../money/moneyUtils';

/** Target shown on the demo account's home screen (₹1,200 a day). */
const DEMO_DAILY_GOAL_PAISE = 120_000;

interface DemoCreds {
  username: string;
  password: string;
}

/** Demo credentials published by the server (null while loading or when demo login is off). */
export function useDemoCredentials(): DemoCreds | null {
  const [creds, setCreds] = useState<DemoCreds | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/demo', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.enabled) setCreds({ username: d.username, password: d.password });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return creds;
}

/**
 * Sign-in form for the seeded demo account. Shows the shared demo credentials
 * with a one-tap "fill" so testers don't have to type them.
 */
export const DemoLoginForm: React.FC<{ idPrefix: string; onDone?: () => void; onCancel?: () => void }> = ({
  idPrefix,
  onDone,
  onCancel,
}) => {
  const { t, profile, adoptSession, dailyGoalPaise, setDailyGoalPaise } = useApp();
  const { showToast } = useToast();
  const creds = useDemoCredentials();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, language: profile.language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.session) {
        setError(typeof data.error === 'string' ? data.error : t.demo.failed);
        return;
      }
      adoptSession(data.session, { onboarded: true });
      if (!dailyGoalPaise) setDailyGoalPaise(DEMO_DAILY_GOAL_PAISE);
      showToast(t.demo.welcome);
      onDone?.();
    } catch {
      setError(t.demo.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className="text-sm text-ink-muted">{t.demo.loginIntro}</p>

      {creds && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-subtle bg-accent-light border border-accent-subtle px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <KeyRound className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
            <span>{fill(t.demo.credsLabel, { username: creds.username, password: creds.password })}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setUsername(creds.username);
              setPassword(creds.password);
              setError('');
            }}
            className="min-h-[40px] px-2 rounded text-sm font-bold text-accent hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t.demo.fillCreds}
          </button>
        </div>
      )}

      <Input
        id={`${idPrefix}-username`}
        label={t.demo.username}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input
        id={`${idPrefix}-password`}
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

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" size="md" onClick={onCancel} className="flex-1">
            {t.onboarding.back}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={busy}
          disabled={!username.trim() || !password}
          className="flex-[2]"
        >
          {busy ? t.demo.loggingIn : t.demo.login}
        </Button>
      </div>
    </form>
  );
};
