export type Language = 'hi' | 'en' | 'pa';

export interface Translations {
  appName: string;
  tagline: string;
  subTagline: string;
  nav: {
    home: string;
    money: string;
    help: string;
    homeDesc: string;
    moneyDesc: string;
    helpDesc: string;
  };
  onboarding: {
    step1Title: string;
    step1Subtitle: string;
    step2Title: string;
    step3Title: string;
    continue: string;
    workerTypes: {
      delivery: string;
      driver: string;
      construction: string;
      domestic: string;
      daily_wage: string;
      other: string;
    };
  };
  home: {
    greeting: string;
    questionPrompt: string;
    inputPlaceholder: string;
    askButton: string;
    todaysMoneyTitle: string;
    noMoneyTitle: string;
    addMoneyAction: string;
    earned: string;
    spent: string;
    netToday: string;
    shortcuts: {
      addEarning: string;
      paymentMissing: string;
      explainDoc: string;
      safetyQuestion: string;
    };
    safetyPrompt: string;
    viewDetails: string;
    quickActions: string;
    conversation: string;
    languagesHint: string;
    emptyChatTitle: string;
    emptyChatHint: string;
    examplePrompts: string[];
  };
  money: {
    title: string;
    netToday: string;
    earned: string;
    spent: string;
    thisWeek: string;
    recentActivity: string;
    emptyActivity: string;
    addFirstPrompt: string;
    addEarningBtn: string;
    addExpenseBtn: string;
    earningModalTitle: string;
    expenseModalTitle: string;
    amountLabel: string;
    sourceLabel: string;
    categoryLabel: string;
    dateLabel: string;
    noteLabel: string;
    save: string;
    cancel: string;
    delete: string;
    deleteConfirm: string;
    weekNet: string;
    dailyBreakdown: string;
    noEntriesDay: string;
    categories: {
      Fuel: string;
      Food: string;
      Maintenance: string;
      'Mobile/data': string;
      Equipment: string;
      Other: string;
    };
  };
  help: {
    title: string;
    subtitle: string;
    tabExplainDoc: string;
    tabDispute: string;
    docUploadTitle: string;
    docUploadDesc: string;
    docUploadBtn: string;
    docAnalyzing: string;
    docWhatIsThis: string;
    docKeyPoints: string;
    docMoney: string;
    docDates: string;
    docCautions: string;
    docAskKaamPe: string;
    disputeTitle: string;
    disputePlaceholder: string;
    disputeGenerateBtn: string;
    disputeGenerating: string;
    disputeProblemTitle: string;
    disputeDraftTitle: string;
    copy: string;
    copied: string;
    disputeHint: string;
    draftEditable: string;
    docAskHint: string;
    docAskPrompt: string;
    resultPlaceholderDoc: string;
    resultPlaceholderDispute: string;
  };
  ai: {
    thinking: string;
    addToTodayMoney: string;
    saveToMoney: string;
    cancel: string;
    directAnswer: string;
    whatYouCanDo: string;
    sources: string;
    eligibilityTitle: string;
    moneySavedToast: string;
    netImpact: string;
    earned: string;
    spent: string;
    left: string;
    cancelled: string;
  };
  common: {
    error: string;
    retry: string;
    close: string;
    language: string;
    profile: string;
  };
}

