import React, { useState } from 'react';
import { MapPin, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LanguageSelect } from './LanguageSelect';
import { TextSizeToggle } from './TextSizeToggle';
import { ProfileEditor } from './ProfileEditor';
import { getNavItems } from './navItems';

/** Desktop / tablet navigation (md and up). The mobile layout uses Header + BottomNav instead. */
export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, profile, t } = useApp();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  return (
    <aside className="hidden md:flex md:flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 border-r border-hairline bg-surface-1 overflow-y-auto">
      <div className="px-6 pt-6 pb-6">
        <span className="text-[1.75rem] leading-none font-extrabold font-wide text-ink">
          Kaam<span className="bg-marigold px-1.5 rounded-md">Pe</span>
        </span>
        <p className="text-sm text-ink-muted mt-2">{t.tagline}</p>
      </div>

      <nav aria-label={t.a11y.mainNav} className="px-3">
        <ul className="space-y-1.5">
          {getNavItems(t).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[60px] rounded-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                    isActive ? 'bg-ink text-white' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-subtle flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-marigold text-ink' : 'bg-surface-2 text-ink'
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-bold leading-tight">{item.label}</span>
                    <span className={`block text-sm truncate ${isActive ? 'text-white/85' : 'text-ink-muted'}`}>
                      {item.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto px-4 py-5 space-y-4">
        <section className="rounded-card border border-hairline bg-surface-2 p-4" aria-labelledby="sidebar-profile-title">
          <div className="flex items-center justify-between mb-2">
            <h2 id="sidebar-profile-title" className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {t.common.profile}
            </h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-sm font-bold text-accent hover:text-accent-hover hover:underline underline-offset-2 min-h-[32px] px-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                {t.profileEditor.edit}
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <ProfileEditor idPrefix="sidebar-profile" onDone={() => setIsEditingProfile(false)} />
          ) : (
            <div className="space-y-1.5 text-[0.9375rem] text-ink">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                <span className="truncate">{t.profileEditor.workerShort[profile.workerType]}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                <span className="truncate">{profile.state}</span>
              </div>
            </div>
          )}
        </section>

        <LanguageSelect id="language-select-sidebar" showLabel />
        <TextSizeToggle showLabel className="w-full justify-start" />
      </div>
    </aside>
  );
};
