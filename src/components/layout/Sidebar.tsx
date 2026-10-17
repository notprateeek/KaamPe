import React from 'react';
import { MapPin, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LanguageSelect } from './LanguageSelect';
import { getNavItems } from './navItems';

/** Desktop / tablet navigation (md and up). The mobile layout uses Header + BottomNav instead. */
export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, profile, t } = useApp();
  const items = getNavItems(t);

  return (
    <aside className="hidden md:flex md:flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 border-r border-hairline bg-surface-1">
      <div className="px-6 pt-7 pb-6">
        <span className="text-2xl font-bold tracking-tight text-ink">
          Kaam<span className="text-accent">Pe</span>
        </span>
        <p className="text-xs text-ink-muted mt-1">{t.tagline}</p>
      </div>

      <nav aria-label="Main Navigation" className="px-3 flex-1">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-subtle text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive ? 'bg-accent-light text-accent' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-subtle flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-accent text-white' : 'bg-surface-2 text-ink-muted'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs text-ink-muted truncate">{item.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 py-5 border-t border-hairline-soft space-y-4">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
            {t.common.profile}
          </span>
          <div className="space-y-1 text-sm text-ink">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
              <span className="truncate">{t.onboarding.workerTypes[profile.workerType]}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
              <span className="truncate">{profile.state}</span>
            </div>
          </div>
        </div>
        <LanguageSelect id="language-select-sidebar" showLabel />
      </div>
    </aside>
  );
};
