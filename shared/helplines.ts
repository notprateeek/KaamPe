// Official national helplines, shared by the server (as trusted prompt
// reference data) and the client (SOS dialog). Only add numbers published
// by a government source.

export type HelplineLanguage = 'hi' | 'en' | 'pa';

export interface Helpline {
  id: string;
  number: string;
  label: Record<HelplineLanguage, string>;
}

export const HELPLINES: readonly Helpline[] = [
  {
    id: 'emergency',
    number: '112',
    label: { hi: 'आपातकाल (पुलिस/फायर/एम्बुलेंस)', en: 'Emergency (police/fire/ambulance)', pa: 'ਐਮਰਜੈਂਸੀ (ਪੁਲਿਸ/ਫਾਇਰ/ਐਂਬੂਲੈਂਸ)' },
  },
  {
    id: 'ambulance',
    number: '108',
    label: { hi: 'एम्बुलेंस', en: 'Ambulance', pa: 'ਐਂਬੂਲੈਂਸ' },
  },
  {
    id: 'women',
    number: '181',
    label: { hi: 'महिला हेल्पलाइन', en: 'Women helpline', pa: 'ਮਹਿਲਾ ਹੈਲਪਲਾਈਨ' },
  },
  {
    id: 'women_police',
    number: '1091',
    label: { hi: 'महिला पुलिस हेल्पलाइन', en: 'Women police helpline', pa: 'ਮਹਿਲਾ ਪੁਲਿਸ ਹੈਲਪਲਾਈਨ' },
  },
  {
    id: 'highway',
    number: '1033',
    label: { hi: 'राष्ट्रीय राजमार्ग आपातकाल (NHAI)', en: 'National highway emergency (NHAI)', pa: 'ਰਾਸ਼ਟਰੀ ਹਾਈਵੇ ਐਮਰਜੈਂਸੀ (NHAI)' },
  },
  {
    id: 'cyber',
    number: '1930',
    label: { hi: 'साइबर / UPI धोखाधड़ी', en: 'Cyber / UPI fraud', pa: 'ਸਾਈਬਰ / UPI ਧੋਖਾਧੜੀ' },
  },
  {
    id: 'legal_aid',
    number: '15100',
    label: { hi: 'मुफ़्त कानूनी सहायता (NALSA)', en: 'Free legal aid (NALSA)', pa: 'ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਸਹਾਇਤਾ (NALSA)' },
  },
  {
    id: 'eshram',
    number: '14434',
    label: { hi: 'ई-श्रम हेल्पलाइन', en: 'e-Shram helpline', pa: 'ਈ-ਸ਼੍ਰਮ ਹੈਲਪਲਾਈਨ' },
  },
] as const;

export function helplineReference(language: HelplineLanguage): string {
  return HELPLINES.map((h) => `${h.label[language]}: ${h.number}`).join('\n');
}
