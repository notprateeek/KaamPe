import React from 'react';
import { useApp } from '../../context/AppContext';
import { getNavItems } from './navItems';

/** Mobile tab bar docked to the bottom edge (below md). Desktop uses the Sidebar. */
export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t } = useApp();

  return (
    <nav
      aria-label={t.a11y.mainNav}
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-surface-1 shadow-bar pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 max-w-md mx-auto px-1">
        {getNavItems(t).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className="group flex flex-col items-center justify-center gap-1 min-h-[64px] pt-2 pb-1.5 rounded-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <span
                aria-hidden="true"
                className={`flex items-center justify-center h-8 w-14 rounded-full transition-colors ${
                  isActive ? 'bg-ink text-white' : 'text-ink-muted group-hover:bg-wash group-hover:text-ink'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 2} />
              </span>
              <span className={`text-xs leading-none ${isActive ? 'font-bold text-ink' : 'font-medium text-ink-muted'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
