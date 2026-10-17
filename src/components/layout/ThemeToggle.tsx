import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useApp, ThemePreference } from '../../context/AppContext';
import { fill } from '../../features/money/moneyUtils';

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };
const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export const iconButtonClass =
  'flex items-center justify-center w-11 h-11 shrink-0 rounded-full text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** One-tap theme switch: system → light → dark. The full picker lives in the You tab. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme, t } = useApp();
  const Icon = ICONS[theme];
  const label = fill(t.theme.switchTo, { mode: t.theme[theme] });
  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={label}
      title={label}
      data-no-tap-to-hear
      className={`${iconButtonClass} ${className}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};
