import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Language, translations, Translations } from '../i18n/translations';
import { safeGetItem, safeSetItem } from '../lib/storage';
import type { HelpTab } from '../features/help/HelpView';

export interface UserProfile {
  language: Language;
  workerType: 'delivery' | 'driver' | 'construction' | 'domestic' | 'daily_wage' | 'street_vendor' | 'other';
  state: string;
  isOnboarded: boolean;
}

export type TextSize = 'normal' | 'large' | 'xlarge';
export type ThemePreference = 'system' | 'light' | 'dark';
export type SpeechRate = 'slow' | 'normal' | 'fast';

/** Utterance rate for each speech-speed preference. */
export const SPEECH_RATES: Record<SpeechRate, number> = { slow: 0.75, normal: 0.95, fast: 1.2 };

/** Profile returned by the server for the current session (GET /api/session, demo login). */
export interface ServerSession {
  language?: Language;
  workerType?: UserProfile['workerType'];
  state?: string;
  isDemo?: boolean;
  account?: Account | null;
}

/** Signed-in account (username/password). Demo and guest sessions have none. */
export interface Account {
  username: string;
  name: string | null;
}
export type TabId = 'home' | 'money' | 'help' | 'me';

interface AppContextType {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  t: Translations;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  updateLanguage: (lang: Language) => Promise<void>;
  completeOnboarding: (workerType: UserProfile['workerType'], state: string) => Promise<void>;
  isLoadingSession: boolean;
  /** Persisted large-text preference (scales the root font size). */
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  /** Optional daily earnings target in integer paise (null = not set). */
  dailyGoalPaise: number | null;
  setDailyGoalPaise: (paise: number | null) => void;
  /** Short vibration when money is saved (phones that support it). */
  haptics: boolean;
  setHaptics: (on: boolean) => void;
  /** Vibrates briefly if haptics are on and supported. */
  buzz: () => void;
  /** Re-open onboarding (profile stays; user can re-pick language/work/state). */
  restartSetup: () => void;
  /** Light / dark / follow the device. */
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  /** The theme actually shown right now. */
  resolvedTheme: 'light' | 'dark';
  /** Read-aloud speed for every Listen button and the screen reader helpers. */
  speechRate: SpeechRate;
  setSpeechRate: (rate: SpeechRate) => void;
  /** Speak each new KaamPe reply automatically. */
  autoRead: boolean;
  setAutoRead: (on: boolean) => void;
  /** Save money entries from chat without the confirmation tap (off by default; Undo is offered). */
  autoSaveMoney: boolean;
  setAutoSaveMoney: (on: boolean) => void;
  /** Tap any text on screen to hear it read aloud. */
  tapToHear: boolean;
  setTapToHear: (on: boolean) => void;
  /** True while signed in to the seeded demo account. */
  isDemo: boolean;
  /** Adopt a server session (after demo login / logout) and skip onboarding. */
  adoptSession: (session: ServerSession, opts?: { onboarded?: boolean }) => void;
  /** Bumped whenever the server session changes, so views refetch their data. */
  sessionVersion: number;
  account: Account | null;
  /** True until the worker picks demo, signs in, or continues as a guest. */
  needsLogin: boolean;
  continueAsGuest: () => void;
  /** Ends the current session (any kind) and returns to the sign-in screen. */
  logout: () => Promise<boolean>;
  /** Help sub-section shown when activeTab is 'help'. */
  helpTab: HelpTab;
  /** Remember the Help sub-section without re-opening it (in-page tab switch). */
  setHelpTab: (tab: HelpTab) => void;
  /** Navigate to a Help sub-section from anywhere (nav, cards). */
  openHelp: (tab: HelpTab) => void;
  /** Changes on every openHelp(), so Help re-opens on the requested section. */
  helpNavKey: number;
}

const PROFILE_KEY = 'kaampe_profile';
const ONBOARDED_KEY = 'kaampe_onboarded';
const TEXT_SIZE_KEY = 'kaampe_text_size';
const GOAL_KEY = 'kaampe_daily_goal_paise';
const HAPTICS_KEY = 'kaampe_haptics';
// Must match public/theme-init.js, which applies the theme before first paint.
const THEME_KEY = 'kaampe_theme';
const SPEECH_RATE_KEY = 'kaampe_speech_rate';
const AUTO_READ_KEY = 'kaampe_auto_read';
const AUTO_SAVE_MONEY_KEY = 'kaampe_auto_save_money';
const TAP_TO_HEAR_KEY = 'kaampe_tap_to_hear';
// Set once the worker chose to use KaamPe without an account (or had already onboarded as a guest).
const GUEST_KEY = 'kaampe_guest';
const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
const SPEECH_RATE_IDS: SpeechRate[] = ['slow', 'normal', 'fast'];
const THEME_COLORS = { light: '#EEF0F7', dark: '#0E1222' } as const;

const systemPrefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const TEXT_SIZES: TextSize[] = ['normal', 'large', 'xlarge'];

