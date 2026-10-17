import React from 'react';
import { useApp } from '../../context/AppContext';

/** Toggles the persisted large-text preference (root font-size 100% ↔ 118.75%). */
export const TextSizeToggle: React.FC<{ className?: string; showLabel?: boolean }> = ({
  className = '',
  showLabel = false,
}) => {
  const { t, textSize, setTextSize } = useApp();
  const isLarge = textSize === 'large';

  return (
    <button
      type="button"
      aria-pressed={isLarge}
      aria-label={showLabel ? undefined : t.a11y.largeText}
      title={t.a11y.largeText}
      onClick={() => setTextSize(isLarge ? 'normal' : 'large')}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-2 rounded-subtle border text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isLarge ? 'bg-accent-light border-accent text-accent' : 'bg-surface-1 border-hairline hover:bg-surface-2'
      } ${className}`}
    >
      <span aria-hidden="true" className="font-bold leading-none">
        <span className="text-xs">A</span>
        <span className="text-base">A</span>
      </span>
      {showLabel && <span className="text-sm font-medium">{t.a11y.largeText}</span>}
    </button>
  );
};
