import React, { useEffect, useState } from 'react';
import {
  Download,
  MessageSquareX,
  RotateCcw,
  Phone,
  ShieldCheck,
  Pencil,
  Monitor,
  Sun,
  Moon,
  PlayCircle,
  LogOut,
  LayoutDashboard,
  Volume2,
} from 'lucide-react';
import { useApp, TextSize, ThemePreference, SpeechRate, SPEECH_RATES } from '../../context/AppContext';
import { Dialog } from '../../components/ui/Dialog';
import { ReadPageButton } from '../../components/speech/ReadPageButton';
import { useScreenReader } from '../../components/speech/ScreenReader';
import { DemoLoginForm } from '../auth/DemoLogin';
import type { Language } from '../../i18n/translations';
import { ProfileEditor } from '../../components/layout/ProfileEditor';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { WORKER_ICONS } from '../../constants/workerIcons';
import { HELPLINES } from '../../../shared/helplines';
import { todayLocalISODate } from '../../lib/date';
import {
  MoneyEntry,
  computeLoggingStats,
  entriesToCsv,
  fetchMoneyEntries,
  parseRupeesToPaise,
} from '../money/moneyUtils';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

const segmentClass = (selected: boolean) =>
  `flex-1 min-h-[44px] px-2 rounded-[10px] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    selected ? 'bg-ink text-inverse font-bold' : 'text-ink font-medium hover:bg-wash'
  }`;

const rowButtonClass =
  'w-full flex items-center gap-3 min-h-[56px] px-4 text-left text-[0.9375rem] font-medium text-ink hover:bg-surface-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

