import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, Translations } from '../i18n/translations';

export interface UserProfile {
  language: Language;
  workerType: 'delivery' | 'driver' | 'construction' | 'domestic' | 'daily_wage' | 'other';
  state: string;
  isOnboarded: boolean;
}

interface AppContextType {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  t: Translations;
  activeTab: 'home' | 'money' | 'help';
  setActiveTab: (tab: 'home' | 'money' | 'help') => void;
  updateLanguage: (lang: Language) => Promise<void>;
  completeOnboarding: (workerType: UserProfile['workerType'], state: string) => Promise<void>;
  isLoadingSession: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Check localStorage cache for instant fast loading
    const cached = localStorage.getItem('kaampe_profile');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return {
      language: 'hi',
      workerType: 'delivery',
      state: 'Punjab',
      isOnboarded: false,
    };
  });

  const [activeTab, setActiveTab] = useState<'home' | 'money' | 'help'>('home');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Sync with backend session on mount
  useEffect(() => {
    fetch('/api/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.session) {
          const s = data.session;
          const onboarded = localStorage.getItem('kaampe_onboarded') === 'true';
          setProfile((prev) => ({
            ...prev,
            language: s.language || prev.language,
            workerType: s.workerType || prev.workerType,
            state: s.state || prev.state,
            isOnboarded: onboarded,
          }));
        }
      })
      .catch((err) => console.warn('[Session Fetch Warn]', err))
      .finally(() => setIsLoadingSession(false));
  }, []);

  const updateLanguage = async (newLang: Language) => {
    setProfile((prev) => {
      const next = { ...prev, language: newLang };
      localStorage.setItem('kaampe_profile', JSON.stringify(next));
      return next;
    });

    document.documentElement.lang = newLang;

    try {
      await fetch('/api/session/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          language: newLang,
          workerType: profile.workerType,
          state: profile.state,
        }),
      });
    } catch (err) {
      console.warn('[Sync Language Warn]', err);
    }
  };

  const completeOnboarding = async (workerType: UserProfile['workerType'], state: string) => {
    const updated: UserProfile = {
      ...profile,
      workerType,
      state,
      isOnboarded: true,
    };
    setProfile(updated);
    localStorage.setItem('kaampe_profile', JSON.stringify(updated));
    localStorage.setItem('kaampe_onboarded', 'true');

    try {
      await fetch('/api/session/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          language: profile.language,
          workerType,
          state,
        }),
      });
    } catch (err) {
      console.warn('[Onboarding Sync Warn]', err);
    }
  };

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
