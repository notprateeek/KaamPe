import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Language, translations, Translations } from '../i18n/translations';
import { safeGetItem, safeSetItem } from '../lib/storage';

export interface UserProfile {
  language: Language;
  workerType: 'delivery' | 'driver' | 'construction' | 'domestic' | 'daily_wage' | 'street_vendor' | 'other';
  state: string;
  isOnboarded: boolean;
}

export type TextSize = 'normal' | 'large';

interface AppContextType {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  t: Translations;
  activeTab: 'home' | 'money' | 'help';
  setActiveTab: (tab: 'home' | 'money' | 'help') => void;
  updateLanguage: (lang: Language) => Promise<void>;
  completeOnboarding: (workerType: UserProfile['workerType'], state: string) => Promise<void>;
  isLoadingSession: boolean;
  /** Persisted large-text preference (scales the root font size). */
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const PROFILE_KEY = 'kaampe_profile';
const ONBOARDED_KEY = 'kaampe_onboarded';
const TEXT_SIZE_KEY = 'kaampe_text_size';
const LANGUAGES: Language[] = ['hi', 'en', 'pa'];

const DEFAULT_PROFILE: UserProfile = {
  language: 'hi',
  workerType: 'delivery',
  state: 'Punjab',
  isOnboarded: false,
};

function loadCachedProfile(): UserProfile {
  const cached = safeGetItem(PROFILE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as Partial<UserProfile>;
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        language: LANGUAGES.includes(parsed.language as Language) ? (parsed.language as Language) : 'hi',
      };
    } catch {
      /* corrupted cache — fall back to defaults */
    }
  }
  return DEFAULT_PROFILE;
}

function postProfile(p: Pick<UserProfile, 'language' | 'workerType' | 'state'>) {
  return fetch('/api/session/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language: p.language, workerType: p.workerType, state: p.state }),
  });
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile>(loadCachedProfile);
  // Always-current profile so async actions never post stale fields.
  const profileRef = useRef(profile);
  // Set once the user picks a language, so a slow session fetch can't overwrite it.
  const languageTouchedRef = useRef(false);

  const setProfile: React.Dispatch<React.SetStateAction<UserProfile>> = useCallback((action) => {
    const next = typeof action === 'function' ? action(profileRef.current) : action;
    profileRef.current = next;
    setProfileState(next);
  }, []);

  /** Update the profile synchronously (ref + state + cache) and return the new value. */
  const commitProfile = useCallback((patch: Partial<UserProfile>): UserProfile => {
    const next = { ...profileRef.current, ...patch };
    profileRef.current = next;
    setProfileState(next);
    safeSetItem(PROFILE_KEY, JSON.stringify(next));
    return next;
  }, []);

  const [activeTab, setActiveTab] = useState<'home' | 'money' | 'help'>('home');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [textSize, setTextSizeState] = useState<TextSize>(() =>
    safeGetItem(TEXT_SIZE_KEY) === 'large' ? 'large' : 'normal'
  );

  // <html lang> must reflect the active language from first paint, not only after a change.
  useLayoutEffect(() => {
    document.documentElement.lang = profile.language;
  }, [profile.language]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('text-large', textSize === 'large');
  }, [textSize]);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    safeSetItem(TEXT_SIZE_KEY, size);
  }, []);

  // Sync with backend session on mount
  useEffect(() => {
    fetch('/api/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.session) {
          const s = data.session;
          const onboarded = safeGetItem(ONBOARDED_KEY) === 'true';
          const prev = profileRef.current;
          commitProfile({
            language:
              !languageTouchedRef.current && LANGUAGES.includes(s.language) ? s.language : prev.language,
            workerType: s.workerType || prev.workerType,
            state: s.state || prev.state,
            isOnboarded: onboarded,
          });
        }
      })
      .catch((err) => console.warn('[Session Fetch Warn]', err))
      .finally(() => setIsLoadingSession(false));
  }, [commitProfile]);

  const updateLanguage = useCallback(
    async (newLang: Language) => {
      languageTouchedRef.current = true;
      const next = commitProfile({ language: newLang });
      try {
        await postProfile(next);
      } catch (err) {
        console.warn('[Sync Language Warn]', err);
      }
    },
    [commitProfile]
  );

  const completeOnboarding = useCallback(
    async (workerType: UserProfile['workerType'], state: string) => {
      // Reads the latest language even if updateLanguage ran in the same tick.
      const next = commitProfile({ workerType, state, isOnboarded: true });
      safeSetItem(ONBOARDED_KEY, 'true');
      try {
        await postProfile(next);
      } catch (err) {
        console.warn('[Onboarding Sync Warn]', err);
      }
    },
    [commitProfile]
  );

  const t = translations[profile.language] || translations.hi;

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        t,
        activeTab,
        setActiveTab,
        updateLanguage,
        completeOnboarding,
        isLoadingSession,
        textSize,
        setTextSize,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