/** Accessible on/off switch row used by the settings lists. */
const SwitchRow: React.FC<{ id: string; label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void }> = ({
  id,
  label,
  hint,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-3 p-4">
    <span className="min-w-0">
      <span id={`${id}-label`} className="block text-[0.9375rem] font-semibold text-ink">
        {label}
      </span>
      {hint && (
        <span id={`${id}-hint`} className="block text-sm text-ink-muted">
          {hint}
        </span>
      )}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={hint ? `${id}-hint` : undefined}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-14 h-8 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
        checked ? 'bg-ink' : 'bg-hairline'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-surface-1 shadow-subtle transition-transform ${
          checked ? 'translate-x-6' : ''
        }`}
      />
    </button>
  </div>
);

const SectionTitle: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="text-sm font-semibold text-ink-muted mb-2 px-1">
    {children}
  </h2>
);

/**
 * "You" tab: who the app thinks you are, every preference in one place, and
 * what you can do with your own data.
 */
export const MeView: React.FC<{ hasChat: boolean; onClearChat: () => void }> = ({ hasChat, onClearChat }) => {
  const {
    t,
    profile,
    updateLanguage,
    textSize,
    setTextSize,
    dailyGoalPaise,
    setDailyGoalPaise,
    haptics,
    setHaptics,
    restartSetup,
    theme,
    setTheme,
    speechRate,
    setSpeechRate,
    autoRead,
    setAutoRead,
    autoSaveMoney,
    setAutoSaveMoney,
    tapToHear,
    setTapToHear,
    isDemo,
    account,
    logout,
    sessionVersion,
  } = useApp();
  const reader = useScreenReader();
  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [entries, setEntries] = useState<MoneyEntry[] | null>(null);
  const [goalInput, setGoalInput] = useState(dailyGoalPaise ? String(dailyGoalPaise / 100) : '');
  const [goalError, setGoalError] = useState('');
  const WorkerIcon = WORKER_ICONS[profile.workerType];

  const [entriesFailed, setEntriesFailed] = useState(false);

  useEffect(() => {
    // Full history: the export and lifetime stats must not stop at the newest 1000 entries.
    fetchMoneyEntries({ all: true })
      .then((list) => {
        setEntries(list);
        setEntriesFailed(false);
      })
      .catch(() => {
        setEntries(null);
        setEntriesFailed(true);
      });
  }, [sessionVersion]);

  const stats = entries ? computeLoggingStats(entries, todayLocalISODate()) : null;

  const saveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseRupeesToPaise(goalInput);
    if (paise === null) {
      setGoalError(t.forms.invalidAmount);
      return;
    }
    setGoalError('');
    setDailyGoalPaise(paise);
    showToast(t.me.goalSaved);
  };

  const downloadCsv = () => {
    if (entriesFailed) {
      showToast(t.common.error);
      return;
    }
    if (!entries?.length) {
      showToast(t.me.exportEmpty);
      return;
    }
    // BOM so Excel opens UTF-8 (Gurmukhi/Devanagari notes) correctly
    const blob = new Blob(['﻿' + entriesToCsv(entries)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaampe-hisaab-${todayLocalISODate()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(t.me.exportDone);
  };

  const themes: { id: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { id: 'system', label: t.theme.system, Icon: Monitor },
    { id: 'light', label: t.theme.light, Icon: Sun },
    { id: 'dark', label: t.theme.dark, Icon: Moon },
  ];

  const rates: { id: SpeechRate; label: string }[] = [
    { id: 'slow', label: t.access.rateSlow },
    { id: 'normal', label: t.access.rateNormal },
    { id: 'fast', label: t.access.rateFast },
  ];

  const signOut = async () => {
    const ok = await logout();
    showToast(ok ? (isDemo ? t.demo.loggedOut : t.auth.loggedOut) : t.common.error);
  };

  const textSizes: { id: TextSize; label: string; glyph: string }[] = [
    { id: 'normal', label: t.me.textNormal, glyph: 'text-sm' },
    { id: 'large', label: t.me.textLarge, glyph: 'text-base' },
    { id: 'xlarge', label: t.me.textXLarge, glyph: 'text-lg' },
  ];

  return (
    <div className="max-w-2xl space-y-7">
      <h1 className="sr-only">{t.me.title}</h1>

      {/* WHO YOU ARE */}
      <section aria-label={t.me.title} className="rounded-card bg-ink text-inverse p-5">
        <div className="flex items-center gap-4">
          <span className="w-16 h-16 rounded-full bg-marigold text-marigold-ink flex items-center justify-center shrink-0" aria-hidden="true">
            <WorkerIcon className="w-8 h-8" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-extrabold font-wide leading-tight">{t.profileEditor.workerShort[profile.workerType]}</p>
            <p className="text-inverse/80 text-[0.9375rem]">{profile.state}</p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="shrink-0 flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full bg-inverse/10 hover:bg-inverse/20 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              {t.profileEditor.edit}
            </button>
          )}
        </div>

        {isEditing && (
          <div className="mt-5 rounded-subtle bg-surface-1 text-ink p-4">
            <ProfileEditor
              idPrefix="me-profile"
              onDone={() => {
                setIsEditing(false);
              }}
            />
          </div>
        )}

        {stats && (
          <dl className="mt-5 grid grid-cols-3 border-t border-inverse/15 pt-4 text-center" aria-label={t.me.statsTitle}>
            {[
              { label: t.me.statEntries, value: entries?.length ?? 0 },
              { label: t.me.statDays, value: stats.days },
              { label: t.me.statStreak, value: stats.streak },
            ].map((s) => (
              <div key={s.label} className="min-w-0 flex flex-col-reverse">
                <dt className="text-xs text-inverse/75 mt-0.5">{s.label}</dt>
                <dd className="text-2xl font-extrabold font-wide tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* SETTINGS: everything that used to be scattered across the header */}
      <section aria-labelledby="me-settings">
        <SectionTitle id="me-settings">{t.me.settingsTitle}</SectionTitle>
        <div className="rounded-card bg-surface-1 border border-hairline divide-y divide-hairline-soft">
          <div className="p-4">
            <p id="me-lang-label" className="text-[0.9375rem] font-semibold text-ink mb-2">
              {t.common.language}
            </p>
            <div role="group" aria-labelledby="me-lang-label" className="flex gap-1 p-1 rounded-subtle bg-surface-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={profile.language === l.code}
                  onClick={() => updateLanguage(l.code)}
                  className={segmentClass(profile.language === l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <p id="me-size-label" className="text-[0.9375rem] font-semibold text-ink mb-2">
              {t.me.textSize}
            </p>
            <div role="group" aria-labelledby="me-size-label" className="flex gap-1 p-1 rounded-subtle bg-surface-2">
              {textSizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={textSize === s.id}
                  onClick={() => setTextSize(s.id)}
                  className={`${segmentClass(textSize === s.id)} flex flex-col items-center justify-center gap-0.5 py-1.5 leading-tight`}
                >
                  <span aria-hidden="true" className={`${s.glyph} font-bold leading-none`}>
                    A
                  </span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={saveGoal} className="p-4" noValidate>
            <label htmlFor="me-goal" className="block text-[0.9375rem] font-semibold text-ink">
              {t.me.dailyGoal}
            </label>
            <p id="me-goal-hint" className="text-sm text-ink-muted mb-2">
              {t.me.dailyGoalHint}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted font-semibold" aria-hidden="true">
                  ₹
                </span>
                <input
                  id="me-goal"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="1000"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  aria-describedby={goalError ? 'me-goal-error' : 'me-goal-hint'}
                  aria-invalid={goalError ? true : undefined}
                  className="w-full min-h-[48px] bg-surface-1 text-ink placeholder:text-ink-tertiary border-[1.5px] border-hairline rounded-subtle pl-8 pr-3 text-base focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                />
              </div>
              <Button type="submit" variant="primary" size="md">
                {t.me.goalSave}
              </Button>
            </div>
            {goalError && (
              <p id="me-goal-error" role="alert" className="mt-1.5 text-sm text-semantic-error font-medium">
                {goalError}
              </p>
            )}
            {dailyGoalPaise && (
              <button
                type="button"
                onClick={() => {
                  setDailyGoalPaise(null);
                  setGoalInput('');
                }}
                className="mt-2 min-h-[40px] text-sm font-semibold text-accent hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t.me.goalRemove}
              </button>
            )}
          </form>

          <SwitchRow id="me-haptics" label={t.me.haptics} checked={haptics} onChange={setHaptics} />
        </div>
      </section>

      {/* APPEARANCE */}
      <section aria-labelledby="me-theme">
        <SectionTitle id="me-theme">{t.theme.title}</SectionTitle>
        <div className="rounded-card bg-surface-1 border border-hairline p-4">
          <div role="group" aria-labelledby="me-theme" className="flex gap-1 p-1 rounded-subtle bg-surface-2">
            {themes.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={theme === id}
                onClick={() => setTheme(id)}
                className={`${segmentClass(theme === id)} flex flex-col items-center justify-center gap-1 py-2 leading-tight`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* LISTENING HELP: read-aloud for people who prefer listening to reading */}
      <section aria-labelledby="me-access">
        <SectionTitle id="me-access">{t.access.title}</SectionTitle>
        <div className="rounded-card bg-surface-1 border border-hairline divide-y divide-hairline-soft">
          {reader.supported && (
            <div className="flex flex-wrap gap-2 p-4">
              <ReadPageButton withLabel />
              <button
                type="button"
                data-no-tap-to-hear
                onClick={() => reader.readText(t.access.testVoiceSample)}
                className="flex items-center gap-2 min-h-[44px] px-3.5 rounded-full border border-hairline bg-surface-1 text-sm font-semibold text-ink hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Volume2 className="w-5 h-5" aria-hidden="true" />
                {t.access.testVoice}
              </button>
            </div>
          )}
          <div className="p-4">
            <p id="me-rate-label" className="text-[0.9375rem] font-semibold text-ink mb-2">
              {t.access.speechRate}
            </p>
            <div role="group" aria-labelledby="me-rate-label" className="flex gap-1 p-1 rounded-subtle bg-surface-2">
              {rates.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={speechRate === r.id}
                  onClick={() => setSpeechRate(r.id)}
                  className={segmentClass(speechRate === r.id)}
                >
                  {r.label}
                  <span className="sr-only"> ({SPEECH_RATES[r.id]}x)</span>
                </button>
              ))}
            </div>
          </div>
          <SwitchRow
            id="me-auto-read"
            label={t.access.autoRead}
            hint={t.access.autoReadHint}
            checked={autoRead}
            onChange={setAutoRead}
          />
          <SwitchRow
            id="me-auto-save-money"
            label={t.autoSave.label}
            hint={t.autoSave.hint}
            checked={autoSaveMoney}
            onChange={setAutoSaveMoney}
          />
          <SwitchRow
            id="me-tap-to-hear"
            label={t.access.tapToHear}
            hint={t.access.tapToHearHint}
            checked={tapToHear}
            onChange={setTapToHear}
          />
        </div>
      </section>

      {/* YOUR DATA */}
      <section aria-labelledby="me-data">
        <SectionTitle id="me-data">{t.me.dataTitle}</SectionTitle>
        <div className="rounded-card bg-surface-1 border border-hairline divide-y divide-hairline-soft overflow-hidden">
          <button type="button" onClick={downloadCsv} className={rowButtonClass}>
            <Download className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
            {t.me.exportCsv}
          </button>
          <button type="button" onClick={onClearChat} disabled={!hasChat} className={rowButtonClass}>
            <MessageSquareX className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
            {t.me.clearChat}
          </button>
          <button type="button" onClick={restartSetup} className={rowButtonClass}>
            <RotateCcw className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
            {t.me.redoSetup}
          </button>
          {!isDemo && !account && (
            <button type="button" onClick={() => setShowDemoLogin(true)} aria-haspopup="dialog" className={rowButtonClass}>
              <PlayCircle className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
              {t.demo.tryDemo}
            </button>
          )}
          <button type="button" onClick={signOut} className={rowButtonClass}>
            <LogOut className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
            {isDemo ? t.demo.logout : t.auth.logout}
            {account && <span className="ml-auto text-sm font-normal text-ink-muted truncate">@{account.username}</span>}
          </button>
          <a href="/admin" className={rowButtonClass}>
            <LayoutDashboard className="w-5 h-5 text-ink-muted shrink-0" aria-hidden="true" />
            {t.demo.adminLink}
          </a>
        </div>
        <p className="flex gap-2 mt-3 px-1 text-sm text-ink-muted">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-semantic-success" aria-hidden="true" />
          {t.me.privacyNote}
        </p>
      </section>

      {/* EMERGENCY NUMBERS: always one tap away, not only behind SOS */}
      <section aria-labelledby="me-helplines">
        <SectionTitle id="me-helplines">{t.me.helplinesTitle}</SectionTitle>
        <ul className="grid grid-cols-2 gap-2">
          {HELPLINES.map((h) => (
            <li key={h.id}>
              <a
                href={`tel:${h.number}`}
                className="flex flex-col gap-1 h-full min-h-[76px] p-3 rounded-subtle bg-surface-1 border border-hairline hover:border-semantic-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="flex items-center gap-1.5 text-xl font-extrabold font-wide text-semantic-error">
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  {h.number}
                </span>
                <span className="text-sm text-ink leading-snug">{h.label[profile.language]}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <Dialog open={showDemoLogin} onClose={() => setShowDemoLogin(false)} title={t.demo.loginTitle}>
        <DemoLoginForm idPrefix="me-demo" onDone={() => setShowDemoLogin(false)} onCancel={() => setShowDemoLogin(false)} />
      </Dialog>
    </div>
  );
};
