import type { Language } from '../i18n/translations';

/** BCP-47 locale used for speech recognition and synthesis per UI language. */
export const SPEECH_LOCALES: Record<Language, string> = {
  hi: 'hi-IN',
  pa: 'pa-IN',
  en: 'en-IN',
};