export const translations: Record<Language, Translations> = {
  hi: {
    appName: 'KaamPe',
    tagline: 'Kaam ki baat. Seedhi baat.',
    subTagline: 'Your AI companion for work, money and rights.',
    nav: {
      home: 'Home',
      money: 'Money',
      help: 'Help',
      homeDesc: 'Sawaal poochhein',
      moneyDesc: 'Kamai aur kharcha',
      helpDesc: 'Document aur dispute',
    },
    onboarding: {
      step1Title: 'Bhasha chunein',
      step1Subtitle: 'Choose your language',
      step2Title: 'Aap kis tarah ka kaam karte hain?',
      step3Title: 'Apna rajya (State) chunein',
      continue: 'Aage badhein',
      workerTypes: {
        delivery: 'Delivery (Swiggy, Zomato, etc.)',
        driver: 'Driver (Cab / Auto)',
        construction: 'Construction (Nirmaan karya)',
        domestic: 'Gharelu kaam (Domestic work)',
        daily_wage: 'Dihadi mazdoor (Daily wage)',
        other: 'Anye (Other)',
      },
    },
    home: {
      greeting: 'Namaste 👋',
      questionPrompt: 'Aaj kis cheez mein help chahiye?',
      inputPlaceholder: 'Kaam, paise, rights ya safety ke baare mein poochho…',
      askButton: 'Poochhein',
      todaysMoneyTitle: 'Aaj ka hisaab',
      noMoneyTitle: 'Aaj ki kamai add karein',
      addMoneyAction: '+ Kamai add karein',
      earned: 'Kamai',
      spent: 'Kharcha',
      netToday: 'Bacha',
      shortcuts: {
        addEarning: 'Kamai add karein',
        paymentMissing: 'Payment nahi mili?',
        explainDoc: 'Document samajhna hai?',
        safetyQuestion: 'Safety ka sawaal',
      },
      safetyPrompt: 'Delivery ke time bahut garmi ho rahi hai, kya precautions loon?',
      viewDetails: 'Poora hisaab dekhein →',
      quickActions: 'Jaldi karein',
      conversation: 'Baatcheet',
      languagesHint: 'Hindi / Punjabi / English mein likhein',
      emptyChatTitle: 'Kuch bhi poochhein',
      emptyChatHint: 'Jaise:',
      examplePrompts: ['Aaj Swiggy se 850 kamaye, 200 petrol mein gaye', 'Aaj kitna bacha?', 'Punjab mein construction workers ke liye koi scheme hai?'],
    },
    money: {
      title: 'Money Tracker',
      netToday: 'Bacha aaj',
      earned: 'Kamaya',
      spent: 'Kharcha',
      thisWeek: 'Is hafte ka hisaab',
      recentActivity: 'Haal ki activity',
      emptyActivity: 'Abhi koi entry nahi hai.',
      addFirstPrompt: 'Aaj ki kamai add karke shuru karein.',
      addEarningBtn: '+ Kamai',
      addExpenseBtn: '− Kharcha',
      earningModalTitle: 'Kamai add karein',
      expenseModalTitle: 'Kharcha add karein',
      amountLabel: 'Rupaye (Amount)',
      sourceLabel: 'Platform ya Source (Optional)',
      categoryLabel: 'Category',
      dateLabel: 'Taareekh (Date)',
      noteLabel: 'Note (Optional)',
      save: 'Save karein',
      cancel: 'Cancel',
      delete: 'Delete',
      deleteConfirm: 'Kya aap is entry ko hatana chahte hain?',
      weekNet: 'Hafte ka bacha',
      dailyBreakdown: 'Din-wise hisaab',
      noEntriesDay: 'Koi entry nahi',
      categories: {
        Fuel: 'Petrol / Fuel',
        Food: 'Khana / Chai',
        Maintenance: 'Gadi ki repair',
        'Mobile/data': 'Mobile / Data recharge',
        Equipment: 'Samagri / Equipment',
        Other: 'Anye kharcha',
      },
    },
    help: {
      title: 'Help Center',
      subtitle: 'Document samjhein ya payment dispute draft karein',
      tabExplainDoc: 'Document samjhein',
      tabDispute: 'Payment dispute help',
      docUploadTitle: 'Apna document upload karein',
      docUploadDesc: 'Rate card, agreement, challan ya notice (PDF, JPG, PNG - max 10MB)',
      docUploadBtn: 'File chunein',
      docAnalyzing: 'Document padh rahe hain...',
      docWhatIsThis: 'Yeh document kya hai?',
      docKeyPoints: 'Important baatein',
      docMoney: 'Paisa / Deductions',
      docDates: 'Zaruri dates',
      docCautions: 'Dhyan dene wali baat',
      docAskKaamPe: 'Is document ke baare mein KaamPe se poochhein',
      disputeTitle: 'Apni samasya batayein',
      disputePlaceholder: 'Jaise: Swiggy ka ₹3200 payment 8 din se pending hai...',
      disputeGenerateBtn: 'Draft banayein',
      disputeGenerating: 'Grievance draft banaya ja raha hai...',
      disputeProblemTitle: 'Samasya',
      disputeDraftTitle: 'Draft message (Support ke liye)',
      copy: 'Copy karein',
      copied: 'Copy ho gaya!',
      disputeHint: 'Kripya sachhi jaankari dein (e.g. kitna paisa, kitne din se pending hai).',
      draftEditable: 'Aap is message ko edit kar sakte hain',
      docAskHint: 'Is document ke baare mein chat mein sawaal poochhein',
      docAskPrompt: 'Maine ek document upload kiya hai: "{doc}". Iske baare mein aur batayein.',
      resultPlaceholderDoc: 'Document upload karne ke baad aasaan bhasha mein samjhaya gaya jawab yahan dikhega.',
      resultPlaceholderDispute: 'Aapka draft message yahan dikhega. Aap use edit karke copy kar sakte hain.',
    },
    ai: {
      thinking: 'KaamPe soch raha hai...',
      addToTodayMoney: 'Add to today\'s money?',
      saveToMoney: 'Save',
      cancel: 'Cancel',
      directAnswer: 'Jawab',
      whatYouCanDo: 'Aap kya kar sakte hain',
      sources: 'Official Sarkari Sources',
      eligibilityTitle: 'Patrata (Eligibility)',
      moneySavedToast: 'Paisa safaltapoorvak save ho gaya!',
      netImpact: 'Kul asar',
      earned: 'Kamaya',
      spent: 'Kharcha',
      left: 'Bacha',
      cancelled: 'Cancel kar diya gaya.',
    },
    common: {
      error: 'Kuch gadbad hui. Kripya dobara try karein.',
      retry: 'Dobara koshish karein',
      close: 'Band karein',
      language: 'Bhasha',
      profile: 'Aapki profile',
    },
  },
  en: {
    appName: 'KaamPe',
    tagline: 'Kaam ki baat. Seedhi baat.',
    subTagline: 'Your AI companion for work, money and rights.',
    nav: {
      home: 'Home',
      money: 'Money',
      help: 'Help',
      homeDesc: 'Ask anything',
      moneyDesc: 'Earnings & expenses',
      helpDesc: 'Documents & disputes',
    },
    onboarding: {
      step1Title: 'Select language',
      step1Subtitle: 'Choose how you prefer to read and chat',
      step2Title: 'What kind of work do you do?',
      step3Title: 'Choose your State',
      continue: 'Continue',
      workerTypes: {
        delivery: 'Delivery Partner',
        driver: 'Driver (Cab / Auto)',
        construction: 'Construction Worker',
        domestic: 'Domestic Worker',
        daily_wage: 'Daily Wage Worker',
        other: 'Other Informal Work',
      },
    },
    home: {
      greeting: 'Namaste 👋',
      questionPrompt: 'What do you need help with today?',
      inputPlaceholder: 'Ask about work, money, rights, or safety…',
      askButton: 'Ask',
      todaysMoneyTitle: 'Today\'s money',
      noMoneyTitle: 'Add today\'s earnings',
      addMoneyAction: '+ Add earning',
      earned: 'Earned',
      spent: 'Spent',
      netToday: 'Net today',
      shortcuts: {
        addEarning: 'Add earning',
        paymentMissing: 'Payment pending?',
        explainDoc: 'Explain a document',
        safetyQuestion: 'Safety question',
      },
      safetyPrompt: 'It is very hot during deliveries. What precautions should I take?',
      viewDetails: 'View details →',
      quickActions: 'Quick actions',
      conversation: 'Conversation',
      languagesHint: 'Type in Hindi / Punjabi / English',
      emptyChatTitle: 'Ask anything',
      emptyChatHint: 'For example:',
      examplePrompts: ['Earned 850 from Swiggy today, spent 200 on petrol', 'How much did I save today?', 'Are there government schemes for construction workers in Punjab?'],
    },
    money: {
      title: 'Money Tracker',
      netToday: 'Net today',
      earned: 'Earned',
      spent: 'Spent',
      thisWeek: 'This week',
      recentActivity: 'Recent activity',
      emptyActivity: 'No entries recorded yet.',
      addFirstPrompt: 'Add today\'s earning to get started.',
      addEarningBtn: '+ Earning',
      addExpenseBtn: '− Expense',
      earningModalTitle: 'Add Earning',
      expenseModalTitle: 'Add Expense',
      amountLabel: 'Amount (₹)',
      sourceLabel: 'Source / Platform (Optional)',
      categoryLabel: 'Category',
      dateLabel: 'Date',
      noteLabel: 'Note (Optional)',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this entry?',
      weekNet: 'Net this week',
      dailyBreakdown: 'Day by day',
      noEntriesDay: 'No entries',
      categories: {
        Fuel: 'Fuel / Petrol',
        Food: 'Food / Meals',
        Maintenance: 'Vehicle maintenance',
        'Mobile/data': 'Mobile / Data recharge',
        Equipment: 'Equipment / Tools',
        Other: 'Other expenses',
      },
    },
    help: {
      title: 'Help Center',
      subtitle: 'Understand documents or draft dispute messages',
      tabExplainDoc: 'Explain a document',
      tabDispute: 'Help with a dispute',
      docUploadTitle: 'Upload your document',
      docUploadDesc: 'Rate card, agreement, penalty notice (PDF, JPG, PNG - max 10MB)',
      docUploadBtn: 'Choose file',
      docAnalyzing: 'Analyzing document...',
      docWhatIsThis: 'What is this document?',
      docKeyPoints: 'Important points',
      docMoney: 'Money / Deductions',
      docDates: 'Key dates',
      docCautions: 'Points of caution',
      docAskKaamPe: 'Ask KaamPe about this document',
      disputeTitle: 'Describe your issue',
      disputePlaceholder: 'e.g. Swiggy payment of ₹3200 is pending for 8 days...',
      disputeGenerateBtn: 'Generate draft',
      disputeGenerating: 'Generating grievance draft...',
      disputeProblemTitle: 'Issue summary',
      disputeDraftTitle: 'Draft message (Ready for support)',
      copy: 'Copy',
      copied: 'Copied!',
      disputeHint: 'Share only true details (e.g. how much money, pending for how many days).',
      draftEditable: 'You can edit this message',
      docAskHint: 'Ask questions about this document in chat',
      docAskPrompt: 'I uploaded a document: "{doc}". Tell me more about it.',
      resultPlaceholderDoc: 'After you upload a document, a simple explanation will appear here.',
      resultPlaceholderDispute: 'Your draft message will appear here. You can edit and copy it.',
    },
    ai: {
      thinking: 'KaamPe is thinking...',
      addToTodayMoney: 'Add to today\'s money?',
      saveToMoney: 'Save',
      cancel: 'Cancel',
      directAnswer: 'Answer',
      whatYouCanDo: 'What you can do',
      sources: 'Official Government Sources',
      eligibilityTitle: 'Eligibility assessment',
      moneySavedToast: 'Money saved successfully!',
      netImpact: 'Net impact',
      earned: 'Earned',
      spent: 'Spent',
      left: 'Left',
      cancelled: 'Cancelled.',
    },
    common: {
      error: 'Something went wrong. Please try again.',
      retry: 'Retry',
      close: 'Close',
      language: 'Language',
      profile: 'Your profile',
    },
  },
  pa: {
    appName: 'KaamPe',
    tagline: 'Kaam ki baat. Seedhi baat.',
    subTagline: 'ਤੁਹਾਡਾ ਕੰਮ, ਪੈਸੇ ਅਤੇ ਹੱਕਾਂ ਲਈ ਸਾਥੀ।',
    nav: {
      home: 'Home',
      money: 'Money',
      help: 'Help',
      homeDesc: 'ਸਵਾਲ ਪੁੱਛੋ',
      moneyDesc: 'ਕਮਾਈ ਅਤੇ ਖਰਚਾ',
      helpDesc: 'ਦਸਤਾਵੇਜ਼ ਅਤੇ ਵਿਵਾਦ',
    },
    onboarding: {
      step1Title: 'ਭਾਸ਼ਾ ਚੁਣੋ',
      step1Subtitle: 'ਆਪਣੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਚੁਣੋ',
      step2Title: 'ਤੁਸੀਂ ਕਿਸ ਤਰ੍ਹਾਂ ਦਾ ਕੰਮ ਕਰਦੇ ਹੋ?',
      step3Title: 'ਆਪਣਾ ਰਾਜ (ਸੂਬਾ) ਚੁਣੋ',
      continue: 'ਅੱਗੇ ਵਧੋ',
      workerTypes: {
        delivery: 'ਡਿਲੀਵਰੀ ਪਾਰਟਨਰ',
        driver: 'ਡਰਾਈਵਰ (ਕੈਬ / ਆਟੋ)',
        construction: 'ਉਸਾਰੀ ਮਜ਼ਦੂਰ (Construction)',
        domestic: 'ਘਰੇਲੂ ਕੰਮ (Domestic work)',
        daily_wage: 'ਦਿਹਾੜੀਦਾਰ ਮਜ਼ਦੂਰ (Daily wage)',
        other: 'ਹੋਰ ਕੰਮ (Other)',
      },
    },
    home: {
      greeting: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ 👋',
      questionPrompt: 'ਅੱਜ ਕਿਸ ਚੀਜ਼ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ?',
      inputPlaceholder: 'ਕੰਮ, ਪੈਸੇ, ਹੱਕਾਂ ਜਾਂ ਸੁਰੱਖਿਆ ਬਾਰੇ ਪੁੱਛੋ…',
      askButton: 'ਪੁੱਛੋ',
      todaysMoneyTitle: 'ਅੱਜ ਦਾ ਹਿਸਾਬ',
      noMoneyTitle: 'ਅੱਜ ਦੀ ਕਮਾਈ ਜੋੜੋ',
      addMoneyAction: '+ ਕਮਾਈ ਜੋੜੋ',
      earned: 'ਕਮਾਈ',
      spent: 'ਖਰਚਾ',
      netToday: 'ਬਚਿਆ',
      shortcuts: {
        addEarning: 'ਕਮਾਈ ਜੋੜੋ',
        paymentMissing: 'ਪੇਮੈਂਟ ਨਹੀਂ ਮਿਲੀ?',
        explainDoc: 'ਦਸਤਾਵੇਜ਼ ਸਮਝਣਾ ਹੈ?',
        safetyQuestion: 'ਸੁਰੱਖਿਆ ਦਾ ਸਵਾਲ',
      },
      safetyPrompt: 'ਡਿਲੀਵਰੀ ਵੇਲੇ ਬਹੁਤ ਗਰਮੀ ਹੈ, ਕਿਹੜੀਆਂ ਸਾਵਧਾਨੀਆਂ ਰੱਖਾਂ?',
      viewDetails: 'ਪੂਰਾ ਹਿਸਾਬ ਵੇਖੋ →',
      quickActions: 'ਛੇਤੀ ਕਰੋ',
      conversation: 'ਗੱਲਬਾਤ',
      languagesHint: 'ਹਿੰਦੀ / ਪੰਜਾਬੀ / ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਲਿਖੋ',
      emptyChatTitle: 'ਕੁਝ ਵੀ ਪੁੱਛੋ',
      emptyChatHint: 'ਜਿਵੇਂ:',
      examplePrompts: ['ਅੱਜ Swiggy ਤੋਂ 850 ਕਮਾਏ, 200 ਪੈਟਰੋਲ ਵਿੱਚ ਗਏ', 'ਅੱਜ ਕਿੰਨਾ ਬਚਿਆ?', 'ਪੰਜਾਬ ਵਿੱਚ ਉਸਾਰੀ ਮਜ਼ਦੂਰਾਂ ਲਈ ਕੋਈ ਸਕੀਮ ਹੈ?'],
    },
    money: {
      title: 'Money Tracker',
      netToday: 'ਅੱਜ ਬਾਕੀ',
      earned: 'ਕਮਾਇਆ',
      spent: 'ਖਰਚਿਆ',
      thisWeek: 'ਇਸ ਹਫ਼ਤੇ ਦਾ ਹਿਸਾਬ',
      recentActivity: 'ਤਾਜ਼ਾ ਗਤੀਵਿਧੀ',
      emptyActivity: 'ਅਜੇ ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।',
      addFirstPrompt: 'ਅੱਜ ਦੀ ਕਮਾਈ ਜੋੜ ਕੇ ਸ਼ੁਰੂ ਕਰੋ।',
      addEarningBtn: '+ ਕਮਾਈ',
      addExpenseBtn: '− ਖਰਚਾ',
      earningModalTitle: 'ਕਮਾਈ ਜੋੜੋ',
      expenseModalTitle: 'ਖਰਚਾ ਜੋੜੋ',
      amountLabel: 'ਰੁਪਏ (ਰਕਮ)',
      sourceLabel: 'ਪਲੇਟਫਾਰਮ ਜਾਂ ਸਰੋਤ (ਵਿਕਲਪਿਕ)',
      categoryLabel: 'ਸ਼੍ਰੇਣੀ (Category)',
      dateLabel: 'ਮਿਤੀ (Date)',
      noteLabel: 'ਨੋਟ (ਵਿਕਲਪਿਕ)',
      save: 'ਸੇਵ ਕਰੋ',
      cancel: 'ਰੱਦ ਕਰੋ',
      delete: 'ਹਟਾਓ',
      deleteConfirm: 'ਕੀ ਤੁਸੀਂ ਇਸ ਐਂਟਰੀ ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?',
      weekNet: 'ਹਫ਼ਤੇ ਦੀ ਬਚਤ',
      dailyBreakdown: 'ਦਿਨ-ਵਾਰ ਹਿਸਾਬ',
      noEntriesDay: 'ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ',
      categories: {
        Fuel: 'ਪੈਟਰੋਲ / ਡੀਜ਼ਲ',
        Food: 'ਖਾਣਾ / ਚਾਹ',
        Maintenance: 'ਗੱਡੀ ਦੀ ਮੁਰੰਮਤ',
        'Mobile/data': 'ਮੋਬਾਈਲ ਰੀਚਾਰਜ',
        Equipment: 'ਸਮਾਨ / ਔਜ਼ਾਰ',
        Other: 'ਹੋਰ ਖਰਚਾ',
      },
    },
    help: {
      title: 'Help Center',
      subtitle: 'ਦਸਤਾਵੇਜ਼ ਸਮਝੋ ਜਾਂ ਪੇਮੈਂਟ ਵਿਵਾਦ ਲਈ ਮਦਦ ਲਵੋ',
      tabExplainDoc: 'ਦਸਤਾਵੇਜ਼ ਸਮਝੋ',
      tabDispute: 'ਪੇਮੈਂਟ ਵਿਵਾਦ ਵਿੱਚ ਮਦਦ',
      docUploadTitle: 'ਆਪਣਾ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰੋ',
      docUploadDesc: 'ਰੇਟ ਕਾਰਡ, ਇਕਰਾਰਨਾਮਾ, ਚਲਾਨ (PDF, JPG, PNG - ਵੱਧ ਤੋਂ ਵੱਧ 10MB)',
      docUploadBtn: 'ਫਾਈਲ ਚੁਣੋ',
      docAnalyzing: 'ਦਸਤਾਵੇਜ਼ ਪੜ੍ਹਿਆ ਜਾ ਰਿਹਾ ਹੈ...',
      docWhatIsThis: 'ਇਹ ਦਸਤਾਵੇਜ਼ ਕੀ ਹੈ?',
      docKeyPoints: 'ਜ਼ਰੂਰੀ ਗੱਲਾਂ',
      docMoney: 'ਪੈਸੇ / ਕਟੌਤੀਆਂ',
      docDates: 'ਮਹੱਤਵਪੂਰਨ ਤਾਰੀਖਾਂ',
      docCautions: 'ਧਿਆਨ ਦੇਣ ਯੋਗ ਗੱਲਾਂ',
      docAskKaamPe: 'ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਕਾਮਪੇਅ ਤੋਂ ਪੁੱਛੋ',
      disputeTitle: 'ਆਪਣੀ ਸਮੱਸਿਆ ਦੱਸੋ',
      disputePlaceholder: 'ਜਿਵੇਂ: ਸਵਿਗੀ ਦੀ ₹3200 ਦੀ ਪੇਮੈਂਟ 8 ਦਿਨਾਂ ਤੋਂ ਪੈਂਡਿੰਗ ਹੈ...',
      disputeGenerateBtn: 'ਡਰਾਫਟ ਬਣਾਓ',
      disputeGenerating: 'ਡਰਾਫਟ ਬਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ...',
      disputeProblemTitle: 'ਸਮੱਸਿਆ',
      disputeDraftTitle: 'ਡਰਾਫਟ ਸੁਨੇਹਾ (ਸਪੋਰਟ ਲਈ ਤਿਆਰ)',
      copy: 'ਕਾਪੀ ਕਰੋ',
      copied: 'ਕਾਪੀ ਹੋ ਗਿਆ!',
      disputeHint: 'ਕਿਰਪਾ ਕਰਕੇ ਸੱਚੀ ਜਾਣਕਾਰੀ ਦਿਓ (ਜਿਵੇਂ ਕਿੰਨੇ ਪੈਸੇ, ਕਿੰਨੇ ਦਿਨਾਂ ਤੋਂ ਬਕਾਇਆ)।',
      draftEditable: 'ਤੁਸੀਂ ਇਹ ਸੁਨੇਹਾ ਬਦਲ ਸਕਦੇ ਹੋ',
      docAskHint: 'ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਚੈਟ ਵਿੱਚ ਸਵਾਲ ਪੁੱਛੋ',
      docAskPrompt: 'ਮੈਂ ਇੱਕ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕੀਤਾ ਹੈ: "{doc}"। ਇਸ ਬਾਰੇ ਹੋਰ ਦੱਸੋ।',
      resultPlaceholderDoc: 'ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰਨ ਤੋਂ ਬਾਅਦ ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ ਜਵਾਬ ਇੱਥੇ ਦਿਖੇਗਾ।',
      resultPlaceholderDispute: 'ਤੁਹਾਡਾ ਡਰਾਫਟ ਸੁਨੇਹਾ ਇੱਥੇ ਦਿਖੇਗਾ। ਤੁਸੀਂ ਇਸਨੂੰ ਬਦਲ ਕੇ ਕਾਪੀ ਕਰ ਸਕਦੇ ਹੋ।',
    },
    ai: {
      thinking: 'ਕਾਮਪੇਅ ਸੋਚ ਰਿਹਾ ਹੈ...',
      addToTodayMoney: 'ਕੀ ਇਹ ਅੱਜ ਦੇ ਹਿਸਾਬ ਵਿੱਚ ਜੋੜਨਾ ਹੈ?',
      saveToMoney: 'ਸੇਵ ਕਰੋ',
      cancel: 'ਰੱਦ ਕਰੋ',
      directAnswer: 'ਜਵਾਬ',
      whatYouCanDo: 'ਤੁਸੀਂ ਕੀ ਕਰ ਸਕਦੇ ਹੋ',
      sources: 'ਅਧਿਕਾਰਤ ਸਰਕਾਰੀ ਸਰੋਤ',
      eligibilityTitle: 'ਯੋਗਤਾ ਸਥਿਤੀ',
      moneySavedToast: 'ਪੈਸਾ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਿਆ!',
      netImpact: 'ਕੁੱਲ ਅਸਰ',
      earned: 'ਕਮਾਇਆ',
      spent: 'ਖਰਚਾ',
      left: 'ਬਚਿਆ',
      cancelled: 'ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ।',
    },
    common: {
      error: 'ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      retry: 'ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
      close: 'ਬੰਦ ਕਰੋ',
      language: 'ਭਾਸ਼ਾ',
      profile: 'ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ',
    },
  },
};
