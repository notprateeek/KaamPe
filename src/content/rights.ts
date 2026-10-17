// Short, plain-language summaries of work rights for informal and gig workers.
// General information only (the UI says so); wording avoids promising outcomes.
// Shown as the Home "Know your rights" tip and the Help > Your rights library.

import type { Language } from '../i18n/translations';

type Localized = Record<Language, string>;

export type RightIcon = 'wage' | 'clock' | 'shield' | 'scale' | 'heart' | 'users' | 'phone' | 'gavel';

export interface RightTopic {
  id: string;
  icon: RightIcon;
  title: Localized;
  summary: Localized;
  points: Localized[];
  /** Prefilled chat question for "Ask KaamPe". */
  ask: Localized;
}

export const RIGHTS: readonly RightTopic[] = [
  {
    id: 'minimum_wage',
    icon: 'wage',
    title: { hi: 'Minimum wage (nyuntam mazdoori)', en: 'Minimum wage', pa: 'ਘੱਟੋ-ਘੱਟ ਮਜ਼ਦੂਰੀ' },
    summary: {
      hi: 'Har rajya apne kaam ke liye minimum wage tay karta hai. Maalik isse kam nahi de sakta.',
      en: 'Every state fixes minimum wages for work. An employer cannot pay you less than that.',
      pa: 'ਹਰ ਰਾਜ ਕੰਮ ਲਈ ਘੱਟੋ-ਘੱਟ ਮਜ਼ਦੂਰੀ ਤੈਅ ਕਰਦਾ ਹੈ। ਮਾਲਕ ਇਸ ਤੋਂ ਘੱਟ ਨਹੀਂ ਦੇ ਸਕਦਾ।',
    },
    points: [
      {
        hi: 'Rate kaam ke prakaar (unskilled, skilled) aur rajya par nirbhar hai.',
        en: 'The rate depends on your state and skill level (unskilled, skilled and so on).',
        pa: 'ਰੇਟ ਤੁਹਾਡੇ ਰਾਜ ਅਤੇ ਹੁਨਰ ਦੇ ਪੱਧਰ \'ਤੇ ਨਿਰਭਰ ਕਰਦਾ ਹੈ।',
      },
      {
        hi: 'Apne rajya ka taaza rate labour department ki website par milta hai.',
        en: 'The current rate is published on your state labour department website.',
        pa: 'ਤਾਜ਼ਾ ਰੇਟ ਤੁਹਾਡੇ ਰਾਜ ਦੇ ਲੇਬਰ ਵਿਭਾਗ ਦੀ ਵੈੱਬਸਾਈਟ \'ਤੇ ਮਿਲਦਾ ਹੈ।',
      },
      {
        hi: 'Kam paise mile to likhit record (hisaab, screenshot) sambhal kar rakhein.',
        en: 'If you are underpaid, keep written records such as your ledger and screenshots.',
        pa: 'ਘੱਟ ਪੈਸੇ ਮਿਲਣ \'ਤੇ ਲਿਖਤੀ ਰਿਕਾਰਡ (ਹਿਸਾਬ, ਸਕ੍ਰੀਨਸ਼ਾਟ) ਸੰਭਾਲ ਕੇ ਰੱਖੋ।',
      },
    ],
    ask: {
      hi: 'Mere rajya mein mere kaam ki minimum wage kitni hai?',
      en: 'What is the minimum wage for my work in my state?',
      pa: 'ਮੇਰੇ ਰਾਜ ਵਿੱਚ ਮੇਰੇ ਕੰਮ ਦੀ ਘੱਟੋ-ਘੱਟ ਮਜ਼ਦੂਰੀ ਕਿੰਨੀ ਹੈ?',
    },
  },
  {
    id: 'timely_payment',
    icon: 'clock',
    title: { hi: 'Samay par payment', en: 'Getting paid on time', pa: 'ਸਮੇਂ \'ਤੇ ਭੁਗਤਾਨ' },
    summary: {
      hi: 'Mazdoori tay samay par milni chahiye: din ki mazdoori usi din, hafte ki hafte ke ant mein, mahine ki agle mahine ki 7 tareekh tak.',
      en: 'Wages must be paid on time: daily wages the same day, weekly wages at the end of the week, monthly wages by the 7th of the next month.',
      pa: 'ਮਜ਼ਦੂਰੀ ਤੈਅ ਸਮੇਂ \'ਤੇ ਮਿਲਣੀ ਚਾਹੀਦੀ ਹੈ: ਦਿਹਾੜੀ ਉਸੇ ਦਿਨ, ਹਫ਼ਤਾਵਾਰੀ ਹਫ਼ਤੇ ਦੇ ਅਖੀਰ, ਮਹੀਨਾਵਾਰ ਅਗਲੇ ਮਹੀਨੇ ਦੀ 7 ਤਾਰੀਖ ਤੱਕ।',
    },
    points: [
      {
        hi: 'Naye labour code (Code on Wages) mein yeh samay-seema likhi hai.',
        en: 'These time limits are set out in the Code on Wages.',
        pa: 'ਇਹ ਸਮਾਂ-ਸੀਮਾ Code on Wages ਵਿੱਚ ਲਿਖੀ ਹੈ।',
      },
      {
        hi: 'Bina wajah kaatna (deduction) mana hai; kaatne ka kaaran batana hota hai.',
        en: 'Unexplained deductions are not allowed; deductions must have a valid reason.',
        pa: 'ਬਿਨਾਂ ਵਜ੍ਹਾ ਕਟੌਤੀ ਮਨ੍ਹਾ ਹੈ; ਕਟੌਤੀ ਦਾ ਜਾਇਜ਼ ਕਾਰਨ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।',
      },
      {
        hi: 'Payment ruki ho to KaamPe se shikayat ka draft banwa sakte hain.',
        en: 'If a payment is stuck, KaamPe can help you draft a complaint.',
        pa: 'ਭੁਗਤਾਨ ਰੁਕਿਆ ਹੋਵੇ ਤਾਂ KaamPe ਸ਼ਿਕਾਇਤ ਦਾ ਡਰਾਫਟ ਬਣਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹੈ।',
      },
    ],
    ask: {
      hi: 'Meri payment kai din se ruki hai, main kya karun?',
      en: 'My payment has been pending for days. What can I do?',
      pa: 'ਮੇਰਾ ਭੁਗਤਾਨ ਕਈ ਦਿਨਾਂ ਤੋਂ ਰੁਕਿਆ ਹੈ, ਮੈਂ ਕੀ ਕਰਾਂ?',
    },
  },
  {
    id: 'gig_social_security',
    icon: 'shield',
    title: { hi: 'Gig workers ki social security', en: 'Social security for gig workers', pa: 'ਗਿਗ ਵਰਕਰਾਂ ਦੀ ਸਮਾਜਿਕ ਸੁਰੱਖਿਆ' },
    summary: {
      hi: 'Code on Social Security, 2020 mein pehli baar gig aur platform workers ko pehchaan mili hai.',
      en: 'The Code on Social Security, 2020 recognises gig and platform workers for the first time.',
      pa: 'Code on Social Security, 2020 ਵਿੱਚ ਪਹਿਲੀ ਵਾਰ ਗਿਗ ਅਤੇ ਪਲੇਟਫਾਰਮ ਵਰਕਰਾਂ ਨੂੰ ਪਛਾਣ ਮਿਲੀ ਹੈ।',
    },
    points: [
      {
        hi: 'Delivery aur ride apps jaise platforms ko workers ke welfare fund mein yogdaan dena hai.',
        en: 'Platforms such as delivery and ride apps have to contribute to a welfare fund for workers.',
        pa: 'ਡਿਲਿਵਰੀ ਅਤੇ ਰਾਈਡ ਐਪਸ ਵਰਗੇ ਪਲੇਟਫਾਰਮਾਂ ਨੂੰ ਵਰਕਰਾਂ ਦੇ ਭਲਾਈ ਫੰਡ ਵਿੱਚ ਯੋਗਦਾਨ ਦੇਣਾ ਹੈ।',
      },
      {
        hi: 'Fayda lene ke liye e-Shram par free registration pehla kadam hai.',
        en: 'Free registration on e-Shram is the first step to getting these benefits.',
        pa: 'ਫ਼ਾਇਦਾ ਲੈਣ ਲਈ e-Shram \'ਤੇ ਮੁਫ਼ਤ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਪਹਿਲਾ ਕਦਮ ਹੈ।',
      },
      {
        hi: 'Kaun si yojana kab shuru hogi, yeh sarkar notify karti hai; official site dekhte rahein.',
        en: 'The government notifies which schemes start when, so keep checking official sites.',
        pa: 'ਕਿਹੜੀ ਸਕੀਮ ਕਦੋਂ ਸ਼ੁਰੂ ਹੋਵੇਗੀ, ਸਰਕਾਰ ਨੋਟੀਫਾਈ ਕਰਦੀ ਹੈ; ਸਰਕਾਰੀ ਸਾਈਟ ਵੇਖਦੇ ਰਹੋ।',
      },
    ],
    ask: {
      hi: 'Gig worker ke roop mein mujhe kaun si social security mil sakti hai?',
      en: 'What social security can I get as a gig worker?',
      pa: 'ਗਿਗ ਵਰਕਰ ਵਜੋਂ ਮੈਨੂੰ ਕਿਹੜੀ ਸਮਾਜਿਕ ਸੁਰੱਖਿਆ ਮਿਲ ਸਕਦੀ ਹੈ?',
    },
  },
  {
    id: 'equal_pay',
    icon: 'scale',
    title: { hi: 'Barabar kaam, barabar paisa', en: 'Equal pay', pa: 'ਬਰਾਬਰ ਕੰਮ, ਬਰਾਬਰ ਤਨਖਾਹ' },
    summary: {
      hi: 'Ek jaise kaam ke liye aurat aur aadmi ko alag paisa dena kanoon ke khilaaf hai.',
      en: 'Paying women and men differently for the same work is against the law.',
      pa: 'ਇੱਕੋ ਜਿਹੇ ਕੰਮ ਲਈ ਔਰਤ ਅਤੇ ਮਰਦ ਨੂੰ ਵੱਖਰੀ ਤਨਖਾਹ ਦੇਣਾ ਕਾਨੂੰਨ ਦੇ ਖ਼ਿਲਾਫ਼ ਹੈ।',
    },
    points: [
      {
        hi: 'Bharti (recruitment) mein bhi gender ke kaaran bhedbhaav mana hai.',
        en: 'Discrimination by gender in hiring is also not allowed.',
        pa: 'ਭਰਤੀ ਵਿੱਚ ਵੀ ਲਿੰਗ ਦੇ ਆਧਾਰ \'ਤੇ ਵਿਤਕਰਾ ਮਨ੍ਹਾ ਹੈ।',
      },
      {
        hi: 'Saath kaam karne walon ke rate ka record rakhein.',
        en: 'Keep a note of what co-workers doing the same job are paid.',
        pa: 'ਨਾਲ ਕੰਮ ਕਰਨ ਵਾਲਿਆਂ ਦੇ ਰੇਟ ਦਾ ਰਿਕਾਰਡ ਰੱਖੋ।',
      },
      {
        hi: 'Shikayat labour office mein ki ja sakti hai.',
        en: 'You can complain at the labour office.',
        pa: 'ਸ਼ਿਕਾਇਤ ਲੇਬਰ ਦਫ਼ਤਰ ਵਿੱਚ ਕੀਤੀ ਜਾ ਸਕਦੀ ਹੈ।',
      },
    ],
    ask: {
      hi: 'Mujhe aadmiyon se kam paisa milta hai, kya karun?',
      en: 'I am paid less than men for the same work. What can I do?',
      pa: 'ਮੈਨੂੰ ਮਰਦਾਂ ਨਾਲੋਂ ਘੱਟ ਪੈਸੇ ਮਿਲਦੇ ਹਨ, ਮੈਂ ਕੀ ਕਰਾਂ?',
    },
  },
  {
    id: 'accident_cover',
    icon: 'heart',
    title: { hi: 'Accident aur jeevan beema', en: 'Accident and life cover', pa: 'ਹਾਦਸਾ ਅਤੇ ਜੀਵਨ ਬੀਮਾ' },
    summary: {
      hi: 'Sasti sarkari beema yojanaayein hain: PMSBY (accident) aur PMJJBY (jeevan).',
      en: 'Low-cost government insurance exists: PMSBY for accidents and PMJJBY for life cover.',
      pa: 'ਸਸਤੀਆਂ ਸਰਕਾਰੀ ਬੀਮਾ ਸਕੀਮਾਂ ਹਨ: PMSBY (ਹਾਦਸਾ) ਅਤੇ PMJJBY (ਜੀਵਨ)।',
    },
    points: [
      {
        hi: 'Premium bank khate se apne aap katta hai; bank mein form bharein.',
        en: 'The premium is auto-debited from your bank account; enrol at your bank.',
        pa: 'ਪ੍ਰੀਮੀਅਮ ਬੈਂਕ ਖਾਤੇ ਤੋਂ ਆਪੇ ਕੱਟਦਾ ਹੈ; ਬੈਂਕ ਵਿੱਚ ਫਾਰਮ ਭਰੋ।',
      },
      {
        hi: 'Nominee ka naam zaroor likhwayein.',
        en: 'Always add a nominee.',
        pa: 'ਨੌਮਿਨੀ ਦਾ ਨਾਂ ਜ਼ਰੂਰ ਲਿਖਵਾਓ।',
      },
      {
        hi: 'Umar aur premium ki shartein official site par check karein.',
        en: 'Check age limits and the current premium on the official site.',
        pa: 'ਉਮਰ ਅਤੇ ਪ੍ਰੀਮੀਅਮ ਦੀਆਂ ਸ਼ਰਤਾਂ ਸਰਕਾਰੀ ਸਾਈਟ \'ਤੇ ਜਾਂਚੋ।',
      },
    ],
    ask: {
      hi: 'PMSBY accident beema kaise lein?',
      en: 'How do I sign up for PMSBY accident insurance?',
      pa: 'PMSBY ਹਾਦਸਾ ਬੀਮਾ ਕਿਵੇਂ ਲਈਏ?',
    },
  },
  {
    id: 'harassment',
    icon: 'users',
    title: { hi: 'Kaam par yaun utpeedan', en: 'Sexual harassment at work', pa: 'ਕੰਮ \'ਤੇ ਜਿਨਸੀ ਸ਼ੋਸ਼ਣ' },
    summary: {
      hi: 'POSH kanoon informal kaam karne wali auraton par bhi lagta hai, ghar ka kaam bhi.',
      en: 'The POSH law also covers women in informal work, including domestic work.',
      pa: 'POSH ਕਾਨੂੰਨ ਗੈਰ-ਰਸਮੀ ਕੰਮ ਕਰਨ ਵਾਲੀਆਂ ਔਰਤਾਂ \'ਤੇ ਵੀ ਲਾਗੂ ਹੁੰਦਾ ਹੈ, ਘਰੇਲੂ ਕੰਮ ਸਮੇਤ।',
    },
    points: [
      {
        hi: 'Har zile mein Local Committee hoti hai jahan shikayat ki ja sakti hai.',
        en: 'Every district has a Local Committee where you can file a complaint.',
        pa: 'ਹਰ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਲੋਕਲ ਕਮੇਟੀ ਹੁੰਦੀ ਹੈ ਜਿੱਥੇ ਸ਼ਿਕਾਇਤ ਕੀਤੀ ਜਾ ਸਕਦੀ ਹੈ।',
      },
      {
        hi: 'Turant khatra ho to 112 ya mahila helpline 181 par call karein.',
        en: 'If you are in danger now, call 112 or the women helpline 181.',
        pa: 'ਤੁਰੰਤ ਖ਼ਤਰਾ ਹੋਵੇ ਤਾਂ 112 ਜਾਂ ਮਹਿਲਾ ਹੈਲਪਲਾਈਨ 181 \'ਤੇ ਕਾਲ ਕਰੋ।',
      },
      {
        hi: 'Tareekh, samay aur gawahon ki jaankari likh kar rakhein.',
        en: 'Write down dates, times and any witnesses.',
        pa: 'ਤਾਰੀਖ, ਸਮਾਂ ਅਤੇ ਗਵਾਹਾਂ ਦੀ ਜਾਣਕਾਰੀ ਲਿਖ ਕੇ ਰੱਖੋ।',
      },
    ],
    ask: {
      hi: 'Kaam par utpeedan ki shikayat kahan karun?',
      en: 'Where can I complain about harassment at work?',
      pa: 'ਕੰਮ \'ਤੇ ਸ਼ੋਸ਼ਣ ਦੀ ਸ਼ਿਕਾਇਤ ਕਿੱਥੇ ਕਰਾਂ?',
    },
  },
  {
    id: 'upi_fraud',
    icon: 'phone',
    title: { hi: 'UPI ya online dhokha', en: 'UPI and online fraud', pa: 'UPI ਜਾਂ ਆਨਲਾਈਨ ਧੋਖਾ' },
    summary: {
      hi: 'Paise galat tarike se kat gaye to turant 1930 par call karein ya cybercrime.gov.in par report karein.',
      en: 'If money is taken by fraud, call 1930 immediately or report at cybercrime.gov.in.',
      pa: 'ਧੋਖੇ ਨਾਲ ਪੈਸੇ ਕੱਟੇ ਜਾਣ ਤਾਂ ਤੁਰੰਤ 1930 \'ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ cybercrime.gov.in \'ਤੇ ਰਿਪੋਰਟ ਕਰੋ।',
    },
    points: [
      {
        hi: 'Jitni jaldi report, paise rukne ka utna zyada mauka.',
        en: 'The sooner you report, the better the chance of stopping the money.',
        pa: 'ਜਿੰਨੀ ਜਲਦੀ ਰਿਪੋਰਟ, ਪੈਸੇ ਰੁਕਣ ਦਾ ਓਨਾ ਵੱਧ ਮੌਕਾ।',
      },
      {
        hi: 'OTP, PIN ya Aadhaar number kabhi kisi ko na batayein.',
        en: 'Never share your OTP, PIN or Aadhaar number with anyone.',
        pa: 'OTP, PIN ਜਾਂ ਆਧਾਰ ਨੰਬਰ ਕਦੇ ਕਿਸੇ ਨੂੰ ਨਾ ਦੱਸੋ।',
      },
      {
        hi: 'Paise lene ke liye PIN daalne ki zaroorat nahi hoti.',
        en: 'You never need to enter your PIN to receive money.',
        pa: 'ਪੈਸੇ ਲੈਣ ਲਈ PIN ਪਾਉਣ ਦੀ ਲੋੜ ਨਹੀਂ ਹੁੰਦੀ।',
      },
    ],
    ask: {
      hi: 'Mere UPI se dhokhe se paise kat gaye, ab kya karun?',
      en: 'Money was taken from my UPI by fraud. What do I do now?',
      pa: 'ਮੇਰੇ UPI ਤੋਂ ਧੋਖੇ ਨਾਲ ਪੈਸੇ ਕੱਟੇ ਗਏ, ਹੁਣ ਕੀ ਕਰਾਂ?',
    },
  },
  {
    id: 'legal_aid',
    icon: 'gavel',
    title: { hi: 'Muft kanooni madad', en: 'Free legal aid', pa: 'ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਮਦਦ' },
    summary: {
      hi: 'Legal Services Authority bahut se mazdooron ko muft vakeel aur salah deti hai.',
      en: 'Legal Services Authorities give many workers a free lawyer and advice.',
      pa: 'ਲੀਗਲ ਸਰਵਿਸਿਜ਼ ਅਥਾਰਟੀ ਬਹੁਤ ਸਾਰੇ ਕਾਮਿਆਂ ਨੂੰ ਮੁਫ਼ਤ ਵਕੀਲ ਅਤੇ ਸਲਾਹ ਦਿੰਦੀ ਹੈ।',
    },
    points: [
      {
        hi: 'NALSA helpline 15100 par call karke poochhein ki aap yogya hain ya nahi.',
        en: 'Call the NALSA helpline 15100 to check whether you qualify.',
        pa: 'NALSA ਹੈਲਪਲਾਈਨ 15100 \'ਤੇ ਕਾਲ ਕਰਕੇ ਪੁੱਛੋ ਕਿ ਤੁਸੀਂ ਯੋਗ ਹੋ ਜਾਂ ਨਹੀਂ।',
      },
      {
        hi: 'Zila kachehri mein DLSA daftar hota hai.',
        en: 'Every district court has a DLSA office.',
        pa: 'ਹਰ ਜ਼ਿਲ੍ਹਾ ਕਚਹਿਰੀ ਵਿੱਚ DLSA ਦਫ਼ਤਰ ਹੁੰਦਾ ਹੈ।',
      },
      {
        hi: 'Kaagaz, payment record aur chat screenshots saath le jaayein.',
        en: 'Take your papers, payment records and chat screenshots with you.',
        pa: 'ਕਾਗਜ਼, ਭੁਗਤਾਨ ਰਿਕਾਰਡ ਅਤੇ ਚੈਟ ਸਕ੍ਰੀਨਸ਼ਾਟ ਨਾਲ ਲੈ ਜਾਓ।',
      },
    ],
    ask: {
      hi: 'Kya mujhe muft vakeel mil sakta hai?',
      en: 'Can I get a free lawyer?',
      pa: 'ਕੀ ਮੈਨੂੰ ਮੁਫ਼ਤ ਵਕੀਲ ਮਿਲ ਸਕਦਾ ਹੈ?',
    },
  },
];

/** One topic per calendar day, so the Home tip changes daily but stays stable within a day. */
export function rightOfTheDay(date: Date = new Date(), offset = 0): RightTopic {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  const n = RIGHTS.length;
  return RIGHTS[(((dayNumber + offset) % n) + n) % n];
}
