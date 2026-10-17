import React from 'react';
import { ChevronDown, Languages } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../i18n/translations';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

/**
 * Native <select> so it works with screen readers and opens the OS picker on phones.
 * `showLabel` renders a visible label above the control (sidebar); otherwise it is screen-reader only.
 */
export const LanguageSelect: React.FC<{ id: string; showLabel?: boolean; className?: string }> = ({
  id,
  showLabel = false,
  className = '',
}) => {
  const { profile, updateLanguage, t } = useApp();

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          showLabel
            ? 'block text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-muted mb-1.5'
            : 'sr-only'
        }
      >
        {t.common.language}
      </label>
      <div className="relative">
        <Languages
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted"
          aria-hidden="true"
        />
        <select
          id={id}
          value={profile.language}
          onChange={(e) => updateLanguage(e.target.value as Language)}
          className="w-full appearance-none bg-surface-1 text-ink text-sm font-semibold border-[1.5px] border-hairline rounded-full pl-8 pr-7 py-2 min-h-[44px] cursor-pointer hover:border-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
