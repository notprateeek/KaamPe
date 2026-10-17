import React from 'react';
import { useApp } from '../../context/AppContext';
import { QuickPrefs, ToolList, UserCard } from './NavPanel';

/** Desktop / tablet navigation (md and up): every tool, quick preferences and the signed-in user. */
export const Sidebar: React.FC = () => {
  const { t, isDemo } = useApp();

  return (
    <aside className="hidden md:flex md:flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 border-r border-hairline bg-surface-1 overflow-y-auto">
      <div className="px-6 pt-6 pb-5">
        <span className="text-[1.75rem] leading-none font-extrabold font-wide text-ink">
          Kaam<span className="bg-marigold text-marigold-ink px-1.5 rounded-md ml-0.5">Pe</span>
        </span>
        <p className="text-sm text-ink-muted mt-1.5">{t.tagline}</p>
        {isDemo && (
          <span className="inline-block mt-2.5 text-xs font-bold px-2 py-1 rounded-full bg-accent-light text-accent border border-accent-subtle">
            {t.demo.badge}
          </span>
        )}
      </div>

      <div className="px-3">
        <ToolList />
      </div>

      <div className="mt-auto px-3 pb-4 pt-3 space-y-2 border-t border-hairline-soft">
        <QuickPrefs idPrefix="sidebar" />
        <UserCard />
      </div>
    </aside>
  );
};
