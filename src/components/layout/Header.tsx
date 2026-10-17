import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WORKER_ICONS } from '../../constants/workerIcons';
import { ReadPageButton } from '../speech/ReadPageButton';
import { MobileMenu } from './MobileMenu';
import { iconButtonClass } from './ThemeToggle';

/**
 * Mobile top bar (below md): menu drawer with every tool, logo, read-this-screen
 * and theme buttons, and a profile chip that opens the "You" tab. Desktop uses the Sidebar.
 */
export const Header: React.FC = () => {
  const { profile, activeTab, setActiveTab, t, isDemo } = useApp();
  const WorkerIcon = WORKER_ICONS[profile.workerType];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-30 bg-canvas/90 backdrop-blur-md px-4 pt-2.5 pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 shrink-0 -ml-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.tools.openMenu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={iconButtonClass}
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>
          <span className="text-[1.5rem] leading-none font-extrabold font-wide text-ink">
            Kaam<span className="bg-marigold text-marigold-ink px-1 rounded-md ml-0.5">Pe</span>
          </span>
        </div>

        <div className="flex items-center gap-0.5 min-w-0">
        <ReadPageButton />
        {profile.isOnboarded && activeTab !== 'me' && (
          <button
            type="button"
            onClick={() => setActiveTab('me')}
            className="flex items-center gap-2 min-h-[44px] pl-1 pr-3 rounded-full bg-surface-1 border border-hairline hover:border-ink min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="relative w-9 h-9 rounded-full bg-marigold text-marigold-ink flex items-center justify-center shrink-0" aria-hidden="true">
              <WorkerIcon className="w-[1.125rem] h-[1.125rem]" />
            </span>
            <span className="hidden min-[380px]:block text-left leading-tight min-w-0 max-w-[5.5rem]">
              <span className="block text-sm font-semibold text-ink truncate">{t.profileEditor.workerShort[profile.workerType]}</span>
              <span className={`block text-xs truncate ${isDemo ? 'font-bold text-accent' : 'text-ink-muted'}`}>
                {isDemo ? t.demo.badge : profile.state}
              </span>
            </span>
            <span className="sr-only">
              {isDemo ? `, ${t.demo.badge}` : ''}, {t.me.openProfile}
            </span>
          </button>
        )}
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
};