function loadGoal(): number | null {
  const n = Number(safeGetItem(GOAL_KEY));
  return Number.isInteger(n) && n > 0 ? n : null;
}
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

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    const saved = safeGetItem(TEXT_SIZE_KEY) as TextSize | null;
    return saved && TEXT_SIZES.includes(saved) ? saved : 'normal';
  });
  const [dailyGoalPaise, setDailyGoalState] = useState<number | null>(loadGoal);
  const [haptics, setHapticsState] = useState(() => safeGetItem(HAPTICS_KEY) !== 'off');
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const saved = safeGetItem(THEME_KEY) as ThemePreference | null;
    return saved && THEMES.includes(saved) ? saved : 'system';
  });
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const [speechRate, setSpeechRateState] = useState<SpeechRate>(() => {
    const saved = safeGetItem(SPEECH_RATE_KEY) as SpeechRate | null;
    return saved && SPEECH_RATE_IDS.includes(saved) ? saved : 'normal';
  });
  const [autoRead, setAutoReadState] = useState(() => safeGetItem(AUTO_READ_KEY) === 'on');
  const [autoSaveMoney, setAutoSaveMoneyState] = useState(() => safeGetItem(AUTO_SAVE_MONEY_KEY) === 'on');
  const [tapToHear, setTapToHearState] = useState(() => safeGetItem(TAP_TO_HEAR_KEY) === 'on');
  const [isDemo, setIsDemo] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);
  // Returning guests who finished onboarding before sign-in existed are never locked out.
  const [guestChosen, setGuestChosen] = useState(
    () => safeGetItem(GUEST_KEY) === 'true' || safeGetItem(ONBOARDED_KEY) === 'true'
  );
  const [helpTab, setHelpTab] = useState<HelpTab>('doc');
  const [helpNavKey, setHelpNavKey] = useState(0);
  const resolvedTheme: 'light' | 'dark' = theme === 'dark' || (theme === 'system' && systemDark) ? 'dark' : 'light';

  // Follow the device setting live while the preference is "system".
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === 'dark';
    if (root.classList.contains('dark') !== isDark) {
      // Brief cross-fade only when the theme actually changes after load
      root.classList.add('theme-transition');
      window.setTimeout(() => root.classList.remove('theme-transition'), 250);
    }
    root.classList.toggle('dark', isDark);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLORS[resolvedTheme]));
  }, [resolvedTheme]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('tap-to-hear', tapToHear);
  }, [tapToHear]);

  // <html lang> must reflect the active language from first paint, not only after a change.
  useLayoutEffect(() => {
    document.documentElement.lang = profile.language;
  }, [profile.language]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('text-large', textSize === 'large');
    document.documentElement.classList.toggle('text-xlarge', textSize === 'xlarge');
  }, [textSize]);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    safeSetItem(TEXT_SIZE_KEY, size);
  }, []);

  const setDailyGoalPaise = useCallback((paise: number | null) => {
    setDailyGoalState(paise);
    safeSetItem(GOAL_KEY, paise ? String(paise) : '');
  }, []);

  const setHaptics = useCallback((on: boolean) => {
    setHapticsState(on);
    safeSetItem(HAPTICS_KEY, on ? 'on' : 'off');
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    safeSetItem(THEME_KEY, next);
  }, []);

  const setSpeechRate = useCallback((rate: SpeechRate) => {
    setSpeechRateState(rate);
    safeSetItem(SPEECH_RATE_KEY, rate);
  }, []);

  const setAutoRead = useCallback((on: boolean) => {
    setAutoReadState(on);
    safeSetItem(AUTO_READ_KEY, on ? 'on' : 'off');
  }, []);

  const setAutoSaveMoney = useCallback((on: boolean) => {
    setAutoSaveMoneyState(on);
    safeSetItem(AUTO_SAVE_MONEY_KEY, on ? 'on' : 'off');
  }, []);

  const setTapToHear = useCallback((on: boolean) => {
    setTapToHearState(on);
    safeSetItem(TAP_TO_HEAR_KEY, on ? 'on' : 'off');
  }, []);

  const buzz = useCallback(() => {
    if (haptics && typeof navigator.vibrate === 'function') navigator.vibrate(18);
  }, [haptics]);

  const restartSetup = useCallback(() => {
    commitProfile({ isOnboarded: false });
    safeSetItem(ONBOARDED_KEY, 'false');
    setActiveTab('home');
  }, [commitProfile]);

  const adoptSession = useCallback(
    (s: ServerSession, opts: { onboarded?: boolean } = {}) => {
      const prev = profileRef.current;
      const onboarded = opts.onboarded ?? prev.isOnboarded;
      commitProfile({
        language: s.language && LANGUAGES.includes(s.language) ? s.language : prev.language,
        workerType: s.workerType || prev.workerType,
        state: s.state || prev.state,
        isOnboarded: onboarded,
      });
      safeSetItem(ONBOARDED_KEY, onboarded ? 'true' : 'false');
      setIsDemo(!!s.isDemo);
      setAccount(s.account ?? null);
      setSessionVersion((v) => v + 1);
      setActiveTab('home');
    },
    [commitProfile]
  );

  const continueAsGuest = useCallback(() => {
    setGuestChosen(true);
    safeSetItem(GUEST_KEY, 'true');
  }, []);

  const logout = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      setGuestChosen(false);
      safeSetItem(GUEST_KEY, 'false');
      adoptSession({ ...data.session, isDemo: false, account: null }, { onboarded: false });
      return true;
    } catch {
      return false;
    }
  }, [adoptSession]);

  const openHelp = useCallback((tab: HelpTab) => {
    setHelpTab(tab);
    setHelpNavKey((k) => k + 1);
    setActiveTab('help');
  }, []);

  // Sync with backend session on mount
  useEffect(() => {
    fetch('/api/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.session) {
          const s = data.session;
          setIsDemo(!!s.isDemo);
          setAccount(s.account ?? null);
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
        dailyGoalPaise,
        setDailyGoalPaise,
        haptics,
        setHaptics,
        buzz,
        restartSetup,
        theme,
        setTheme,
        resolvedTheme,
        speechRate,
        setSpeechRate,
        autoRead,
        setAutoRead,
        autoSaveMoney,
        setAutoSaveMoney,
        tapToHear,
        setTapToHear,
        isDemo,
        adoptSession,
        sessionVersion,
        account,
        needsLogin: !isLoadingSession && !isDemo && !account && !guestChosen,
        continueAsGuest,
        logout,
        helpTab,
        setHelpTab,
        openHelp,
        helpNavKey,
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
