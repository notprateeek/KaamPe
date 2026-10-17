// Curated welfare schemes relevant to informal and gig workers. Shared by the
// server (deterministic eligibility check + trusted prompt reference) and,
// optionally, the client. Only facts published on the official portals are
// encoded; anything uncertain is left out of the rules and shown as a
// "needs check" item instead. Money is integer paise.

export type SchemeLanguage = 'hi' | 'en' | 'pa';
export type Localized = Record<SchemeLanguage, string>;

/** Worker types used by the onboarding profile. 'other' is treated as unknown. */
export type SchemeWorkerType = 'delivery' | 'driver' | 'construction' | 'domestic' | 'daily_wage' | 'street_vendor' | 'other';

export interface SchemeEligibility {
  minAge?: number;
  maxAge?: number;
  /** Maximum monthly income, inclusive, in integer paise. */
  maxMonthlyIncomePaise?: number;
  excludesEpfo?: boolean;
  excludesEsic?: boolean;
  excludesIncomeTaxPayer?: boolean;
  /** If set, only these worker types qualify. */
  workerTypes?: SchemeWorkerType[];
  /** Human label for the worker-type rule, shown when the type is unknown. */
  workerTypeLabel?: Localized;
  /** If set, only residents/workers of these states qualify (lower-case names). */
  states?: string[];
}

export interface Scheme {
  id: string;
  name: Localized;
  benefit: Localized;
  /** Official https URL; must pass the server's trusted-domain allowlist. */
  officialUrl: string;
  eligibility: SchemeEligibility;
  /** Conditions the app cannot verify, always shown as "needs check". */
  extraChecks?: Localized[];
}

const BANK_ACCOUNT_CHECK: Localized = {
  hi: 'Bank ya post office mein bachat khata (auto-debit ke liye) chahiye.',
  en: 'Needs a savings account in a bank or post office (premium is auto-debited).',
  pa: 'ਬੈਂਕ ਜਾਂ ਡਾਕਘਰ ਵਿੱਚ ਬਚਤ ਖਾਤਾ ਚਾਹੀਦਾ ਹੈ (ਪ੍ਰੀਮੀਅਮ ਆਪਣੇ-ਆਪ ਕੱਟਦਾ ਹੈ)।',
};

