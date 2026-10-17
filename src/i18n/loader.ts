import type { Language, Translations } from './translations';
import { hi } from './locales/hi';

/**
 * Per-language dictionaries, loaded on demand so the main bundle only carries
 * the default language. Hindi is always available synchronously.
 */
const loaded: Partial<Record<Language, Translations>> = { hi };

const loaders: Record<Language, () => Promise<Translations>> = {
  hi: async () => hi,
  en: () => import('./locales/en').then((m) => m.en),
  pa: () => import('./locales/pa').then((m) => m.pa),
};

export const DEFAULT_TRANSLATIONS = hi;

export function getLoadedTranslations(lang: Language): Translations | undefined {
  return loaded[lang];
}

export async function loadTranslations(lang: Language): Promise<Translations> {
  const cached = loaded[lang];
  if (cached) return cached;
  const dict = await (loaders[lang] ?? loaders.hi)();
  loaded[lang] = dict;
  return dict;
}

/** Language saved by AppContext (kaampe_profile) — read before first render so there is no flash of Hindi. */
export function readSavedLanguage(): Language {
  try {
    const raw = localStorage.getItem('kaampe_profile');
    const lang = raw ? (JSON.parse(raw) as { language?: string }).language : undefined;
    return lang === 'en' || lang === 'pa' ? lang : 'hi';
  } catch {
    return 'hi';
  }
}
