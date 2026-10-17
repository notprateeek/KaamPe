import { HELPLINES, type HelplineLanguage } from '../../../shared/helplines.js';

/**
 * Deterministic safety helpers used around model calls.
 */

const ALLOWED_HELPLINE_NUMBERS = new Set(HELPLINES.map((h) => h.number));

/**
 * Masks long digit runs (Aadhaar, bank account, card numbers, phone numbers)
 * before user text is sent to the model or stored. Amounts in rupees are far
 * shorter than 9 digits, so money parsing is unaffected.
 */
export function redactSensitive(text: string): string {
  return text
    // Aadhaar / card style groups: "1234 5678 9012", "1234-5678-9012-3456".
    .replace(/(?<!\d)\d{4}[ -]\d{4}[ -]\d{4}(?:[ -]\d{4})?(?!\d)/g, '[number hidden]')
    // Continuous 9-18 digit runs: account numbers, Aadhaar, phone numbers.
    .replace(/(?<![\d₹])\+?\d{9,18}(?!\d)/g, '[number hidden]')
    // OTP / PIN / CVV followed by a short code.
    .replace(/\b(otp|pin|cvv|password|passcode)\b(\s*(?:is|hai|:|-|=)?\s*)\d{3,8}\b/gi, '$1$2[hidden]');
}

const PHONE_CONTEXT =
  /(call|dial|phone|helpline|toll[- ]?free|number|contact|sampark|कॉल|फोन|फ़ोन|नंबर|हेल्पलाइन|संपर्क|ਕਾਲ|ਫ਼ੋਨ|ਫੋਨ|ਨੰਬਰ|ਹੈਲਪਲਾਈਨ|ਸੰਪਰਕ)/i;

/**
 * Returns phone-number-like strings in model output that are not on the
 * trusted helpline list (and were not written by the user). Catches 10+ digit
 * numbers anywhere and 3-8 digit numbers that follow a "call/helpline/number"
 * word in English, Hindi or Punjabi.
 */
export function findUnlistedPhoneNumbers(texts: string[], userText = ''): string[] {
  const userDigits = new Set((userText.match(/\d+/g) || []).map((d) => d));
  const found = new Set<string>();
  for (const text of texts) {
    if (typeof text !== 'string') continue;
    for (const m of text.matchAll(/(?<!\d)(\+?\d(?:[ -]?\d){9,})(?!\d)/g)) {
      const digits = m[1].replace(/\D/g, '');
      if (!ALLOWED_HELPLINE_NUMBERS.has(digits) && !userDigits.has(digits)) found.add(m[1]);
    }
    for (const m of text.matchAll(/(?<![\d₹.,])(\d{3,8})(?![\d.,])/g)) {
      const digits = m[1];
      if (ALLOWED_HELPLINE_NUMBERS.has(digits) || userDigits.has(digits)) continue;
      const before = text.slice(Math.max(0, (m.index ?? 0) - 25), m.index ?? 0);
      if (PHONE_CONTEXT.test(before)) found.add(digits);
    }
  }
  return [...found];
}

export interface LocalizedHelpline {
  id: string;
  label: string;
  number: string;
}

export function localizedHelplines(language: HelplineLanguage): LocalizedHelpline[] {
  return HELPLINES.map((h) => ({ id: h.id, label: h.label[language], number: h.number }));
}

/** Deterministic safety answer used when the model is unavailable or unsafe. */
export function safetyFallback(language: HelplineLanguage) {
  const helplines = localizedHelplines(language);
  const helplineSteps = helplines.map((h) => `${h.label}: ${h.number}`);
  if (language === 'hi') {
    return {
      directAnswer: 'Agar jaan ka khatra, chot ya hinsa ho to turant 112 par call karein. Garmi mein paani peete rahein, chhaon mein aaram karein aur helmet/safety gear pehnein.',
      steps: [
        'Khatra ho to kaam rok kar kisi surakshit, logon wali jagah par jaayein.',
        'OTP, PIN ya password kisi ko na batayein — UPI/online dhokhe par 1930 par call karein.',
        ...helplineSteps,
      ],
      helplines,
    };
  }
  if (language === 'pa') {
    return {
      directAnswer: 'ਜੇ ਜਾਨ ਨੂੰ ਖ਼ਤਰਾ, ਸੱਟ ਜਾਂ ਹਿੰਸਾ ਹੋਵੇ ਤਾਂ ਤੁਰੰਤ 112 \'ਤੇ ਕਾਲ ਕਰੋ। ਗਰਮੀ ਵਿੱਚ ਪਾਣੀ ਪੀਂਦੇ ਰਹੋ, ਛਾਂ ਵਿੱਚ ਆਰਾਮ ਕਰੋ ਅਤੇ ਹੈਲਮੇਟ/ਸੇਫਟੀ ਗੀਅਰ ਪਾਓ।',
      steps: [
        'ਖ਼ਤਰਾ ਹੋਵੇ ਤਾਂ ਕੰਮ ਰੋਕ ਕੇ ਕਿਸੇ ਸੁਰੱਖਿਅਤ, ਲੋਕਾਂ ਵਾਲੀ ਥਾਂ \'ਤੇ ਜਾਓ।',
        'OTP, PIN ਜਾਂ ਪਾਸਵਰਡ ਕਿਸੇ ਨੂੰ ਨਾ ਦੱਸੋ — UPI/ਆਨਲਾਈਨ ਧੋਖੇ \'ਤੇ 1930 \'ਤੇ ਕਾਲ ਕਰੋ।',
        ...helplineSteps,
      ],
      helplines,
    };
  }
  return {
    directAnswer: 'If there is danger to life, an injury or violence, call 112 right away. In heat, keep drinking water, rest in shade and wear your helmet and safety gear.',
    steps: [
      'If you feel unsafe, stop work and move to a safe, public place.',
      'Never share your OTP, PIN or password — for UPI/online fraud call 1930 quickly.',
      ...helplineSteps,
    ],
    helplines,
  };
}

/** Deterministic general answer used when the model is unavailable. */
export function generalFallback(language: HelplineLanguage) {
  if (language === 'hi') {
    return {
      directAnswer: 'Namaste! Kaam, kamai, sarkari yojana ya payment se juda koi bhi sawaal poochhein.',
      steps: ['Apni aaj ki kamai chat mein likhein, jaise "Aaj 800 kamaye".', 'Payment dispute ya document samajhne ke liye Help tab dekhein.'],
    };
  }
  if (language === 'pa') {
    return {
      directAnswer: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਕੰਮ, ਕਮਾਈ, ਸਰਕਾਰੀ ਸਕੀਮ ਜਾਂ ਪੇਮੈਂਟ ਬਾਰੇ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ।',
      steps: ['ਅੱਜ ਦੀ ਕਮਾਈ ਚੈਟ ਵਿੱਚ ਲਿਖੋ, ਜਿਵੇਂ "ਅੱਜ 800 ਕਮਾਏ"।', 'ਪੇਮੈਂਟ ਝਗੜੇ ਜਾਂ ਦਸਤਾਵੇਜ਼ ਸਮਝਣ ਲਈ Help ਟੈਬ ਦੇਖੋ।'],
    };
  }
  return {
    directAnswer: 'Hello! Ask anything about work, earnings, government schemes or payments.',
    steps: ['Type today\'s earning in chat, e.g. "Earned 800 today".', 'Open the Help tab for payment disputes or to understand a document.'],
  };
}
