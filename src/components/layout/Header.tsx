import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog } from '../ui/Dialog';
import { LanguageSelect } from './LanguageSelect';
import { TextSizeToggle } from './TextSizeToggle';
import { ProfileEditor } from './ProfileEditor';

/** Mobile top bar (below md): logo, profile chip (opens editor), text size, language. Desktop uses the Sidebar. */
export const Header: React.FC = () => {
  const { profile, t } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-30 bg-surface-1/95 backdrop-blur-md border-b border-hairline px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl leading-none font-extrabold font-wide text-ink shrink-0">
          Kaam<span className="bg-marigold px-1 rounded-md">Pe</span>
        </span>

        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => setIsProfileOpen(true)}
            aria-label={`${t.common.profile} – ${t.profileEditor.edit}`}
            title={`${t.profileEditor.workerShort[profile.workerType]} · ${profile.state}`}
            className="flex items-center justify-center w-11 h-11 rounded-full border-[1.5px] border-ink bg-marigold text-ink shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <Briefcase className="w-5 h-5" aria-hidden="true" />
          </button>
          <TextSizeToggle />
          <LanguageSelect id="language-select-header" className="w-[6.5rem] shrink-0" />
        </div>
      </div>

      <Dialog open={isProfileOpen} onClose={() => setIsProfileOpen(false)} title={t.common.profile}>
        <ProfileEditor idPrefix="sheet-profile" onDone={() => setIsProfileOpen(false)} />
      </Dialog>
    </header>
  );
};
