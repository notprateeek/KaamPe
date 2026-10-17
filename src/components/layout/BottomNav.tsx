import React from 'react';
import { useApp } from '../../context/AppContext';
import { getNavItems } from './navItems';

/** Mobile floating tab bar (below md). Desktop uses the Sidebar. */
export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t } = useApp();

  return (
    <nav
      aria-label={t.a11y.mainNav}
      className="md:hidden fixed inset-x-3 z-40 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] rounded-[1.375rem] bg-ink p-1.5 shadow-float"
    >
      <div className="grid grid-cols-3 gap-1 max-w-xl mx-auto">
        {getNavItems(t).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-center gap-2 min-h-[50px] rounded-2xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold ${
                isActive ? 'bg-marigold text-ink font-bold' : 'text-white hover:bg-white/10 font-semibold'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
