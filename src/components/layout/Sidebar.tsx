import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WORKER_ICONS } from '../../constants/workerIcons';
import { getNavItems } from './navItems';

/** Desktop / tablet navigation (md and up). The mobile layout uses Header + BottomNav instead. */
export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, profile, t } = useApp();
  const WorkerIcon = WORKER_ICONS[profile.workerType];
  const navItems = getNavItems(t).filter((item) => item.id !== 'me');

  return (
    <aside className="hidden md:flex md:flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 border-r border-hairline bg-surface-1 overflow-y-auto">
      <div className="px-6 pt-7 pb-7">
        <span className="text-[1.75rem] leading-none font-extrabold font-wide text-ink">
          Kaam<span className="bg-marigold px-1.5 rounded-md ml-0.5">Pe</span>
        </span>
        <p className="text-sm text-ink-muted mt-2">{t.tagline}</p>
      </div>

      <nav aria-label={t.a11y.mainNav} className="px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 min-h-[56px] rounded-subtle text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive ? 'bg-ink text-white' : 'text-ink hover:bg-wash'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-ink-muted'}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-semibold leading-tight">{item.label}</span>
                    <span className={`block text-xs truncate ${isActive ? 'text-white/80' : 'text-ink-muted'}`}>
                      {item.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile lives in its own tab; this row is the way in on desktop. */}
      <div className="mt-auto p-3">
        <button
          type="button"
          onClick={() => setActiveTab('me')}
          aria-current={activeTab === 'me' ? 'page' : undefined}
          className={`w-full flex items-center gap-3 p-2.5 rounded-subtle text-left border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            activeTab === 'me' ? 'bg-ink border-ink text-white' : 'bg-surface-2 border-hairline-soft text-ink hover:border-ink'
          }`}
        >
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              activeTab === 'me' ? 'bg-white text-ink' : 'bg-ink text-white'
            }`}
            aria-hidden="true"
          >
            <WorkerIcon className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0 leading-tight">
            <span className="block text-sm font-semibold truncate">{t.profileEditor.workerShort[profile.workerType]}</span>
            <span className={`block text-xs truncate ${activeTab === 'me' ? 'text-white/80' : 'text-ink-muted'}`}>
              {profile.state}
            </span>
            <span className="sr-only">, {t.me.openProfile}</span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 opacity-70" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
