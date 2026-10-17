import React from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Language } from '../../i18n/translations';
import { WORKER_ICONS } from '../../constants/workerIcons';
import { useToast } from '../ui/Toast';
import { getToolItems, isToolActive, type ToolItem } from './navItems';
import { ThemeToggle } from './ThemeToggle';
import { ReadPageButton } from '../speech/ReadPageButton';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

/** Tools list shared by the desktop sidebar and the mobile drawer. */
export const ToolList: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { t, activeTab, setActiveTab, helpTab, openHelp } = useApp();

  const go = (item: ToolItem) => {
    if ('tab' in item.target) setActiveTab(item.target.tab);
    else openHelp(item.target.help);
    onNavigate?.();
  };

  return (
    <nav aria-label={t.a11y.mainNav}>
      <p className="px-3 mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">{t.tools.title}</p>
      <ul className="space-y-0.5">
        {getToolItems(t).map((item) => {
          const Icon = item.icon;
          const active = isToolActive(item, activeTab, helpTab);
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => go(item)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 min-h-[52px] rounded-subtle text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active ? 'bg-ink text-inverse' : 'text-ink hover:bg-wash'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    active ? 'bg-marigold text-marigold-ink' : 'bg-surface-2 text-ink-muted'
                  }`}
                  aria-hidden="true"
                >
                  <Icon className="w-[1.125rem] h-[1.125rem]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold leading-tight">{item.label}</span>
                  <span className={`block text-xs truncate ${active ? 'text-inverse/80' : 'text-ink-muted'}`}>
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

/** Language, read-aloud and theme in one compact row. */
export const QuickPrefs: React.FC<{ idPrefix: string }> = ({ idPrefix }) => {
  const { t, profile, updateLanguage } = useApp();
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={`${idPrefix}-lang`} className="sr-only">
        {t.common.language}
      </label>
      <select
        id={`${idPrefix}-lang`}
        value={profile.language}
        onChange={(e) => updateLanguage(e.target.value as Language)}
        className="min-h-[44px] min-w-0 flex-1 rounded-full bg-surface-2 text-ink border border-hairline px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <ReadPageButton className="border border-hairline bg-surface-2" />
      <ThemeToggle className="border border-hairline bg-surface-2" />
    </div>
  );
};

/** Who is signed in (account / demo / guest), a way into "You", and logout. */
export const UserCard: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { t, profile, account, isDemo, activeTab, setActiveTab, logout } = useApp();
  const { showToast } = useToast();
  const WorkerIcon = WORKER_ICONS[profile.workerType];
  const title = account?.name || account?.username || t.profileEditor.workerShort[profile.workerType];
  const subtitle = isDemo ? t.demo.badge : account ? `@${account.username}` : t.auth.guestLabel;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setActiveTab('me');
          onNavigate?.();
        }}
        aria-current={activeTab === 'me' ? 'page' : undefined}
        className={`group flex-1 min-w-0 flex items-center gap-3 px-2.5 min-h-[56px] rounded-subtle text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          activeTab === 'me' ? 'bg-ink text-inverse' : 'text-ink hover:bg-wash'
        }`}
      >
        {/* Marigold badge, like the "Pe" in the logo: reads the same in light and dark themes. */}
        <span className="w-9 h-9 rounded-full bg-marigold text-marigold-ink flex items-center justify-center shrink-0" aria-hidden="true">
          <WorkerIcon className="w-[1.125rem] h-[1.125rem]" />
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <span className="block text-[0.9375rem] font-semibold truncate">{title}</span>
          <span
            className={`block text-xs truncate ${
              activeTab === 'me' ? 'text-inverse/80' : isDemo ? 'font-bold text-accent' : 'text-ink-muted'
            }`}
          >
            {subtitle} · {profile.state}
          </span>
          <span className="sr-only">, {t.me.openProfile}</span>
        </span>
        <ChevronRight className={`w-4 h-4 shrink-0 ${activeTab === 'me' ? 'text-inverse/80' : 'text-ink-muted'}`} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={async () => {
          const ok = await logout();
          showToast(ok ? t.auth.loggedOut : t.common.error);
          onNavigate?.();
        }}
        aria-label={t.auth.logout}
        title={t.auth.logout}
        className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full text-ink-muted hover:text-semantic-error hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <LogOut className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
};
