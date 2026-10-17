import React from 'react';
import { useApp } from '../../context/AppContext';
import { LanguageSelect } from './LanguageSelect';

/** Mobile top bar (below md). Desktop uses the Sidebar. */
export const Header: React.FC = () => {
  const { t } = useApp();

  return (
    <header className="md:hidden sticky top-0 z-30 bg-canvas/90 backdrop-blur-md border-b border-hairline-soft px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xl font-bold tracking-tight text-ink">
            Kaam<span className="text-accent">Pe</span>
          </span>
          <span className="hidden sm:inline-block ml-2 text-xs text-ink-muted">{t.tagline}</span>
        </div>

        <LanguageSelect id="language-select-header" className="w-32 shrink-0" />
      </div>
    </header>
  );
};
