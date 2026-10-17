import React from 'react';
import { Square, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useScreenReader } from './ScreenReader';
import { iconButtonClass } from '../layout/ThemeToggle';

/** Reads the current screen aloud (or stops). Hidden when the browser has no speech synthesis. */
export const ReadPageButton: React.FC<{ withLabel?: boolean; className?: string }> = ({ withLabel = false, className = '' }) => {
  const { t } = useApp();
  const { supported, speaking, readPage, stop } = useScreenReader();
  if (!supported) return null;
  const label = speaking ? t.access.stopReading : t.access.readPage;
  const Icon = speaking ? Square : Volume2;

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : readPage())}
      aria-label={withLabel ? undefined : label}
      aria-pressed={speaking}
      title={label}
      data-no-tap-to-hear
      className={
        withLabel
          ? `flex items-center gap-2 min-h-[44px] px-3.5 rounded-full border border-hairline bg-surface-1 text-sm font-semibold hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              speaking ? 'text-accent border-accent' : 'text-ink'
            } ${className}`
          : `${iconButtonClass} ${speaking ? 'text-accent bg-accent-light' : ''} ${className}`
      }
    >
      <Icon className={`w-5 h-5 ${speaking ? 'w-4 h-4 fill-current' : ''}`} aria-hidden="true" />
      {withLabel && <span>{label}</span>}
    </button>
  );
};
