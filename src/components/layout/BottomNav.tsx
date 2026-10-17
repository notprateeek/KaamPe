import React from 'react';
import { useApp } from '../../context/AppContext';
import { getNavItems } from './navItems';

/** Mobile tab bar (below md). Desktop uses the Sidebar. */
export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t } = useApp();

  return (
    <nav
      aria-label="Main Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-1/95 backdrop-blur-md border-t border-hairline pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-xl mx-auto">
        {getNavItems(t).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-colors min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive ? 'text-accent font-bold' : 'text-ink-muted hover:text-ink font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} aria-hidden="true" />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