export const SCHEMES: readonly Scheme[] = [
  {
    id: 'eshram',
    name: { hi: 'e-Shram card', en: 'e-Shram card', pa: 'ਈ-ਸ਼੍ਰਮ ਕਾਰਡ (e-Shram)' },
    benefit: {
      hi: 'Asangathit mazdooron ka free sarkari registration (UAN card) — kalyan yojanaon se judne mein madad.',
      en: 'Free national registration (UAN card) for unorganised workers — helps you link to welfare schemes.',
      pa: 'ਅਸੰਗਠਿਤ ਕਾਮਿਆਂ ਲਈ ਮੁਫ਼ਤ ਸਰਕਾਰੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ (UAN ਕਾਰਡ) — ਭਲਾਈ ਸਕੀਮਾਂ ਨਾਲ ਜੁੜਨ ਵਿੱਚ ਮਦਦ।',
    },
    officialUrl: 'https://eshram.gov.in',
    eligibility: { minAge: 16, maxAge: 59, excludesEpfo: true, excludesEsic: true },
    extraChecks: [
      {
        hi: 'Aadhaar se juda mobile number chahiye (registration free hai, CSC par bhi ho sakta hai).',
        en: 'Needs a mobile number linked to Aadhaar (registration is free, also at a CSC).',
        pa: 'ਆਧਾਰ ਨਾਲ ਜੁੜਿਆ ਮੋਬਾਈਲ ਨੰਬਰ ਚਾਹੀਦਾ ਹੈ (ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਮੁਫ਼ਤ ਹੈ, CSC \'ਤੇ ਵੀ ਹੋ ਸਕਦੀ ਹੈ)।',
      },
    ],
  },
  {
    id: 'pm_sym',
    name: {
      hi: 'PM Shram Yogi Maan-dhan (PM-SYM)',
      en: 'PM Shram Yogi Maan-dhan (PM-SYM)',
      pa: 'ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਸ਼੍ਰਮ ਯੋਗੀ ਮਾਨ-ਧਨ (PM-SYM)',
    },
    benefit: {
      hi: '60 saal ke baad ₹3,000 mahina pension; jitna aap jama karte hain, utna hi sarkar bhi jama karti hai.',
      en: '₹3,000 monthly pension after age 60; the government matches your monthly contribution.',
      pa: '60 ਸਾਲ ਤੋਂ ਬਾਅਦ ₹3,000 ਮਹੀਨਾ ਪੈਨਸ਼ਨ; ਸਰਕਾਰ ਵੀ ਤੁਹਾਡੇ ਬਰਾਬਰ ਹਿੱਸਾ ਜਮ੍ਹਾਂ ਕਰਦੀ ਹੈ।',
    },
    officialUrl: 'https://maandhan.in',
    eligibility: {
      minAge: 18,
      maxAge: 40,
      maxMonthlyIncomePaise: 15_000_00,
      excludesEpfo: true,
      excludesEsic: true,
      excludesIncomeTaxPayer: true,
    },
    extraChecks: [
      {
        hi: 'NPS (sarkari hissa wala) ka member nahi hona chahiye; bachat khata aur Aadhaar chahiye.',
        en: 'Must not be covered by NPS (government-funded); needs a savings account and Aadhaar.',
        pa: 'NPS (ਸਰਕਾਰੀ ਹਿੱਸੇ ਵਾਲਾ) ਦੇ ਮੈਂਬਰ ਨਹੀਂ ਹੋਣੇ ਚਾਹੀਦੇ; ਬਚਤ ਖਾਤਾ ਅਤੇ ਆਧਾਰ ਚਾਹੀਦਾ ਹੈ।',
      },
    ],
  },
  {
    id: 'apy',
    name: { hi: 'Atal Pension Yojana (APY)', en: 'Atal Pension Yojana (APY)', pa: 'ਅਟਲ ਪੈਨਸ਼ਨ ਯੋਜਨਾ (APY)' },
    benefit: {
      hi: '60 saal ke baad ₹1,000 se ₹5,000 mahina tak guaranteed pension (aapke yogdan ke hisaab se).',
      en: 'Guaranteed pension of ₹1,000 to ₹5,000 a month after 60, depending on your contribution.',
      pa: '60 ਸਾਲ ਤੋਂ ਬਾਅਦ ₹1,000 ਤੋਂ ₹5,000 ਮਹੀਨਾ ਤੱਕ ਗਾਰੰਟੀਸ਼ੁਦਾ ਪੈਨਸ਼ਨ (ਤੁਹਾਡੇ ਯੋਗਦਾਨ ਮੁਤਾਬਕ)।',
    },
    officialUrl: 'https://www.jansuraksha.gov.in',
    eligibility: { minAge: 18, maxAge: 40, excludesIncomeTaxPayer: true },
    extraChecks: [BANK_ACCOUNT_CHECK],
  },
  {
    id: 'pmsby',
    name: {
      hi: 'PM Suraksha Bima Yojana (PMSBY)',
      en: 'PM Suraksha Bima Yojana (PMSBY)',
      pa: 'ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਸੁਰੱਖਿਆ ਬੀਮਾ ਯੋਜਨਾ (PMSBY)',
    },
    benefit: {
      hi: 'Sirf ₹20 saalana mein ₹2 lakh tak ka accident bima (maut ya poori viklangta par).',
      en: 'Accident insurance up to ₹2 lakh (death or full disability) for ₹20 a year.',
      pa: '₹20 ਸਾਲਾਨਾ ਵਿੱਚ ₹2 ਲੱਖ ਤੱਕ ਦਾ ਦੁਰਘਟਨਾ ਬੀਮਾ (ਮੌਤ ਜਾਂ ਪੂਰੀ ਅਪੰਗਤਾ \'ਤੇ)।',
    },
    officialUrl: 'https://www.jansuraksha.gov.in',
    eligibility: { minAge: 18, maxAge: 70 },
    extraChecks: [BANK_ACCOUNT_CHECK],
  },
  {
    id: 'pmjjby',
    name: {
      hi: 'PM Jeevan Jyoti Bima Yojana (PMJJBY)',
      en: 'PM Jeevan Jyoti Bima Yojana (PMJJBY)',
      pa: 'ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਜੀਵਨ ਜਯੋਤੀ ਬੀਮਾ ਯੋਜਨਾ (PMJJBY)',
    },
    benefit: {
      hi: '₹436 saalana mein ₹2 lakh ka jeevan bima (kisi bhi kaaran se maut par parivar ko).',
      en: 'Life cover of ₹2 lakh for your family (death due to any cause) for ₹436 a year.',
      pa: '₹436 ਸਾਲਾਨਾ ਵਿੱਚ ₹2 ਲੱਖ ਦਾ ਜੀਵਨ ਬੀਮਾ (ਕਿਸੇ ਵੀ ਕਾਰਨ ਮੌਤ \'ਤੇ ਪਰਿਵਾਰ ਨੂੰ)।',
    },
    officialUrl: 'https://www.jansuraksha.gov.in',
    eligibility: { minAge: 18, maxAge: 50 },
    extraChecks: [BANK_ACCOUNT_CHECK],
  },
  {
    id: 'pmjay',
    name: {
      hi: 'Ayushman Bharat PM-JAY',
      en: 'Ayushman Bharat PM-JAY',
      pa: 'ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ PM-JAY',
    },
    benefit: {
      hi: 'Yogya parivaron ko har saal ₹5 lakh tak ka free ilaaj, listed hospitals mein.',
      en: 'Free hospital treatment up to ₹5 lakh per family per year at empanelled hospitals, for eligible families.',
      pa: 'ਯੋਗ ਪਰਿਵਾਰਾਂ ਨੂੰ ਹਰ ਸਾਲ ₹5 ਲੱਖ ਤੱਕ ਮੁਫ਼ਤ ਇਲਾਜ, ਸੂਚੀਬੱਧ ਹਸਪਤਾਲਾਂ ਵਿੱਚ।',
    },
    officialUrl: 'https://pmjay.gov.in',
    eligibility: {},
    extraChecks: [
      {
        hi: 'Eligibility parivar ki list par nirbhar hai — pmjay.gov.in par "Am I Eligible" mein apna naam check karein.',
        en: 'Eligibility depends on your family being on the beneficiary list — check "Am I Eligible" on pmjay.gov.in.',
        pa: 'ਯੋਗਤਾ ਪਰਿਵਾਰ ਦੇ ਲਾਭਪਾਤਰੀ ਸੂਚੀ ਵਿੱਚ ਹੋਣ \'ਤੇ ਨਿਰਭਰ ਹੈ — pmjay.gov.in \'ਤੇ "Am I Eligible" ਵਿੱਚ ਨਾਮ ਦੇਖੋ।',
      },
    ],
  },
  {
    id: 'pm_svanidhi',
    name: { hi: 'PM SVANidhi', en: 'PM SVANidhi', pa: 'ਪੀਐਮ ਸਵਨਿਧੀ (PM SVANidhi)' },
    benefit: {
      hi: 'Rehdi-patri walon ko bina guarantee ka business loan; samay par chukane par byaaj subsidy aur digital payment par cashback.',
      en: 'Collateral-free working-capital loan for street vendors, with interest subsidy on timely repayment and cashback on digital payments.',
      pa: 'ਰੇਹੜੀ-ਫੜੀ ਵਾਲਿਆਂ ਲਈ ਬਿਨਾਂ ਗਾਰੰਟੀ ਕਾਰੋਬਾਰੀ ਕਰਜ਼ਾ; ਸਮੇਂ ਸਿਰ ਮੋੜਨ \'ਤੇ ਵਿਆਜ ਸਬਸਿਡੀ ਅਤੇ ਡਿਜੀਟਲ ਪੇਮੈਂਟ \'ਤੇ ਕੈਸ਼ਬੈਕ।',
    },
    officialUrl: 'https://pmsvanidhi.mohua.gov.in',
    eligibility: {
      workerTypes: ['street_vendor'],
      workerTypeLabel: { hi: 'Sirf rehdi-patri / street vendors ke liye.', en: 'Only for street vendors.', pa: 'ਸਿਰਫ਼ ਰੇਹੜੀ-ਫੜੀ ਵਾਲਿਆਂ (street vendors) ਲਈ।' },
    },
    extraChecks: [
      {
        hi: 'Shehar mein vending karte hon (vending certificate / ULB ki sifarish chahiye ho sakti hai).',
        en: 'Must be vending in an urban area (a vending certificate or local body recommendation may be needed).',
        pa: 'ਸ਼ਹਿਰ ਵਿੱਚ ਰੇਹੜੀ ਲਾਉਂਦੇ ਹੋਵੋ (ਵੈਂਡਿੰਗ ਸਰਟੀਫਿਕੇਟ ਜਾਂ ਸਥਾਨਕ ਸੰਸਥਾ ਦੀ ਸਿਫ਼ਾਰਸ਼ ਲੱਗ ਸਕਦੀ ਹੈ)।',
      },
    ],
  },
  {
    id: 'punjab_bocw',
    name: {
      hi: 'Punjab Nirmaan Mazdoor Kalyan Board (BOCW) registration',
      en: 'Punjab Construction Workers Welfare Board (BOCW) registration',
      pa: 'ਪੰਜਾਬ ਉਸਾਰੀ ਕਿਰਤੀ ਭਲਾਈ ਬੋਰਡ (BOCW) ਰਜਿਸਟ੍ਰੇਸ਼ਨ',
    },
    benefit: {
      hi: 'Registered nirmaan mazdooron ko board ki kalyan yojanayein milti hain (jaise bachchon ki padhai, ilaaj mein madad).',
      en: 'Registered construction workers can get the board\'s welfare benefits (e.g. help with children\'s education and medical costs).',
      pa: 'ਰਜਿਸਟਰਡ ਉਸਾਰੀ ਕਿਰਤੀਆਂ ਨੂੰ ਬੋਰਡ ਦੀਆਂ ਭਲਾਈ ਸਕੀਮਾਂ ਮਿਲਦੀਆਂ ਹਨ (ਜਿਵੇਂ ਬੱਚਿਆਂ ਦੀ ਪੜ੍ਹਾਈ, ਇਲਾਜ ਵਿੱਚ ਮਦਦ)।',
    },
    officialUrl: 'https://bocw.punjab.gov.in',
    eligibility: {
      minAge: 18,
      maxAge: 60,
      workerTypes: ['construction'],
      workerTypeLabel: { hi: 'Sirf nirmaan (construction) mazdooron ke liye.', en: 'Only for building / construction workers.', pa: 'ਸਿਰਫ਼ ਉਸਾਰੀ (construction) ਕਿਰਤੀਆਂ ਲਈ।' },
      states: ['punjab'],
    },
    extraChecks: [
      {
        hi: 'Pichhle 12 mahine mein kam se kam 90 din nirmaan kaam kiya ho.',
        en: 'Must have done construction work for at least 90 days in the last 12 months.',
        pa: 'ਪਿਛਲੇ 12 ਮਹੀਨਿਆਂ ਵਿੱਚ ਘੱਟੋ-ਘੱਟ 90 ਦਿਨ ਉਸਾਰੀ ਦਾ ਕੰਮ ਕੀਤਾ ਹੋਵੇ।',
      },
    ],
  },
];

export const SCHEME_HELPLINE = '14434';
