import React from 'react';
import { useApp } from '../../context/AppContext';
import { WORKER_ICONS } from '../../constants/workerIcons';

/** Mobile top bar (below md): logo and a profile chip that opens the "You" tab. Desktop uses the Sidebar. */
export const Header: React.FC = () => {
  const { profile, activeTab, setActiveTab, t } = useApp();
  const WorkerIcon = WORKER_ICONS[profile.workerType];

  return (
    <header className="md:hidden sticky top-0 z-30 bg-canvas/90 backdrop-blur-md px-4 pt-2.5 pb-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[1.625rem] leading-none font-extrabold font-wide text-ink shrink-0">
          Kaam<span className="bg-marigold px-1 rounded-md ml-0.5">Pe</span>
        </span>

        {profile.isOnboarded && activeTab !== 'me' && (
          <button
            type="button"
            onClick={() => setActiveTab('me')}
            className="flex items-center gap-2 min-h-[44px] pl-1 pr-3 rounded-full bg-surface-1 border border-hairline hover:border-ink min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center shrink-0" aria-hidden="true">
              <WorkerIcon className="w-[1.125rem] h-[1.125rem]" />
            </span>
            <span className="text-left leading-tight min-w-0">
              <span className="block text-sm font-semibold text-ink truncate">{t.profileEditor.workerShort[profile.workerType]}</span>
              <span className="block text-xs text-ink-muted truncate">{profile.state}</span>
              <span className="sr-only">, {t.me.openProfile}</span>
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
