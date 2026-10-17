import React, { useState } from 'react';
import { ArrowRight, HandCoins, Landmark, PlayCircle, Scale, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Language } from '../../i18n/translations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { ThemeToggle } from '../../components/layout/ThemeToggle';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'hi', label: 'हिन्दी / Hinglish' },
  { code: 'en', label: 'English' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,32}$/;

/** Target shown on the demo account's home screen (₹1,200 a day). */
const DEMO_DAILY_GOAL_PAISE = 120_000;

/**
 * First screen for a new visitor: one tap into the seeded demo, or sign in /
 * create an account (new accounts then go through onboarding). Admin
 * credentials typed here open the operator panel.
 */
export const LoginScreen: React.FC = () => {
  const { t, profile, updateLanguage, adoptSession, continueAsGuest, dailyGoalPaise, setDailyGoalPaise } = useApp();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<{ username?: string; password?: string }>({});
  const [busy, setBusy] = useState<'demo' | 'form' | null>(null);

  const enterDemo = (session: Parameters<typeof adoptSession>[0]) => {
    adoptSession(session, { onboarded: true });
    if (!dailyGoalPaise) setDailyGoalPaise(DEMO_DAILY_GOAL_PAISE);
    showToast(t.demo.welcome);
  };

  const tryDemo = async () => {
    setError('');
    setBusy('demo');
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: profile.language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.session) throw new Error('demo');
      enterDemo(data.session);
    } catch {
      setError(t.auth.failed);
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: typeof fieldError = {};
    if (mode === 'signup') {
      if (!USERNAME_RE.test(username.trim())) errs.username = t.auth.invalidUsername;
      if (password.length < 8) errs.password = t.auth.invalidPassword;
    }
    setFieldError(errs);
    if (errs.username || errs.password) return;

    setBusy('form');
    try {
      const res = await fetch(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
          language: profile.language,
          ...(mode === 'signup' && name.trim() ? { name: name.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t.auth.failed);
        return;
      }
      if (data.kind === 'admin') {
        showToast(t.auth.adminOpening);
        window.location.assign(data.redirect || '/admin');
        return;
      }
      if (data.kind === 'demo') {
        enterDemo(data.session);
        return;
      }
      // New accounts set up their profile next; returning ones go straight in.
      adoptSession(data.session, { onboarded: mode === 'signin' });
      showToast(mode === 'signup' ? t.auth.welcomeNew : t.auth.welcomeBack);
    } catch {
      setError(t.auth.failed);
    } finally {
      setBusy(null);
    }
  };

  const features = [
    { icon: HandCoins, label: t.auth.featMoney },
    { icon: Scale, label: t.auth.featRights },
    { icon: Landmark, label: t.auth.featSchemes },
    { icon: ShieldCheck, label: t.auth.featSafety },
  ];

  const tabClass = (on: boolean) =>
    `flex-1 min-h-[44px] rounded-[10px] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
      on ? 'bg-ink text-inverse font-bold' : 'text-ink font-medium hover:bg-wash'
    }`;

  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* BRAND PANEL */}
      <section className="relative overflow-hidden bg-ink text-inverse dark:bg-surface-2 dark:text-ink px-5 pt-6 pb-8 md:px-10 lg:px-14 lg:py-14 lg:min-h-screen lg:flex lg:flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[1.75rem] leading-none font-extrabold font-wide">
            Kaam<span className="bg-marigold text-marigold-ink px-1 rounded-md ml-0.5">Pe</span>
          </span>
          <div className="flex items-center gap-1 lg:hidden">
            <label htmlFor="login-language-m" className="sr-only">
              {t.common.language}
            </label>
            <select
              id="login-language-m"
              value={profile.language}
              onChange={(e) => updateLanguage(e.target.value as Language)}
              className="min-h-[44px] rounded-full bg-inverse/10 text-inverse border border-inverse/20 dark:bg-surface-1 dark:text-ink dark:border-hairline px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="text-ink bg-surface-1">
                  {l.label}
                </option>
              ))}
            </select>
            <ThemeToggle className="text-inverse hover:bg-inverse/10 dark:text-ink dark:hover:bg-wash" />
          </div>
        </div>

        <div className="mt-6 lg:mt-auto lg:mb-auto max-w-xl">
          <p className="text-sm font-semibold text-inverse/75 dark:text-ink-muted">{t.tagline}</p>
          <h1 className="mt-2 text-[2rem] md:text-5xl leading-[1.05] font-extrabold font-wide text-balance">{t.auth.heroTitle}</h1>
          <p className="mt-3 text-[0.9375rem] md:text-lg text-inverse/80 dark:text-ink-muted leading-snug max-w-lg">{t.auth.heroText}</p>
          <ul className="mt-5 grid grid-cols-2 gap-2 md:gap-3">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 rounded-subtle bg-inverse/[0.07] border border-inverse/10 dark:bg-surface-1 dark:border-hairline px-3 py-2.5 text-sm font-medium leading-tight">
                <span className="w-8 h-8 rounded-full bg-marigold text-marigold-ink flex items-center justify-center shrink-0" aria-hidden="true">
                  <Icon className="w-4 h-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden lg:block block-print h-3 -mx-14 -mb-14 mt-10" aria-hidden="true" />
      </section>

      {/* SIGN-IN PANEL */}
      <main id="main-content" className="px-4 py-6 md:px-10 lg:py-14 lg:flex lg:flex-col lg:justify-center">
        <div className="hidden lg:flex items-center justify-end gap-1 mb-auto">
          <label htmlFor="login-language" className="sr-only">
            {t.common.language}
          </label>
          <select
            id="login-language"
            value={profile.language}
            onChange={(e) => updateLanguage(e.target.value as Language)}
            className="min-h-[44px] rounded-full bg-surface-1 text-ink border border-hairline px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md mx-auto lg:mb-auto">
          {/* One tap demo: the fastest way in */}
          <button
            type="button"
            onClick={tryDemo}
            disabled={busy !== null}
            aria-busy={busy === 'demo' || undefined}
            className="group w-full flex items-center gap-4 rounded-card bg-marigold text-marigold-ink p-4 md:p-5 text-left shadow-lift hover:bg-marigold-hover transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <span className="w-12 h-12 rounded-full bg-marigold-ink text-marigold flex items-center justify-center shrink-0" aria-hidden="true">
              <PlayCircle className={`w-6 h-6 ${busy === 'demo' ? 'motion-safe:animate-pulse' : ''}`} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-lg font-extrabold font-wide leading-tight">{t.auth.demoButton}</span>
              <span className="block text-sm mt-0.5 opacity-90">{t.auth.demoHint}</span>
            </span>
            <ArrowRight className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-3 my-6" aria-hidden="true">
            <span className="flex-1 h-px bg-hairline" />
            <span className="text-xs font-semibold text-ink-muted">{t.auth.orDivider}</span>
            <span className="flex-1 h-px bg-hairline" />
          </div>

          <div className="rounded-card bg-surface-1 border border-hairline p-5">
            <div role="group" aria-label={t.auth.signInTab} className="flex gap-1 p-1 rounded-subtle bg-surface-2 mb-4">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError('');
                    setFieldError({});
                  }}
                  className={tabClass(mode === m)}
                >
                  {m === 'signin' ? t.auth.signInTab : t.auth.signUpTab}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3" noValidate>
              {mode === 'signup' && (
                <Input
                  id="login-name"
                  label={t.auth.name}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
              )}
              <Input
                id="login-username"
                label={t.auth.username}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                helperText={mode === 'signup' ? t.auth.usernameHint : undefined}
                error={fieldError.username}
                required
              />
              <Input
                id="login-password"
                label={t.auth.password}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText={mode === 'signup' ? t.auth.passwordHint : undefined}
                error={fieldError.password}
                required
              />
              {error && (
                <p role="alert" className="text-sm font-medium text-semantic-error">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={busy === 'form'}
                disabled={busy !== null || !username.trim() || !password}
              >
                {mode === 'signin'
                  ? busy === 'form'
                    ? t.auth.signingIn
                    : t.auth.signIn
                  : busy === 'form'
                    ? t.auth.signingUp
                    : t.auth.signUp}
              </Button>
            </form>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={continueAsGuest}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full text-sm font-semibold text-ink hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <UserRound className="w-4 h-4" aria-hidden="true" />
              {t.auth.guest}
            </button>
            <p className="text-xs text-ink-muted">{t.auth.guestHint}</p>
          </div>
        </div>
      </main>
    </div>
  );
};
