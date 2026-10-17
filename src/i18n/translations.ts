export type Language = 'hi' | 'en' | 'pa';

export interface Translations {
  appName: string;
  tagline: string;
  subTagline: string;
  nav: {
    me: string;
    meDesc: string;
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
    back: string;
    step2Subtitle: string;
    step3Subtitle: string;
    stateLabel: string;
    stepProgress: string;
    workerTypes: {
      delivery: string;
      driver: string;
      construction: string;
      domestic: string;
      daily_wage: string;
      street_vendor: string;
      other: string;
    };
  };
  home: {
    goalProgress: string;
    goalReached: string;
    setGoal: string;
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
    savedEarningToast: string;
    savedExpenseToast: string;
    undoneToast: string;
    quickAmounts: string;
    quickSources: string;
    shareWeek: string;
    shareWeekText: string;
    shareCopied: string;
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
    amountPlaceholder: string;
    sourcePlaceholder: string;
    notePlaceholder: string;
    loading: string;
    errorLoad: string;
    errorAmountInvalid: string;
    errorSaveFailed: string;
    errorDelete: string;
    deleteEntryLabel: string;
    deleteConfirmBtn: string;
    typeEarning: string;
    typeExpense: string;
    today: string;
    chartTitle: string;
    chartCaption: string;
    chartEmpty: string;
    colDay: string;
    colEarned: string;
    colSpent: string;
    colNet: string;
    platformTitle: string;
    platformUnspecified: string;
    platformDays: string;
    platformEarnPerDay: string;
    platformNetPerDay: string;
    platformShare: string;
    platformBest: string;
    platformNote: string;
    platformEmpty: string;
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
    tabSchemes: string;
    tabListLabel: string;
    docFileHint: string;
    docTakePhoto: string;
    docSelected: string;
    docTooLarge: string;
    docTypeError: string;
    docUploadFailed: string;
    docComplaintTitle: string;
    docComplaintHint: string;
    docComplaintBtn: string;
    docComplaintPrefill: string;
    docComplaintMoney: string;
    evidenceLabel: string;
    evidenceHint: string;
    evidencePreviewTitle: string;
    evidenceTemplate: string;
    evidencePlatforms: string;
    evidenceEmpty: string;
    evidenceLoading: string;
    evidenceError: string;
    disputeNotGrievance: string;
    disputeInvalid: string;
    disputeDefaultSummary: string;
    rateLimited: string;
    docQuestionLabel: string;
    docQuestionPlaceholder: string;
    downloadTxt: string;
  };
  schemes: {
    title: string;
    intro: string;
    aboutYouLegend: string;
    ageLabel: string;
    incomeLabel: string;
    optionalHint: string;
    workerTypeLabel: string;
    stateLabel: string;
    epfoLegend: string;
    epfoHint: string;
    esicLegend: string;
    esicHint: string;
    taxLegend: string;
    yes: string;
    no: string;
    unknown: string;
    submit: string;
    checking: string;
    resultsTitle: string;
    resultsRegionLabel: string;
    noMatches: string;
    benefitLabel: string;
    whyQualify: string;
    pleaseCheck: string;
    officialLink: string;
    opensNewTab: string;
    askAbout: string;
    askPrompt: string;
    disclaimerTitle: string;
    errorAge: string;
    errorIncome: string;
    errorInvalid: string;
    errorRateLimit: string;
    errorNetwork: string;
    placeholder: string;
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
    notSavedYet: string;
  };
  profileEditor: {
    edit: string;
    work: string;
    state: string;
    save: string;
    cancel: string;
    saved: string;
    workerShort: {
      delivery: string;
      driver: string;
      construction: string;
      domestic: string;
      daily_wage: string;
      street_vendor: string;
      other: string;
    };
  };
  common: {
    undo: string;
    moreApps: string;
    offline: string;
    error: string;
    retry: string;
    close: string;
    language: string;
    profile: string;
  };
  /** Voice (speech-to-text) input — VoiceInputButton */
  voice: {
    start: string;
    stop: string;
    listening: string;
    stopped: string;
    errorPermission: string;
    errorNoSpeech: string;
    errorNoMic: string;
    errorNetwork: string;
    errorGeneric: string;
    transcribing: string;
    recordingTime: string;
    reviewTranscript: string;
    errorUnsupported: string;
    errorTooShort: string;
    errorTooLong: string;
  };
  /** Read-aloud + copy actions on answers */
  speech: {
    listen: string;
    stop: string;
    copy: string;
    copied: string;
    copyFailed: string;
    speakError: string;
    voiceUnavailable: string;
    listenHint: string;
  };
  /** Floating SOS button + dialog */
  sos: {
    buttonLabel: string;
    title: string;
    intro: string;
    callLabel: string;
    shareLocation: string;
    locating: string;
    locationReady: string;
    openMap: string;
    sendSms: string;
    shareMessage: string;
    locationDenied: string;
    locationUnavailable: string;
    locationUnsupported: string;
  };
  /** "You" tab: profile, merged settings, data */
  me: {
    title: string;
    openProfile: string;
    statsTitle: string;
    statEntries: string;
    statDays: string;
    statStreak: string;
    settingsTitle: string;
    textSize: string;
    textNormal: string;
    textLarge: string;
    textXLarge: string;
    dailyGoal: string;
    dailyGoalHint: string;
    goalSave: string;
    goalRemove: string;
    goalSaved: string;
    haptics: string;
    dataTitle: string;
    exportCsv: string;
    exportEmpty: string;
    exportDone: string;
    clearChat: string;
    chatCleared: string;
    redoSetup: string;
    helplinesTitle: string;
    privacyNote: string;
  };
  a11y: {
    skipToContent: string;
    mainNav: string;
    loading: string;
    largeText: string;
  };
  chat: {
    rateLimited: string;
    newReply: string;
    saveFailed: string;
  };
  forms: {
    invalidAmount: string;
    saveFailed: string;
    amountPlaceholder: string;
    sourcePlaceholder: string;
  };
  /** Questions about an explained document, answered with excerpts */
  docQa: {
    title: string;
    hint: string;
    placeholder: string;
    ask: string;
    asking: string;
    answer: string;
    evidence: string;
    page: string;
    notFound: string;
  };
  /** Guided complaint drafting */
  grievance: {

    kaampe: string;
    you: string;
    answerLabel: string;
    answerPlaceholder: string;
    send: string;
    dontKnow: string;
    reviewTitle: string;
    amount: string;
    duration: string;
    days: string;
    weeks: string;
    months: string;
    notKnown: string;
    platform: string;
    platformHint: string;
    createDraft: string;
    creating: string;
    changeDetails: string;
    notSent: string;
    fallbackNote: string;
    invalidAmount: string;
  };
  /** Light / dark / system appearance */
  theme: {
    title: string;
    system: string;
    light: string;
    dark: string;
    switchTo: string;
  };
  /** Read-aloud accessibility settings and helpers */
  access: {
    title: string;
    readPage: string;
    stopReading: string;
    autoRead: string;
    autoReadHint: string;
    tapToHear: string;
    tapToHearHint: string;
    speechRate: string;
    rateSlow: string;
    rateNormal: string;
    rateFast: string;
    testVoice: string;
    testVoiceSample: string;
  };
  /** Demo account sign-in */
  demo: {
    cardTitle: string;
    cardText: string;
    tryDemo: string;
    loginTitle: string;
    loginIntro: string;
    username: string;
    password: string;
    login: string;
    loggingIn: string;
    credsLabel: string;
    fillCreds: string;
    failed: string;
    welcome: string;
    badge: string;
    logout: string;
    loggedOut: string;
    adminLink: string;
  };
  /** Operator panel at /admin */
  admin: {
    title: string;
    subtitle: string;
    loginTitle: string;
    login: string;
    loggingIn: string;
    logout: string;
    refresh: string;
    updated: string;
    loadFailed: string;
    backToApp: string;
    totalSessions: string;
    active7d: string;
    demoSessions: string;
    moneyEntries: string;
    earningsTracked: string;
    expensesTracked: string;
    conversations: string;
    messages: string;
    documents: string;
    byWorker: string;
    byState: string;
    byLanguage: string;
    activity: string;
    newSessions: string;
    entriesLogged: string;
    topics: string;
    recent: string;
    colRef: string;
    colWho: string;
    colEntries: string;
    colLastActive: string;
    demoTag: string;
    none: string;
    privacyNote: string;
  };
  /** Home / Help content cards: rights tips, schemes for you, week pulse */
  insights: {
    tipTitle: string;
    tipNext: string;
    tipAsk: string;
    schemesTitle: string;
    schemesHint: string;
    checkAll: string;
    officialSite: string;
    weekTitle: string;
    weekEarned: string;
    bestDay: string;
    activeDays: string;
    weekEmpty: string;
    rightsTab: string;
    rightsTitle: string;
    rightsIntro: string;
    askAbout: string;
    rightsNote: string;
    keyPoints: string;
  };
  /** Complaint letter extras: sign-off name and English copy */
  letter: {
    nameLabel: string;
    nameHint: string;
    englishTitle: string;
    englishHint: string;
  };
  /** Trust notes shown next to AI answers and external links */
  trust: {
    aiNote: string;
    newTab: string;
  };
  /** Money → AI insights on the last 30 days */
  moneyInsights: {
    title: string;
    intro: string;
    get: string;
    getting: string;
    refresh: string;
    empty: string;
    tipsTitle: string;
    warningTitle: string;
  };
  /** Optional trips / hours on an earning, and per-trip / per-hour rates */
  work: {
    title: string;
    optional: string;
    tripsLabel: string;
    hoursLabel: string;
    invalid: string;
    perTrip: string;
    perHour: string;
    tripsShort: string;
    hoursShort: string;
  };
  /** Opt-in: save money from chat without the confirmation tap */
  autoSave: {
    label: string;
    hint: string;
    undone: string;
  };
  /** Streaming chat replies */
  stream: {
    stop: string;
    stopped: string;
  };
  /** Help → Safety: situation chips and a short checklist */
  safetyCoach: {
    tab: string;
    title: string;
    intro: string;
    quickLabel: string;
    situationLabel: string;
    placeholder: string;
    get: string;
    getting: string;
    firstStep: string;
    helplinesTitle: string;
    situations: {
      night: string;
      rain: string;
      heat: string;
      harassment: string;
      accident: string;
      otp: string;
    };
  };
  /** Landing sign-in screen */
  auth: {
    heroTitle: string;
    heroText: string;
    featMoney: string;
    featRights: string;
    featSchemes: string;
    featSafety: string;
    demoButton: string;
    demoHint: string;
    orDivider: string;
    signInTab: string;
    signUpTab: string;
    username: string;
    usernameHint: string;
    password: string;
    passwordHint: string;
    name: string;
    signIn: string;
    signingIn: string;
    signUp: string;
    signingUp: string;
    guest: string;
    guestHint: string;
    invalidUsername: string;
    invalidPassword: string;
    failed: string;
    welcomeBack: string;
    welcomeNew: string;
    logout: string;
    loggedOut: string;
    signedInAs: string;
    guestLabel: string;
    adminOpening: string;
  };
  /** Sidebar / menu tools */
  tools: {
    title: string;
    openMenu: string;
    closeMenu: string;
    assistant: string;
    assistantDesc: string;
    schemes: string;
    schemesDesc: string;
    rights: string;
    rightsDesc: string;
    safety: string;
    safetyDesc: string;
    documents: string;
    documentsDesc: string;
    complaint: string;
    complaintDesc: string;
    preferences: string;
  };
}

export const translations: Record<Language, Translations> = {
  hi: {
    appName: 'KaamPe',
    tagline: 'Kaam ki baat. Seedhi baat.',
    subTagline: 'Your AI companion for work, money and rights.',
    nav: {
      me: "Aap",
      meDesc: "Profile aur settings",
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
      back: 'Peeche',
      step2Subtitle: 'Sahi jaankari ke liye apna kaam chunein',
      step3Subtitle: 'Sarkari schemes aapke state ke hisaab se dikhengi',
      stateLabel: 'Rajya (State)',
      stepProgress: 'Kadam {n} / 3',
      workerTypes: {
        delivery: 'Delivery (Swiggy, Zomato, etc.)',
        driver: 'Driver (Cab / Auto)',
        construction: 'Construction (Nirmaan karya)',
        domestic: 'Gharelu kaam (Domestic work)',
        daily_wage: 'Dihadi mazdoor (Daily wage)',
        street_vendor: 'Rehri-patri (Street vendor)',
        other: 'Anye (Other)',
      },
    },
    home: {
      goalProgress: "{goal} ke target mein se {left} baaki",
      goalReached: "Aaj ka target poora ho gaya",
      setGoal: "Roz ka target rakhein",
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
      savedEarningToast: "{amount} kamai save hui",
      savedExpenseToast: "{amount} kharcha save hua",
      undoneToast: "Entry hata di",
      quickAmounts: "Jaldi rakam chunein",
      quickSources: "Platform chunein",
      shareWeek: "Hafte ka hisaab bhejein",
      shareWeekText: "Is hafte ka hisaab: Kamai {earned}, Kharcha {spent}, Bacha {net}. (KaamPe)",
      shareCopied: "Hisaab copy ho gaya",
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
      amountPlaceholder: 'Jaise: 850',
      sourcePlaceholder: 'Jaise: Swiggy, Zomato, Cash',
      notePlaceholder: 'Koi aur jaankari (zaroori nahi)',
      loading: 'Hisaab load ho raha hai…',
      errorLoad: 'Hisaab load nahi ho paya. Internet check karke dobara try karein.',
      errorAmountInvalid: '₹0 se zyada sahi rakam likhein (zyada se zyada 2 decimal).',
      errorSaveFailed: 'Entry save nahi ho payi. Kripya dobara try karein.',
      errorDelete: 'Entry hata nahi paye. Kripya dobara try karein.',
      deleteEntryLabel: '{type} {amount} ({date}) hatayein',
      deleteConfirmBtn: 'Haan, hatayein',
      typeEarning: 'Kamai',
      typeExpense: 'Kharcha',
      today: 'Aaj',
      chartTitle: '7 din ka bacha',
      chartCaption: 'Pichhle 7 din ki kamai, kharcha aur bacha',
      chartEmpty: 'Is hafte abhi koi entry nahi hai.',
      colDay: 'Din',
      colEarned: 'Kamai',
      colSpent: 'Kharcha',
      colNet: 'Bacha',
      platformTitle: 'Platform-wise kamai (7 din)',
      platformUnspecified: 'Bina naam ka source',
      platformDays: '{n} din kaam',
      platformEarnPerDay: '{amount}/din kamai',
      platformNetPerDay: 'lagbhag {amount}/din bacha',
      platformShare: 'Hafte ki kamai ka {pct}%',
      platformBest: 'Sabse zyada bacha',
      platformNote: 'Bacha/din ek anumaan hai: har din ka kharcha us din ki kamai ke hisaab se platforms mein baanta gaya hai.',
      platformEmpty: 'Kamai add karte waqt platform ka naam likhein (jaise Swiggy), yahan tulna dikhegi.',
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
      docUploadDesc: 'Rate card, agreement, challan ya notice (PDF, JPG, PNG, WebP - max 10MB)',
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
      tabSchemes: 'Sarkari schemes',
      tabListLabel: 'Help ke vikalp',
      docFileHint: 'PDF, JPG, PNG, WebP (max 10MB)',
      docTakePhoto: 'Camera se photo lein',
      docSelected: 'Chuni gayi file: {name}',
      docTooLarge: 'File 10MB se badi hai. Chhoti file chunein.',
      docTypeError: 'Sirf PDF, JPG, PNG ya WebP file chunein.',
      docUploadFailed: 'Document padh nahi paye. Kripya dobara try karein.',
      docComplaintTitle: 'Is document se koi shikayat hai?',
      docComplaintHint: 'Is document ki jaankari ke saath shikayat ka draft shuru karein',
      docComplaintBtn: 'Shikayat likhein',
      docComplaintPrefill: 'Mujhe is document ke baare mein shikayat karni hai: {doc}{money}\nMeri samasya: ',
      docComplaintMoney: '\nPaise ki baatein: {items}',
      evidenceLabel: 'Pichhle 7 din ki kamai saboot ke roop mein jodein',
      evidenceHint: 'KaamPe mein darj aapka hisaab aapki baat ke saath bheja jayega.',
      evidencePreviewTitle: 'Yeh joda jayega:',
      evidenceTemplate: 'Mere KaamPe record ke hisaab se pichhle 7 din ({from} se {to}): kul kamai {earned}, kharcha {spent}, bacha {net}; {days} din kaam darj hai.',
      evidencePlatforms: ' Platform-wise kamai: {list}.',
      evidenceEmpty: 'Pichhle 7 din mein koi kamai darj nahi hai, isliye kuch nahi joda jayega.',
      evidenceLoading: 'Hisaab nikal rahe hain…',
      evidenceError: 'Kamai ka hisaab load nahi ho paya. Bina saboot ke draft banega.',
      disputeNotGrievance: 'Yeh payment ya kaam ki shikayat jaisa nahi laga. Kripya likhein: kis kaam ka, kitna paisa, aur kitne din se pending hai.',
      disputeInvalid: 'Kripya apni samasya chhote mein likhein (1500 akshar tak).',
      disputeDefaultSummary: 'Payment ki samasya',
      rateLimited: 'Bahut jaldi request ho gayi. Kuch second ruk kar dobara try karein.',
      docQuestionLabel: 'Is document ke baare mein aapka sawaal',
      docQuestionPlaceholder: 'Jaise: Kya yeh penalty sahi hai?',
      downloadTxt: 'Download (.txt)',
    },
    schemes: {
      title: 'Kaun si sarkari scheme mil sakti hai?',
      intro: 'Kuch sawaalon ke jawab dein. Scheme sirf aapke jawab ke hisaab se dikhengi; aakhri faisla sarkari office ya portal karega.',
      aboutYouLegend: 'Aapke baare mein',
      ageLabel: 'Umar (saal)',
      incomeLabel: 'Mahine ki kamai (₹)',
      optionalHint: 'Zaroori nahi, par isse sahi scheme milti hai',
      workerTypeLabel: 'Kaam',
      stateLabel: 'Rajya (State)',
      epfoLegend: 'Kya aapka PF (EPFO) katta hai?',
      epfoHint: 'Salary slip par "PF" ya "EPF" likha hota hai',
      esicLegend: 'Kya aapke paas ESIC (ESI card) hai?',
      esicHint: 'Company ke through ESI hospital wala card',
      taxLegend: 'Kya aap income tax bharte hain?',
      yes: 'Haan',
      no: 'Nahi',
      unknown: 'Pata nahi',
      submit: 'Meri schemes dekhein',
      checking: 'Check kar rahe hain…',
      resultsTitle: '{n} scheme aapke liye kaam ki ho sakti hain',
      resultsRegionLabel: 'Scheme ke nateeje',
      noMatches: 'Aapke jawab ke hisaab se abhi koi scheme match nahi hui. Nazdeeki CSC ya labour office se bhi poochh sakte hain.',
      benefitLabel: 'Fayda',
      whyQualify: 'Aap kyun yogya ho sakte hain',
      pleaseCheck: 'Yeh zaroor check karein',
      officialLink: 'Official website',
      opensNewTab: '(naye tab mein khulega)',
      askAbout: 'KaamPe se poochhein',
      askPrompt: '"{scheme}" scheme ke liye apply kaise karein aur kaun se documents chahiye?',
      disclaimerTitle: 'Dhyan dein',
      errorAge: 'Umar 14 se 100 saal ke beech likhein.',
      errorIncome: 'Kamai 0 ya usse zyada likhein.',
      errorInvalid: 'Kuch jawab sahi nahi lage. Check karke dobara bhejein.',
      errorRateLimit: 'Bahut jaldi dobara poocha. {seconds} second baad try karein.',
      errorNetwork: 'Internet connection check karein aur dobara try karein.',
      placeholder: 'Form bharne ke baad aapke liye schemes yahan dikhengi.',
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
      notSavedYet: 'ABHI SAVE NAHI',
    },
    profileEditor: {
      edit: 'Badlein',
      work: 'Aapka kaam',
      state: 'Rajya',
      save: 'Profile save karein',
      cancel: 'Cancel',
      saved: 'Profile update ho gayi',
      workerShort: {
        delivery: 'Delivery',
        driver: 'Driver',
        construction: 'Nirmaan',
        domestic: 'Gharelu kaam',
        daily_wage: 'Dihadi',
        street_vendor: 'Rehri-patri',
        other: 'Anye',
      },
    },
    common: {
      undo: "Wapas lein",
      moreApps: "Aur apps",
      offline: "Internet nahi hai. Judte hi KaamPe phir chalega.",
      error: 'Kuch gadbad hui. Kripya dobara try karein.',
      retry: 'Dobara koshish karein',
      close: 'Band karein',
      language: 'Bhasha',
      profile: 'Aapki profile',
    },
    voice: {
      start: 'Bolkar likhein (mic)',
      stop: 'Mic band karein',
      listening: 'Sun rahe hain… boliye',
      stopped: 'Mic band ho gaya',
      errorPermission: 'Mic ki permission nahi mili. Browser settings mein mic allow karein.',
      errorNoSpeech: 'Kuch sunai nahi diya. Dobara boliye.',
      errorNoMic: 'Mic nahi mila. Mic check karein.',
      errorNetwork: 'Internet nahi hai, isliye bolkar likhna abhi nahi chalega.',
      errorGeneric: 'Bolkar likhna abhi nahi chala. Type karke likhein.',
      transcribing: 'Awaaz ko text mein badal rahe hain…',
      recordingTime: 'Recording… {seconds} / {max} second',
      reviewTranscript: 'Aapki awaaz text mein likh di gayi hai. Jaanch kar badlein, phir "Poochhein" dabayein.',
      errorUnsupported: 'Is browser mein awaaz record nahi ho sakti. Kripya type karein.',
      errorTooShort: 'Recording bahut chhoti thi. Mic dabakar boliye, phir rokein.',
      errorTooLong: 'Recording bahut lambi hai. 1 minute se chhota sandesh bolein.',
    },
    speech: {
      listen: 'Sunein',
      stop: 'Rokein',
      copy: 'Copy',
      copied: 'Jawab copy hua',
      copyFailed: 'Copy nahi hua. Text ko daba kar copy karein.',
      speakError: 'Awaaz mein sunana abhi nahi chala.',
      voiceUnavailable: 'Is phone mein is bhasha ki awaaz nahi hai. Jawab padh lein, ya phone settings mein awaaz jodein.',
      listenHint: 'Phone ki apni awaaz se padhkar sunata hai',
    },
    sos: {
      buttonLabel: 'SOS: emergency number aur location bhejein',
      title: 'Emergency (SOS)',
      intro: 'Turant call karne ke liye number dabayein. Yeh number free hain.',
      callLabel: 'Call karein',
      shareLocation: 'Apni location bhejein',
      locating: 'Location dhoondh rahe hain…',
      locationReady: 'Location mil gayi. Kisi apne ko bhejein:',
      openMap: 'Map par dekhein',
      sendSms: 'SMS se bhejein',
      shareMessage: 'Mujhe madad chahiye. Meri location:',
      locationDenied: 'Location ki permission nahi mili. Browser settings mein location allow karein.',
      locationUnavailable: 'Location nahi mil payi. Thodi der baad dobara try karein.',
      locationUnsupported: 'Is phone/browser mein location nahi chalti.',
    },
    me: {
      title: "Aapki profile",
      openProfile: "Profile aur settings kholein",
      statsTitle: "Aapka record",
      statEntries: "Entries",
      statDays: "Din likhe",
      statStreak: "Lagataar din",
      settingsTitle: "Settings",
      textSize: "Akshar ka size",
      textNormal: "Normal",
      textLarge: "Bada",
      textXLarge: "Sabse bada",
      dailyGoal: "Roz ka target",
      dailyGoalHint: "Home par dikhega target tak kitna baaki hai",
      goalSave: "Target rakhein",
      goalRemove: "Target hatayein",
      goalSaved: "Target save ho gaya",
      haptics: "Save par halka vibration",
      dataTitle: "Aapka data",
      exportCsv: "Hisaab download karein (CSV)",
      exportEmpty: "Abhi download karne ko kuch nahi hai",
      exportDone: "File download ho gayi",
      clearChat: "Baatcheet saaf karein",
      chatCleared: "Baatcheet saaf ho gayi",
      redoSetup: "Setup dobara karein",
      helplinesTitle: "Zaroori numbers",
      privacyNote: "Aapka hisaab sirf is phone ke session se juda hai. Koi login ya Aadhaar nahi chahiye.",
    },
    a11y: {
      skipToContent: 'Seedhe content par jaayein',
      mainNav: 'Mukhya navigation',
      loading: 'Load ho raha hai…',
      largeText: 'Bade akshar',
    },
    chat: {
      rateLimited: 'Thoda ruk kar dobara bhejein.',
      newReply: 'KaamPe ka jawab aa gaya',
      saveFailed: 'Paisa save nahi ho paya. Dobara try karein.',
    },
    forms: {
      invalidAmount: 'Sahi rakam likhein (0 se zyada).',
      saveFailed: 'Save nahi ho paya. Dobara try karein.',
      amountPlaceholder: 'Jaise 850',
      sourcePlaceholder: 'Jaise Swiggy, Zomato, Cash',
    },
    docQa: {
      title: 'Is document ke baare mein poochhein',
      hint: 'Jawab sirf isi document se diya jayega, saath mein document ki line bhi.',
      placeholder: 'Jaise: Order cancel karne par kitna katega?',
      ask: 'Poochhein',
      asking: 'Document mein dhoondh rahe hain…',
      answer: 'Jawab',
      evidence: 'Document mein likha hai',
      page: 'Page {page}',
      notFound: 'Document mein nahi mila',
    },
    grievance: {

      kaampe: 'KaamPe',
      you: 'Aap',
      answerLabel: 'Aapka jawab',
      answerPlaceholder: 'Jaise: ₹3200, 8 din',
      send: 'Bhejein',
      dontKnow: 'Pata nahi',
      reviewTitle: 'Jaankari jaanch lein',
      amount: 'Rakam (₹)',
      duration: 'Kitne samay se',
      days: 'din',
      weeks: 'hafte',
      months: 'mahine',
      notKnown: 'Pata nahi',
      platform: 'Platform ya maalik ka naam (zaroori nahi)',
      platformHint: 'Naam nahi likhna ho to khaali chhod dein.',
      createDraft: 'Draft banayein',
      creating: 'Draft likh rahe hain…',
      changeDetails: 'Jaankari badlein',
      notSent: 'KaamPe yeh sandesh khud nahi bhejta. Copy karke aap khud bhejein.',
      fallbackNote: 'AI abhi uplabdh nahi tha, isliye yeh seedha draft sirf aapki di hui jaankari se bana hai.',
      invalidAmount: 'Rakam sahi likhein (0 se zyada, 2 decimal tak).',
    },
    theme: {
      title: "Rang (theme)",
      system: "Phone jaisa",
      light: "Din (light)",
      dark: "Raat (dark)",
      switchTo: "Theme badlein, abhi: {mode}",
    },
    access: {
      title: "Sunne mein madad",
      readPage: "Yeh screen sunein",
      stopReading: "Padhna rokein",
      autoRead: "Jawab apne aap sunayein",
      autoReadHint: "KaamPe ka har naya jawab khud bol kar sunayega.",
      tapToHear: "Chhoo kar sunein",
      tapToHearHint: "Screen par koi bhi likha hua chhooein, KaamPe use padh kar sunayega.",
      speechRate: "Bolne ki raftaar",
      rateSlow: "Dheere",
      rateNormal: "Normal",
      rateFast: "Tez",
      testVoice: "Aawaz check karein",
      testVoiceSample: "Namaste! Main KaamPe hoon. Aapki kamai, haq aur madad ki baat seedhi bhasha mein.",
    },
    demo: {
      cardTitle: "Demo dekhna hai?",
      cardText: "Ek delivery rider ke 3 hafte ke hisaab ke saath app chala kar dekhein.",
      tryDemo: "Demo account kholein",
      loginTitle: "Demo account mein login",
      loginIntro: "Is account mein pehle se sample kamai aur kharche bhare hain. Har login ek naya, alag copy deta hai.",
      username: "Username",
      password: "Password",
      login: "Login karein",
      loggingIn: "Login ho raha hai…",
      credsLabel: "Demo login: {username} / {password}",
      fillCreds: "Demo details bharein",
      failed: "Login nahi ho paya. Dobara koshish karein.",
      welcome: "Demo account khul gaya. Sab data sample hai.",
      badge: "Demo account",
      logout: "Demo se bahar niklein",
      loggedOut: "Demo band. Naya khaali account shuru hua.",
      adminLink: "Admin panel",
    },
    admin: {
      title: "KaamPe Admin",
      subtitle: "Istemal ke aankde (sirf ginti, koi niji baat nahi)",
      loginTitle: "Admin login",
      login: "Login karein",
      loggingIn: "Login ho raha hai…",
      logout: "Logout",
      refresh: "Taaza karein",
      updated: "{time} par update",
      loadFailed: "Aankde load nahi hue. Dobara koshish karein.",
      backToApp: "App par wapas",
      totalSessions: "Kul users (sessions)",
      active7d: "Pichhle 7 din active",
      demoSessions: "Demo sessions",
      moneyEntries: "Paise ki entries",
      earningsTracked: "Kul kamai darj",
      expensesTracked: "Kul kharcha darj",
      conversations: "Baatcheet",
      messages: "Sandesh",
      documents: "Documents samjhaaye",
      byWorker: "Kaam ke hisaab se",
      byState: "Rajya ke hisaab se",
      byLanguage: "Bhasha ke hisaab se",
      activity: "Pichhle 14 din",
      newSessions: "Naye users",
      entriesLogged: "Entries",
      topics: "Log kya poochh rahe hain",
      recent: "Haal ke sessions",
      colRef: "Ref",
      colWho: "Kaun",
      colEntries: "Entries",
      colLastActive: "Aakhri baar",
      demoTag: "demo",
      none: "Abhi kuch nahi",
      privacyNote: "Yahan kisi ka sandesh, note ya poora session ID nahi dikhaya jaata.",
    },
    insights: {
      tipTitle: "Apna haq jaanein",
      tipNext: "Agla",
      tipAsk: "Is par sawaal karein",
      schemesTitle: "Aapke liye yojanaayein",
      schemesHint: "Aapke kaam ke hisaab se. Pakki jaankari official site par dekhein.",
      checkAll: "Eligibility check karein",
      officialSite: "Official site",
      weekTitle: "Is hafte",
      weekEarned: "{amount} kamaaye",
      bestDay: "Sabse achha din: {day}, {amount}",
      activeDays: "{count}/7 din kaam kiya",
      weekEmpty: "Is hafte abhi koi entry nahi.",
      rightsTab: "Aapke haq",
      rightsTitle: "Kaam ke haq, aasaan bhasha mein",
      rightsIntro: "Har topic chhoota rakha hai. Sunein, ya KaamPe se apni situation ke baare mein poochhein.",
      askAbout: "KaamPe se sawaal karein",
      rightsNote: "Yeh aam jaankari hai, kanooni salah nahi. Pakki baat ke liye labour office ya 15100 (muft kanooni madad) se baat karein.",
      keyPoints: "Zaroori baatein",
    },
    letter: {
      nameLabel: 'Aapka naam (chitthi ke neeche)',
      nameHint: 'Zaroori nahi. Sirf isi phone par yaad rehta hai.',
      englishTitle: 'English copy (company ya office ke liye)',
      englishHint: 'Sirf aapki batayi baaton se bani hai. Bhejne se pehle padh lein.',
    },
    trust: {
      aiNote: 'AI galti kar sakta hai. Zaroori baat sarkari site ya helpline se pakki karein.',
      newTab: 'naye tab mein khulega',
    },
    moneyInsights: {
      title: 'AI se hisaab samjhein',
      intro: 'Pichhle 30 din ki kamai aur kharch par chhoti salah.',
      get: 'Salah paayein',
      getting: 'Dekh rahe hain…',
      refresh: 'Dobara dekhein',
      empty: 'Salah ke liye pehle kuch kamai ya kharch jodein.',
      tipsTitle: 'Bachat badhane ke tarike',
      warningTitle: 'Dhyan dein',
    },
    work: {
      title: 'Kaam ki jaankari',
      optional: 'zaroori nahi',
      tripsLabel: 'Kitni delivery / trip',
      hoursLabel: 'Kitne ghante',
      invalid: 'Trip 0 se 1000 tak aur ghante 24 tak likhein.',
      perTrip: '{amount} har trip',
      perHour: '{amount} har ghanta',
      tripsShort: '{n} trip',
      hoursShort: '{n} ghante',
    },
    autoSave: {
      label: 'Chat se paisa seedha save karein',
      hint: 'Band ho to har baar pehle poochha jaata hai. Chalu ho to turant save hota hai aur Wapas lene ka option milta hai.',
      undone: 'Entry hata di gayi.',
    },
    stream: {
      stop: 'Rokein',
      stopped: 'Jawab rok diya gaya.',
    },
    safetyCoach: {
      tab: 'Suraksha',
      title: 'Suraksha salah',
      intro: 'Halaat chunein ya apne shabdon mein batayein. KaamPe chhoti checklist dega.',
      quickLabel: 'Jaldi chunein',
      situationLabel: 'Kya ho raha hai?',
      placeholder: 'Jaise: raat ko sunsaan raste par delivery hai',
      get: 'Suraksha steps paayein',
      getting: 'Steps ban rahe hain…',
      firstStep: 'Sabse pehle',
      helplinesTitle: 'Zaroorat ho to call karein',
      situations: {
        night: 'Raat ko akele kaam',
        rain: 'Tez baarish ya paani bhara',
        heat: 'Bahut garmi / loo',
        harassment: 'Koi pareshan ya dhamka raha hai',
        accident: 'Sadak hadsa',
        otp: 'Koi OTP ya PIN maang raha hai',
      },
    },
    auth: {
      heroTitle: "Kaam, paisa aur haq. Ek jagah.",
      heroText: "Delivery, driving, construction ya ghar ka kaam: KaamPe aapki kamai ka hisaab rakhta hai, haq aur yojanaayein samjhata hai, aur shikayat likhne mein madad karta hai.",
      featMoney: "Bol kar kamai aur kharcha likhein",
      featRights: "Apne haq aasaan bhasha mein",
      featSchemes: "Sarkari yojanaon ki jaanch",
      featSafety: "Safety aur SOS ek tap par",
      demoButton: "Demo dekhein, ek click mein",
      demoHint: "3 hafte ke sample hisaab ke saath. Koi password nahi.",
      orDivider: "ya login karein",
      signInTab: "Login",
      signUpTab: "Naya account",
      username: "Username",
      usernameHint: "3-32 akshar: a-z, 0-9, _ ya .",
      password: "Password",
      passwordHint: "Kam se kam 8 akshar",
      name: "Aapka naam (zaroori nahi)",
      signIn: "Login karein",
      signingIn: "Login ho raha hai…",
      signUp: "Account banayein",
      signingUp: "Account ban raha hai…",
      guest: "Bina account ke aage badhein",
      guestHint: "Data sirf is phone ke session mein rahega.",
      invalidUsername: "Username 3-32 akshar ka ho: a-z, 0-9, _ ya .",
      invalidPassword: "Password kam se kam 8 akshar ka ho.",
      failed: "Login nahi ho paya. Dobara koshish karein.",
      welcomeBack: "Wapas aane par swagat hai!",
      welcomeNew: "Account ban gaya. Ab apni jaankari bharein.",
      logout: "Logout",
      loggedOut: "Aap logout ho gaye.",
      signedInAs: "{name} ke roop mein",
      guestLabel: "Bina account",
      adminOpening: "Admin panel khul raha hai…",
    },
    tools: {
      title: "Tools",
      openMenu: "Menu kholein",
      closeMenu: "Menu band karein",
      assistant: "Sahayak",
      assistantDesc: "Kuch bhi poochhein",
      schemes: "Yojanaayein",
      schemesDesc: "Kaun si yojana aapke liye",
      rights: "Aapke haq",
      rightsDesc: "Kanoon aasaan bhasha mein",
      safety: "Safety",
      safetyDesc: "Raat, baarish, dhokha",
      documents: "Documents",
      documentsDesc: "Kaagaz samjhein",
      complaint: "Shikayat",
      complaintDesc: "Payment ya jhagde ki chitthi",
      preferences: "Pasand",
    },
  },
  en: {
    appName: 'KaamPe',
    tagline: 'Kaam ki baat. Seedhi baat.',
    subTagline: 'Your AI companion for work, money and rights.',
    nav: {
      me: "You",
      meDesc: "Profile and settings",
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
      back: 'Back',
      step2Subtitle: 'Select your primary work',
      step3Subtitle: 'Schemes and rights tailored to your state',
      stateLabel: 'State',
      stepProgress: 'Step {n} of 3',
      workerTypes: {
        delivery: 'Delivery Partner',
        driver: 'Driver (Cab / Auto)',
        construction: 'Construction Worker',
        domestic: 'Domestic Worker',
        daily_wage: 'Daily Wage Worker',
        street_vendor: 'Street Vendor',
        other: 'Other Informal Work',
      },
    },
    home: {
      goalProgress: "{left} to go of {goal}",
      goalReached: "Today's target reached",
      setGoal: "Set a daily target",
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
      savedEarningToast: "{amount} earning saved",
      savedExpenseToast: "{amount} expense saved",
      undoneToast: "Entry removed",
      quickAmounts: "Quick amounts",
      quickSources: "Pick a platform",
      shareWeek: "Share this week",
      shareWeekText: "This week: Earned {earned}, Spent {spent}, Saved {net}. (KaamPe)",
      shareCopied: "Summary copied",
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
      amountPlaceholder: 'e.g. 850',
      sourcePlaceholder: 'e.g. Swiggy, Zomato, Cash',
      notePlaceholder: 'Optional details',
      loading: 'Loading your money summary…',
      errorLoad: 'Could not load your money summary. Check your internet and try again.',
      errorAmountInvalid: 'Enter a valid amount greater than ₹0 (up to 2 decimals).',
      errorSaveFailed: 'Could not save the entry. Please try again.',
      errorDelete: 'Could not delete the entry. Please try again.',
      deleteEntryLabel: 'Delete {type} of {amount} on {date}',
      deleteConfirmBtn: 'Yes, delete',
      typeEarning: 'Earning',
      typeExpense: 'Expense',
      today: 'Today',
      chartTitle: 'Net, last 7 days',
      chartCaption: 'Earnings, expenses and net for the last 7 days',
      chartEmpty: 'No entries this week yet.',
      colDay: 'Day',
      colEarned: 'Earned',
      colSpent: 'Spent',
      colNet: 'Net',
      platformTitle: 'Earnings by platform (7 days)',
      platformUnspecified: 'Unnamed source',
      platformDays: '{n} days worked',
      platformEarnPerDay: '{amount}/day earned',
      platformNetPerDay: 'about {amount}/day net',
      platformShare: '{pct}% of week\'s earnings',
      platformBest: 'Best net per day',
      platformNote: 'Net/day is an estimate: each day\'s expenses are split across platforms in proportion to that day\'s earnings.',
      platformEmpty: 'Add the platform name (e.g. Swiggy) when you log earnings to compare platforms here.',
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
      docUploadDesc: 'Rate card, agreement, penalty notice (PDF, JPG, PNG, WebP - max 10MB)',
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
      tabSchemes: 'Government schemes',
      tabListLabel: 'Help options',
      docFileHint: 'PDF, JPG, PNG, WebP (max 10MB)',
      docTakePhoto: 'Take a photo',
      docSelected: 'Selected file: {name}',
      docTooLarge: 'File is larger than 10MB. Please choose a smaller file.',
      docTypeError: 'Please choose a PDF, JPG, PNG or WebP file.',
      docUploadFailed: 'Could not read the document. Please try again.',
      docComplaintTitle: 'Have a complaint about this document?',
      docComplaintHint: 'Start a complaint draft with this document\'s details',
      docComplaintBtn: 'Draft a complaint',
      docComplaintPrefill: 'I want to complain about this document: {doc}{money}\nMy problem: ',
      docComplaintMoney: '\nMoney details: {items}',
      evidenceLabel: 'Attach my last 7 days earnings as evidence',
      evidenceHint: 'Your KaamPe records will be sent along with your description.',
      evidencePreviewTitle: 'This will be added:',
      evidenceTemplate: 'As per my KaamPe records for the last 7 days ({from} to {to}): total earnings {earned}, expenses {spent}, net {net}; work recorded on {days} days.',
      evidencePlatforms: ' Earnings by platform: {list}.',
      evidenceEmpty: 'No earnings recorded in the last 7 days, so nothing will be added.',
      evidenceLoading: 'Calculating your earnings…',
      evidenceError: 'Could not load your earnings. The draft will be made without evidence.',
      disputeNotGrievance: 'This does not look like a payment or work complaint. Please mention which work, how much money, and for how many days it has been pending.',
      disputeInvalid: 'Please describe your issue more briefly (up to 1500 characters).',
      disputeDefaultSummary: 'Payment issue reported',
      rateLimited: 'Too many requests. Please wait a few seconds and try again.',
      docQuestionLabel: 'Your question about this document',
      docQuestionPlaceholder: 'e.g. Is this penalty correct?',
      downloadTxt: 'Download (.txt)',
    },
    schemes: {
      title: 'Which government schemes could help you?',
      intro: 'Answer a few questions. Schemes are matched only on your answers; the final decision is made by the government office or portal.',
      aboutYouLegend: 'About you',
      ageLabel: 'Age (years)',
      incomeLabel: 'Monthly income (₹)',
      optionalHint: 'Optional, but helps find the right schemes',
      workerTypeLabel: 'Work',
      stateLabel: 'State',
      epfoLegend: 'Is PF (EPFO) deducted from your pay?',
      epfoHint: 'Your salary slip shows "PF" or "EPF"',
      esicLegend: 'Do you have ESIC (ESI card)?',
      esicHint: 'ESI hospital card provided through an employer',
      taxLegend: 'Do you pay income tax?',
      yes: 'Yes',
      no: 'No',
      unknown: 'Don\'t know',
      submit: 'Show my schemes',
      checking: 'Checking…',
      resultsTitle: '{n} schemes may be relevant for you',
      resultsRegionLabel: 'Scheme results',
      noMatches: 'No scheme matched your answers right now. You can also ask at your nearest CSC or labour office.',
      benefitLabel: 'Benefit',
      whyQualify: 'Why you may qualify',
      pleaseCheck: 'Please check',
      officialLink: 'Official website',
      opensNewTab: '(opens in a new tab)',
      askAbout: 'Ask KaamPe',
      askPrompt: 'How do I apply for the "{scheme}" scheme and which documents do I need?',
      disclaimerTitle: 'Please note',
      errorAge: 'Enter an age between 14 and 100 years.',
      errorIncome: 'Enter an income of 0 or more.',
      errorInvalid: 'Some answers look incorrect. Please check and submit again.',
      errorRateLimit: 'Too many requests. Please try again in {seconds} seconds.',
      errorNetwork: 'Check your internet connection and try again.',
      placeholder: 'After you fill the form, schemes for you will appear here.',
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
      notSavedYet: 'NOT SAVED YET',
    },
    profileEditor: {
      edit: 'Edit',
      work: 'Your work',
      state: 'State',
      save: 'Save profile',
      cancel: 'Cancel',
      saved: 'Profile updated',
      workerShort: {
        delivery: 'Delivery',
        driver: 'Driver',
        construction: 'Construction',
        domestic: 'Domestic',
        daily_wage: 'Daily wage',
        street_vendor: 'Street vendor',
        other: 'Other',
      },
    },
    common: {
      undo: "Undo",
      moreApps: "More apps",
      offline: "You're offline. KaamPe will work again once you reconnect.",
      error: 'Something went wrong. Please try again.',
      retry: 'Retry',
      close: 'Close',
      language: 'Language',
      profile: 'Your profile',
    },
    voice: {
      start: 'Speak to type (mic)',
      stop: 'Stop the mic',
      listening: 'Listening… speak now',
      stopped: 'Mic stopped',
      errorPermission: 'Microphone permission was denied. Allow the mic in your browser settings.',
      errorNoSpeech: 'Did not hear anything. Please speak again.',
      errorNoMic: 'No microphone found. Please check your mic.',
      errorNetwork: 'No internet, so voice typing is not available right now.',
      errorGeneric: 'Voice typing did not work. Please type instead.',
      transcribing: 'Turning your voice into text…',
      recordingTime: 'Recording… {seconds} / {max} seconds',
      reviewTranscript: 'Your voice was turned into text. Check or edit it, then press Ask.',
      errorUnsupported: 'This browser cannot record voice. Please type instead.',
      errorTooShort: 'The recording was too short. Tap the mic, speak, then stop.',
      errorTooLong: 'The recording is too long. Please keep it under 1 minute.',
    },
    speech: {
      listen: 'Listen',
      stop: 'Stop',
      copy: 'Copy',
      copied: 'Answer copied',
      copyFailed: 'Could not copy. Long-press the text to copy it.',
      speakError: 'Could not read this aloud right now.',
      voiceUnavailable: 'This phone has no voice for this language. Read the answer instead, or add a voice in your phone settings.',
      listenHint: "Reads aloud using your phone's built-in voice",
    },
    sos: {
      buttonLabel: 'SOS: emergency numbers and share location',
      title: 'Emergency (SOS)',
      intro: 'Tap a number to call right away. These numbers are free.',
      callLabel: 'Call',
      shareLocation: 'Share my location',
      locating: 'Finding your location…',
      locationReady: 'Location found. Send it to someone you trust:',
      openMap: 'View on map',
      sendSms: 'Send by SMS',
      shareMessage: 'I need help. My location:',
      locationDenied: 'Location permission was denied. Allow location in your browser settings.',
      locationUnavailable: 'Could not get your location. Please try again in a moment.',
      locationUnsupported: 'Location is not available on this phone/browser.',
    },
    me: {
      title: "Your profile",
      openProfile: "Open profile and settings",
      statsTitle: "Your record",
      statEntries: "Entries",
      statDays: "Days logged",
      statStreak: "Day streak",
      settingsTitle: "Settings",
      textSize: "Text size",
      textNormal: "Normal",
      textLarge: "Large",
      textXLarge: "Largest",
      dailyGoal: "Daily target",
      dailyGoalHint: "Home shows how close you are each day",
      goalSave: "Set target",
      goalRemove: "Remove target",
      goalSaved: "Target saved",
      haptics: "Vibrate on save",
      dataTitle: "Your data",
      exportCsv: "Download records (CSV)",
      exportEmpty: "Nothing to download yet",
      exportDone: "File downloaded",
      clearChat: "Clear conversation",
      chatCleared: "Conversation cleared",
      redoSetup: "Run setup again",
      helplinesTitle: "Emergency numbers",
      privacyNote: "Your records are tied only to this phone's session. No login or Aadhaar needed.",
    },
    a11y: {
      skipToContent: 'Skip to main content',
      mainNav: 'Main navigation',
      loading: 'Loading…',
      largeText: 'Large text',
    },
    chat: {
      rateLimited: 'Please wait a moment and send again.',
      newReply: 'KaamPe replied',
      saveFailed: 'Could not save the money entry. Please try again.',
    },
    forms: {
      invalidAmount: 'Enter a valid amount (more than 0).',
      saveFailed: 'Could not save. Please try again.',
      amountPlaceholder: 'e.g. 850',
      sourcePlaceholder: 'e.g. Swiggy, Zomato, Cash',
    },
    docQa: {
      title: 'Ask about this document',
      hint: 'Answers come only from this document, with the line it comes from.',
      placeholder: 'e.g. How much is cut if I cancel an order?',
      ask: 'Ask',
      asking: 'Searching the document…',
      answer: 'Answer',
      evidence: 'The document says',
      page: 'Page {page}',
      notFound: 'Not found in the document',
    },
    grievance: {

      kaampe: 'KaamPe',
      you: 'You',
      answerLabel: 'Your answer',
      answerPlaceholder: 'e.g. ₹3200, 8 days',
      send: 'Send',
      dontKnow: "I don't know",
      reviewTitle: 'Check the details',
      amount: 'Amount (₹)',
      duration: 'For how long',
      days: 'days',
      weeks: 'weeks',
      months: 'months',
      notKnown: 'Not known',
      platform: 'Platform or employer (optional)',
      platformHint: "Leave blank if you don't want to name them.",
      createDraft: 'Create draft',
      creating: 'Writing the draft…',
      changeDetails: 'Change details',
      notSent: 'KaamPe never sends this. Copy it and send it yourself.',
      fallbackNote: 'The AI was not available, so this simple draft uses only the details you gave.',
      invalidAmount: 'Enter a valid amount (more than 0, up to 2 decimals).',
    },
    theme: {
      title: "Appearance",
      system: "Match phone",
      light: "Light",
      dark: "Dark",
      switchTo: "Change theme, now: {mode}",
    },
    access: {
      title: "Listening help",
      readPage: "Read this screen",
      stopReading: "Stop reading",
      autoRead: "Read replies aloud",
      autoReadHint: "Every new KaamPe reply is spoken automatically.",
      tapToHear: "Tap to hear",
      tapToHearHint: "Tap any text on screen and KaamPe reads it out.",
      speechRate: "Speaking speed",
      rateSlow: "Slow",
      rateNormal: "Normal",
      rateFast: "Fast",
      testVoice: "Test voice",
      testVoiceSample: "Hello! I am KaamPe. Straight talk about your earnings, rights and help.",
    },
    demo: {
      cardTitle: "Want a quick demo?",
      cardText: "Explore the app with three weeks of a delivery rider’s ledger.",
      tryDemo: "Open demo account",
      loginTitle: "Log in to the demo account",
      loginIntro: "This account comes pre-filled with sample earnings and expenses. Every login gets its own fresh copy.",
      username: "Username",
      password: "Password",
      login: "Log in",
      loggingIn: "Logging in…",
      credsLabel: "Demo login: {username} / {password}",
      fillCreds: "Fill demo details",
      failed: "Could not log in. Please try again.",
      welcome: "Demo account open. All data is sample data.",
      badge: "Demo account",
      logout: "Leave demo",
      loggedOut: "Demo closed. A new empty account has started.",
      adminLink: "Admin panel",
    },
    admin: {
      title: "KaamPe Admin",
      subtitle: "Usage at a glance (counts only, nothing personal)",
      loginTitle: "Admin login",
      login: "Log in",
      loggingIn: "Logging in…",
      logout: "Log out",
      refresh: "Refresh",
      updated: "Updated {time}",
      loadFailed: "Could not load stats. Please try again.",
      backToApp: "Back to app",
      totalSessions: "Total users (sessions)",
      active7d: "Active in last 7 days",
      demoSessions: "Demo sessions",
      moneyEntries: "Money entries",
      earningsTracked: "Earnings tracked",
      expensesTracked: "Expenses tracked",
      conversations: "Conversations",
      messages: "Messages",
      documents: "Documents explained",
      byWorker: "By type of work",
      byState: "By state",
      byLanguage: "By language",
      activity: "Last 14 days",
      newSessions: "New users",
      entriesLogged: "Entries",
      topics: "What people ask about",
      recent: "Recent sessions",
      colRef: "Ref",
      colWho: "Who",
      colEntries: "Entries",
      colLastActive: "Last active",
      demoTag: "demo",
      none: "Nothing yet",
      privacyNote: "No message text, notes or full session ids are shown here.",
    },
    insights: {
      tipTitle: "Know your rights",
      tipNext: "Next",
      tipAsk: "Ask about this",
      schemesTitle: "Schemes for you",
      schemesHint: "Picked for your type of work. Confirm details on the official site.",
      checkAll: "Check eligibility",
      officialSite: "Official site",
      weekTitle: "This week",
      weekEarned: "{amount} earned",
      bestDay: "Best day: {day}, {amount}",
      activeDays: "Worked {count}/7 days",
      weekEmpty: "No entries this week yet.",
      rightsTab: "Your rights",
      rightsTitle: "Work rights, in plain words",
      rightsIntro: "Each topic is short. Listen to it, or ask KaamPe about your own situation.",
      askAbout: "Ask KaamPe",
      rightsNote: "This is general information, not legal advice. For a firm answer, talk to the labour office or 15100 (free legal aid).",
      keyPoints: "Key points",
    },
    letter: {
      nameLabel: 'Your name (to sign the letter)',
      nameHint: 'Optional. Remembered only on this phone.',
      englishTitle: 'English copy (for the company or office)',
      englishHint: 'Built only from the facts you gave. Read it before sending.',
    },
    trust: {
      aiNote: 'AI can make mistakes. Check important details on the official site or helpline.',
      newTab: 'opens in a new tab',
    },
    moneyInsights: {
      title: 'AI money insights',
      intro: 'Short advice on your last 30 days of earnings and costs.',
      get: 'Get insights',
      getting: 'Looking…',
      refresh: 'Refresh',
      empty: 'Add some earnings or expenses first to get insights.',
      tipsTitle: 'Ways to keep more',
      warningTitle: 'Note',
    },
    work: {
      title: 'Work details',
      optional: 'optional',
      tripsLabel: 'Deliveries / trips',
      hoursLabel: 'Hours worked',
      invalid: 'Use 0 to 1000 trips and up to 24 hours.',
      perTrip: '{amount} per trip',
      perHour: '{amount} per hour',
      tripsShort: '{n} trips',
      hoursShort: '{n} hrs',
    },
    autoSave: {
      label: 'Save money from chat right away',
      hint: 'When off, KaamPe asks before saving. When on, it saves at once and offers Undo.',
      undone: 'Entry removed.',
    },
    stream: {
      stop: 'Stop',
      stopped: 'Answer stopped.',
    },
    safetyCoach: {
      tab: 'Safety',
      title: 'Safety coach',
      intro: 'Pick a situation or describe it in your own words. KaamPe gives a short checklist.',
      quickLabel: 'Quick picks',
      situationLabel: 'What is happening?',
      placeholder: 'E.g. a late-night delivery on an empty road',
      get: 'Get safety steps',
      getting: 'Getting steps…',
      firstStep: 'Do this first',
      helplinesTitle: 'Call if you need help',
      situations: {
        night: 'Working alone at night',
        rain: 'Heavy rain or flooding',
        heat: 'Extreme heat',
        harassment: 'Someone is harassing or threatening me',
        accident: 'Road accident',
        otp: 'Someone is asking for my OTP or PIN',
      },
    },
    auth: {
      heroTitle: "Work, money and rights. In one place.",
      heroText: "Delivery, driving, construction or domestic work: KaamPe keeps your earnings ledger, explains your rights and schemes, and helps you write complaints.",
      featMoney: "Log earnings and expenses by voice",
      featRights: "Your rights in plain words",
      featSchemes: "Check government schemes",
      featSafety: "Safety and SOS in one tap",
      demoButton: "Try the demo in one click",
      demoHint: "Comes with three weeks of sample data. No password needed.",
      orDivider: "or sign in",
      signInTab: "Sign in",
      signUpTab: "New account",
      username: "Username",
      usernameHint: "3–32 characters: a-z, 0-9, _ or .",
      password: "Password",
      passwordHint: "At least 8 characters",
      name: "Your name (optional)",
      signIn: "Sign in",
      signingIn: "Signing in…",
      signUp: "Create account",
      signingUp: "Creating account…",
      guest: "Continue without an account",
      guestHint: "Your data stays only in this phone’s session.",
      invalidUsername: "Username must be 3–32 characters: a-z, 0-9, _ or .",
      invalidPassword: "Password must be at least 8 characters.",
      failed: "Could not sign in. Please try again.",
      welcomeBack: "Welcome back!",
      welcomeNew: "Account created. Now tell us about your work.",
      logout: "Log out",
      loggedOut: "You have logged out.",
      signedInAs: "Signed in as {name}",
      guestLabel: "No account",
      adminOpening: "Opening the admin panel…",
    },
    tools: {
      title: "Tools",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      assistant: "Assistant",
      assistantDesc: "Ask anything",
      schemes: "Schemes",
      schemesDesc: "Which schemes fit you",
      rights: "Your rights",
      rightsDesc: "The law in plain words",
      safety: "Safety",
      safetyDesc: "Night, rain, fraud",
      documents: "Documents",
      documentsDesc: "Understand papers",
      complaint: "Complaint",
      complaintDesc: "Letters for pay disputes",
      preferences: "Preferences",
    },
  },
  pa: {
    appName: 'KaamPe',
    tagline: 'Kaam ki baat. Seedhi baat.',
    subTagline: 'ਤੁਹਾਡਾ ਕੰਮ, ਪੈਸੇ ਅਤੇ ਹੱਕਾਂ ਲਈ ਸਾਥੀ।',
    nav: {
      me: "ਤੁਸੀਂ",
      meDesc: "ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਸੈਟਿੰਗਾਂ",
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
      back: 'ਪਿੱਛੇ',
      step2Subtitle: 'ਸਹੀ ਜਾਣਕਾਰੀ ਲਈ ਆਪਣਾ ਕੰਮ ਚੁਣੋ',
      step3Subtitle: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਤੁਹਾਡੇ ਰਾਜ ਦੇ ਹਿਸਾਬ ਨਾਲ ਦਿਖਣਗੀਆਂ',
      stateLabel: 'ਰਾਜ (ਸੂਬਾ)',
      stepProgress: 'ਕਦਮ {n} / 3',
      workerTypes: {
        delivery: 'ਡਿਲੀਵਰੀ ਪਾਰਟਨਰ',
        driver: 'ਡਰਾਈਵਰ (ਕੈਬ / ਆਟੋ)',
        construction: 'ਉਸਾਰੀ ਮਜ਼ਦੂਰ (Construction)',
        domestic: 'ਘਰੇਲੂ ਕੰਮ (Domestic work)',
        daily_wage: 'ਦਿਹਾੜੀਦਾਰ ਮਜ਼ਦੂਰ (Daily wage)',
        street_vendor: 'ਰੇਹੜੀ-ਫੜ੍ਹੀ (Street vendor)',
        other: 'ਹੋਰ ਕੰਮ (Other)',
      },
    },
    home: {
      goalProgress: "{goal} ਦੇ ਟੀਚੇ ਵਿੱਚੋਂ {left} ਬਾਕੀ",
      goalReached: "ਅੱਜ ਦਾ ਟੀਚਾ ਪੂਰਾ ਹੋ ਗਿਆ",
      setGoal: "ਰੋਜ਼ਾਨਾ ਟੀਚਾ ਰੱਖੋ",
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
      savedEarningToast: "{amount} ਕਮਾਈ ਸੇਵ ਹੋਈ",
      savedExpenseToast: "{amount} ਖਰਚਾ ਸੇਵ ਹੋਇਆ",
      undoneToast: "ਐਂਟਰੀ ਹਟਾ ਦਿੱਤੀ",
      quickAmounts: "ਜਲਦੀ ਰਕਮ ਚੁਣੋ",
      quickSources: "ਪਲੇਟਫਾਰਮ ਚੁਣੋ",
      shareWeek: "ਹਫ਼ਤੇ ਦਾ ਹਿਸਾਬ ਭੇਜੋ",
      shareWeekText: "ਇਸ ਹਫ਼ਤੇ ਦਾ ਹਿਸਾਬ: ਕਮਾਈ {earned}, ਖਰਚਾ {spent}, ਬਚਤ {net}। (KaamPe)",
      shareCopied: "ਹਿਸਾਬ ਕਾਪੀ ਹੋ ਗਿਆ",
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
      amountPlaceholder: 'ਜਿਵੇਂ: 850',
      sourcePlaceholder: 'ਜਿਵੇਂ: Swiggy, Zomato, Cash',
      notePlaceholder: 'ਹੋਰ ਜਾਣਕਾਰੀ (ਵਿਕਲਪਿਕ)',
      loading: 'ਹਿਸਾਬ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
      errorLoad: 'ਹਿਸਾਬ ਲੋਡ ਨਹੀਂ ਹੋਇਆ। ਇੰਟਰਨੈੱਟ ਚੈੱਕ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      errorAmountInvalid: '₹0 ਤੋਂ ਵੱਧ ਸਹੀ ਰਕਮ ਲਿਖੋ (ਵੱਧ ਤੋਂ ਵੱਧ 2 ਦਸ਼ਮਲਵ)।',
      errorSaveFailed: 'ਐਂਟਰੀ ਸੇਵ ਨਹੀਂ ਹੋਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      errorDelete: 'ਐਂਟਰੀ ਹਟਾਈ ਨਹੀਂ ਜਾ ਸਕੀ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      deleteEntryLabel: '{type} {amount} ({date}) ਹਟਾਓ',
      deleteConfirmBtn: 'ਹਾਂ, ਹਟਾਓ',
      typeEarning: 'ਕਮਾਈ',
      typeExpense: 'ਖਰਚਾ',
      today: 'ਅੱਜ',
      chartTitle: '7 ਦਿਨਾਂ ਦੀ ਬਚਤ',
      chartCaption: 'ਪਿਛਲੇ 7 ਦਿਨਾਂ ਦੀ ਕਮਾਈ, ਖਰਚਾ ਅਤੇ ਬਚਤ',
      chartEmpty: 'ਇਸ ਹਫ਼ਤੇ ਅਜੇ ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।',
      colDay: 'ਦਿਨ',
      colEarned: 'ਕਮਾਈ',
      colSpent: 'ਖਰਚਾ',
      colNet: 'ਬਚਤ',
      platformTitle: 'ਪਲੇਟਫਾਰਮ ਅਨੁਸਾਰ ਕਮਾਈ (7 ਦਿਨ)',
      platformUnspecified: 'ਬਿਨਾਂ ਨਾਮ ਦਾ ਸਰੋਤ',
      platformDays: '{n} ਦਿਨ ਕੰਮ',
      platformEarnPerDay: '{amount}/ਦਿਨ ਕਮਾਈ',
      platformNetPerDay: 'ਲਗਭਗ {amount}/ਦਿਨ ਬਚਤ',
      platformShare: 'ਹਫ਼ਤੇ ਦੀ ਕਮਾਈ ਦਾ {pct}%',
      platformBest: 'ਸਭ ਤੋਂ ਵੱਧ ਬਚਤ',
      platformNote: 'ਬਚਤ/ਦਿਨ ਇੱਕ ਅੰਦਾਜ਼ਾ ਹੈ: ਹਰ ਦਿਨ ਦਾ ਖਰਚਾ ਉਸ ਦਿਨ ਦੀ ਕਮਾਈ ਦੇ ਹਿਸਾਬ ਨਾਲ ਪਲੇਟਫਾਰਮਾਂ ਵਿੱਚ ਵੰਡਿਆ ਗਿਆ ਹੈ।',
      platformEmpty: 'ਕਮਾਈ ਜੋੜਦੇ ਸਮੇਂ ਪਲੇਟਫਾਰਮ ਦਾ ਨਾਮ ਲਿਖੋ (ਜਿਵੇਂ Swiggy), ਇੱਥੇ ਤੁਲਨਾ ਦਿਖੇਗੀ।',
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
      docUploadDesc: 'ਰੇਟ ਕਾਰਡ, ਇਕਰਾਰਨਾਮਾ, ਚਲਾਨ (PDF, JPG, PNG, WebP - ਵੱਧ ਤੋਂ ਵੱਧ 10MB)',
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
      tabSchemes: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ',
      tabListLabel: 'ਮਦਦ ਦੇ ਵਿਕਲਪ',
      docFileHint: 'PDF, JPG, PNG, WebP (ਵੱਧ ਤੋਂ ਵੱਧ 10MB)',
      docTakePhoto: 'ਕੈਮਰੇ ਨਾਲ ਫੋਟੋ ਲਓ',
      docSelected: 'ਚੁਣੀ ਗਈ ਫਾਈਲ: {name}',
      docTooLarge: 'ਫਾਈਲ 10MB ਤੋਂ ਵੱਡੀ ਹੈ। ਛੋਟੀ ਫਾਈਲ ਚੁਣੋ।',
      docTypeError: 'ਸਿਰਫ਼ PDF, JPG, PNG ਜਾਂ WebP ਫਾਈਲ ਚੁਣੋ।',
      docUploadFailed: 'ਦਸਤਾਵੇਜ਼ ਪੜ੍ਹਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      docComplaintTitle: 'ਕੀ ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਕੋਈ ਸ਼ਿਕਾਇਤ ਹੈ?',
      docComplaintHint: 'ਇਸ ਦਸਤਾਵੇਜ਼ ਦੀ ਜਾਣਕਾਰੀ ਨਾਲ ਸ਼ਿਕਾਇਤ ਦਾ ਡਰਾਫਟ ਸ਼ੁਰੂ ਕਰੋ',
      docComplaintBtn: 'ਸ਼ਿਕਾਇਤ ਲਿਖੋ',
      docComplaintPrefill: 'ਮੈਂ ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਸ਼ਿਕਾਇਤ ਕਰਨੀ ਹੈ: {doc}{money}\nਮੇਰੀ ਸਮੱਸਿਆ: ',
      docComplaintMoney: '\nਪੈਸੇ ਦੀਆਂ ਗੱਲਾਂ: {items}',
      evidenceLabel: 'ਪਿਛਲੇ 7 ਦਿਨਾਂ ਦੀ ਕਮਾਈ ਸਬੂਤ ਵਜੋਂ ਜੋੜੋ',
      evidenceHint: 'KaamPe ਵਿੱਚ ਦਰਜ ਤੁਹਾਡਾ ਹਿਸਾਬ ਤੁਹਾਡੀ ਗੱਲ ਦੇ ਨਾਲ ਭੇਜਿਆ ਜਾਵੇਗਾ।',
      evidencePreviewTitle: 'ਇਹ ਜੋੜਿਆ ਜਾਵੇਗਾ:',
      evidenceTemplate: 'ਮੇਰੇ KaamPe ਰਿਕਾਰਡ ਅਨੁਸਾਰ ਪਿਛਲੇ 7 ਦਿਨ ({from} ਤੋਂ {to}): ਕੁੱਲ ਕਮਾਈ {earned}, ਖਰਚਾ {spent}, ਬਚਤ {net}; {days} ਦਿਨ ਕੰਮ ਦਰਜ ਹੈ।',
      evidencePlatforms: ' ਪਲੇਟਫਾਰਮ ਅਨੁਸਾਰ ਕਮਾਈ: {list}।',
      evidenceEmpty: 'ਪਿਛਲੇ 7 ਦਿਨਾਂ ਵਿੱਚ ਕੋਈ ਕਮਾਈ ਦਰਜ ਨਹੀਂ, ਇਸ ਲਈ ਕੁਝ ਨਹੀਂ ਜੋੜਿਆ ਜਾਵੇਗਾ।',
      evidenceLoading: 'ਹਿਸਾਬ ਕੱਢਿਆ ਜਾ ਰਿਹਾ ਹੈ…',
      evidenceError: 'ਕਮਾਈ ਦਾ ਹਿਸਾਬ ਲੋਡ ਨਹੀਂ ਹੋਇਆ। ਡਰਾਫਟ ਬਿਨਾਂ ਸਬੂਤ ਦੇ ਬਣੇਗਾ।',
      disputeNotGrievance: 'ਇਹ ਪੇਮੈਂਟ ਜਾਂ ਕੰਮ ਦੀ ਸ਼ਿਕਾਇਤ ਵਰਗਾ ਨਹੀਂ ਲੱਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਲਿਖੋ: ਕਿਹੜਾ ਕੰਮ, ਕਿੰਨੇ ਪੈਸੇ, ਅਤੇ ਕਿੰਨੇ ਦਿਨਾਂ ਤੋਂ ਬਕਾਇਆ ਹੈ।',
      disputeInvalid: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸਮੱਸਿਆ ਛੋਟੇ ਵਿੱਚ ਲਿਖੋ (1500 ਅੱਖਰਾਂ ਤੱਕ)।',
      disputeDefaultSummary: 'ਪੇਮੈਂਟ ਦੀ ਸਮੱਸਿਆ',
      rateLimited: 'ਬਹੁਤ ਜਲਦੀ ਬੇਨਤੀ ਹੋ ਗਈ। ਕੁਝ ਸਕਿੰਟ ਰੁਕ ਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      docQuestionLabel: 'ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਤੁਹਾਡਾ ਸਵਾਲ',
      docQuestionPlaceholder: 'ਜਿਵੇਂ: ਕੀ ਇਹ ਜੁਰਮਾਨਾ ਸਹੀ ਹੈ?',
      downloadTxt: 'ਡਾਊਨਲੋਡ (.txt)',
    },
    schemes: {
      title: 'ਕਿਹੜੀ ਸਰਕਾਰੀ ਸਕੀਮ ਮਿਲ ਸਕਦੀ ਹੈ?',
      intro: 'ਕੁਝ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦਿਓ। ਸਕੀਮਾਂ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਜਵਾਬਾਂ ਅਨੁਸਾਰ ਦਿਖਣਗੀਆਂ; ਆਖਰੀ ਫੈਸਲਾ ਸਰਕਾਰੀ ਦਫ਼ਤਰ ਜਾਂ ਪੋਰਟਲ ਕਰੇਗਾ।',
      aboutYouLegend: 'ਤੁਹਾਡੇ ਬਾਰੇ',
      ageLabel: 'ਉਮਰ (ਸਾਲ)',
      incomeLabel: 'ਮਹੀਨੇ ਦੀ ਕਮਾਈ (₹)',
      optionalHint: 'ਵਿਕਲਪਿਕ, ਪਰ ਇਸ ਨਾਲ ਸਹੀ ਸਕੀਮ ਮਿਲਦੀ ਹੈ',
      workerTypeLabel: 'ਕੰਮ',
      stateLabel: 'ਰਾਜ (ਸੂਬਾ)',
      epfoLegend: 'ਕੀ ਤੁਹਾਡਾ PF (EPFO) ਕੱਟਦਾ ਹੈ?',
      epfoHint: 'ਤਨਖਾਹ ਸਲਿੱਪ ਉੱਤੇ "PF" ਜਾਂ "EPF" ਲਿਖਿਆ ਹੁੰਦਾ ਹੈ',
      esicLegend: 'ਕੀ ਤੁਹਾਡੇ ਕੋਲ ESIC (ESI ਕਾਰਡ) ਹੈ?',
      esicHint: 'ਕੰਪਨੀ ਰਾਹੀਂ ਮਿਲਿਆ ESI ਹਸਪਤਾਲ ਵਾਲਾ ਕਾਰਡ',
      taxLegend: 'ਕੀ ਤੁਸੀਂ ਇਨਕਮ ਟੈਕਸ ਭਰਦੇ ਹੋ?',
      yes: 'ਹਾਂ',
      no: 'ਨਹੀਂ',
      unknown: 'ਪਤਾ ਨਹੀਂ',
      submit: 'ਮੇਰੀਆਂ ਸਕੀਮਾਂ ਵੇਖੋ',
      checking: 'ਚੈੱਕ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ…',
      resultsTitle: '{n} ਸਕੀਮਾਂ ਤੁਹਾਡੇ ਲਈ ਕੰਮ ਦੀਆਂ ਹੋ ਸਕਦੀਆਂ ਹਨ',
      resultsRegionLabel: 'ਸਕੀਮਾਂ ਦੇ ਨਤੀਜੇ',
      noMatches: 'ਤੁਹਾਡੇ ਜਵਾਬਾਂ ਅਨੁਸਾਰ ਅਜੇ ਕੋਈ ਸਕੀਮ ਮੇਲ ਨਹੀਂ ਖਾਂਦੀ। ਨੇੜਲੇ CSC ਜਾਂ ਲੇਬਰ ਦਫ਼ਤਰ ਤੋਂ ਵੀ ਪੁੱਛ ਸਕਦੇ ਹੋ।',
      benefitLabel: 'ਫਾਇਦਾ',
      whyQualify: 'ਤੁਸੀਂ ਯੋਗ ਕਿਉਂ ਹੋ ਸਕਦੇ ਹੋ',
      pleaseCheck: 'ਇਹ ਜ਼ਰੂਰ ਚੈੱਕ ਕਰੋ',
      officialLink: 'ਅਧਿਕਾਰਤ ਵੈੱਬਸਾਈਟ',
      opensNewTab: '(ਨਵੀਂ ਟੈਬ ਵਿੱਚ ਖੁੱਲ੍ਹੇਗੀ)',
      askAbout: 'KaamPe ਤੋਂ ਪੁੱਛੋ',
      askPrompt: '"{scheme}" ਸਕੀਮ ਲਈ ਅਰਜ਼ੀ ਕਿਵੇਂ ਦੇਵਾਂ ਅਤੇ ਕਿਹੜੇ ਦਸਤਾਵੇਜ਼ ਚਾਹੀਦੇ ਹਨ?',
      disclaimerTitle: 'ਧਿਆਨ ਦਿਓ',
      errorAge: 'ਉਮਰ 14 ਤੋਂ 100 ਸਾਲ ਦੇ ਵਿਚਕਾਰ ਲਿਖੋ।',
      errorIncome: 'ਕਮਾਈ 0 ਜਾਂ ਉਸ ਤੋਂ ਵੱਧ ਲਿਖੋ।',
      errorInvalid: 'ਕੁਝ ਜਵਾਬ ਸਹੀ ਨਹੀਂ ਲੱਗੇ। ਚੈੱਕ ਕਰਕੇ ਦੁਬਾਰਾ ਭੇਜੋ।',
      errorRateLimit: 'ਬਹੁਤ ਜਲਦੀ ਦੁਬਾਰਾ ਪੁੱਛਿਆ। {seconds} ਸਕਿੰਟ ਬਾਅਦ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      errorNetwork: 'ਇੰਟਰਨੈੱਟ ਕਨੈਕਸ਼ਨ ਚੈੱਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      placeholder: 'ਫਾਰਮ ਭਰਨ ਤੋਂ ਬਾਅਦ ਤੁਹਾਡੇ ਲਈ ਸਕੀਮਾਂ ਇੱਥੇ ਦਿਖਣਗੀਆਂ।',
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
      notSavedYet: 'ਅਜੇ ਸੇਵ ਨਹੀਂ',
    },
    profileEditor: {
      edit: 'ਬਦਲੋ',
      work: 'ਤੁਹਾਡਾ ਕੰਮ',
      state: 'ਰਾਜ',
      save: 'ਪ੍ਰੋਫਾਈਲ ਸੇਵ ਕਰੋ',
      cancel: 'ਰੱਦ ਕਰੋ',
      saved: 'ਪ੍ਰੋਫਾਈਲ ਅੱਪਡੇਟ ਹੋ ਗਈ',
      workerShort: {
        delivery: 'ਡਿਲੀਵਰੀ',
        driver: 'ਡਰਾਈਵਰ',
        construction: 'ਉਸਾਰੀ',
        domestic: 'ਘਰੇਲੂ ਕੰਮ',
        daily_wage: 'ਦਿਹਾੜੀ',
        street_vendor: 'ਰੇਹੜੀ-ਫੜ੍ਹੀ',
        other: 'ਹੋਰ',
      },
    },
    common: {
      undo: "ਵਾਪਸ ਲਓ",
      moreApps: "ਹੋਰ ਐਪਸ",
      offline: "ਇੰਟਰਨੈੱਟ ਨਹੀਂ ਹੈ। ਜੁੜਦੇ ਹੀ KaamPe ਫਿਰ ਚੱਲੇਗਾ।",
      error: 'ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      retry: 'ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
      close: 'ਬੰਦ ਕਰੋ',
      language: 'ਭਾਸ਼ਾ',
      profile: 'ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ',
    },
    voice: {
      start: 'ਬੋਲ ਕੇ ਲਿਖੋ (ਮਾਈਕ)',
      stop: 'ਮਾਈਕ ਬੰਦ ਕਰੋ',
      listening: 'ਸੁਣ ਰਹੇ ਹਾਂ… ਬੋਲੋ',
      stopped: 'ਮਾਈਕ ਬੰਦ ਹੋ ਗਿਆ',
      errorPermission: 'ਮਾਈਕ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ। ਬ੍ਰਾਊਜ਼ਰ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਮਾਈਕ ਚਾਲੂ ਕਰੋ।',
      errorNoSpeech: 'ਕੁਝ ਸੁਣਾਈ ਨਹੀਂ ਦਿੱਤਾ। ਦੁਬਾਰਾ ਬੋਲੋ।',
      errorNoMic: 'ਮਾਈਕ ਨਹੀਂ ਮਿਲਿਆ। ਮਾਈਕ ਚੈੱਕ ਕਰੋ।',
      errorNetwork: 'ਇੰਟਰਨੈੱਟ ਨਹੀਂ ਹੈ, ਇਸ ਲਈ ਬੋਲ ਕੇ ਲਿਖਣਾ ਹੁਣ ਨਹੀਂ ਚੱਲੇਗਾ।',
      errorGeneric: 'ਬੋਲ ਕੇ ਲਿਖਣਾ ਨਹੀਂ ਚੱਲਿਆ। ਟਾਈਪ ਕਰਕੇ ਲਿਖੋ।',
      transcribing: 'ਆਵਾਜ਼ ਨੂੰ ਟੈਕਸਟ ਵਿੱਚ ਬਦਲ ਰਹੇ ਹਾਂ…',
      recordingTime: 'ਰਿਕਾਰਡਿੰਗ… {seconds} / {max} ਸਕਿੰਟ',
      reviewTranscript: 'ਤੁਹਾਡੀ ਆਵਾਜ਼ ਟੈਕਸਟ ਵਿੱਚ ਲਿਖ ਦਿੱਤੀ ਗਈ ਹੈ। ਜਾਂਚ ਕੇ ਬਦਲੋ, ਫਿਰ "ਪੁੱਛੋ" ਦਬਾਓ।',
      errorUnsupported: 'ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਆਵਾਜ਼ ਰਿਕਾਰਡ ਨਹੀਂ ਹੋ ਸਕਦੀ। ਕਿਰਪਾ ਕਰਕੇ ਟਾਈਪ ਕਰੋ।',
      errorTooShort: 'ਰਿਕਾਰਡਿੰਗ ਬਹੁਤ ਛੋਟੀ ਸੀ। ਮਾਈਕ ਦਬਾ ਕੇ ਬੋਲੋ, ਫਿਰ ਰੋਕੋ।',
      errorTooLong: 'ਰਿਕਾਰਡਿੰਗ ਬਹੁਤ ਲੰਮੀ ਹੈ। 1 ਮਿੰਟ ਤੋਂ ਛੋਟਾ ਸੁਨੇਹਾ ਬੋਲੋ।',
    },
    speech: {
      listen: 'ਸੁਣੋ',
      stop: 'ਰੋਕੋ',
      copy: 'ਕਾਪੀ',
      copied: 'ਜਵਾਬ ਕਾਪੀ ਹੋ ਗਿਆ',
      copyFailed: 'ਕਾਪੀ ਨਹੀਂ ਹੋਇਆ। ਟੈਕਸਟ ਨੂੰ ਦਬਾ ਕੇ ਕਾਪੀ ਕਰੋ।',
      speakError: 'ਹੁਣ ਆਵਾਜ਼ ਵਿੱਚ ਸੁਣਾਇਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।',
      voiceUnavailable: 'ਇਸ ਫ਼ੋਨ ਵਿੱਚ ਇਸ ਭਾਸ਼ਾ ਦੀ ਆਵਾਜ਼ ਨਹੀਂ ਹੈ। ਜਵਾਬ ਪੜ੍ਹ ਲਓ, ਜਾਂ ਫ਼ੋਨ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਆਵਾਜ਼ ਜੋੜੋ।',
      listenHint: 'ਫ਼ੋਨ ਦੀ ਆਪਣੀ ਆਵਾਜ਼ ਨਾਲ ਪੜ੍ਹ ਕੇ ਸੁਣਾਉਂਦਾ ਹੈ',
    },
    sos: {
      buttonLabel: 'SOS: ਐਮਰਜੈਂਸੀ ਨੰਬਰ ਅਤੇ ਲੋਕੇਸ਼ਨ ਭੇਜੋ',
      title: 'ਐਮਰਜੈਂਸੀ (SOS)',
      intro: 'ਤੁਰੰਤ ਕਾਲ ਕਰਨ ਲਈ ਨੰਬਰ ਦਬਾਓ। ਇਹ ਨੰਬਰ ਮੁਫ਼ਤ ਹਨ।',
      callLabel: 'ਕਾਲ ਕਰੋ',
      shareLocation: 'ਆਪਣੀ ਲੋਕੇਸ਼ਨ ਭੇਜੋ',
      locating: 'ਲੋਕੇਸ਼ਨ ਲੱਭ ਰਹੇ ਹਾਂ…',
      locationReady: 'ਲੋਕੇਸ਼ਨ ਮਿਲ ਗਈ। ਕਿਸੇ ਭਰੋਸੇਯੋਗ ਨੂੰ ਭੇਜੋ:',
      openMap: 'ਨਕਸ਼ੇ ਤੇ ਦੇਖੋ',
      sendSms: 'SMS ਰਾਹੀਂ ਭੇਜੋ',
      shareMessage: 'ਮੈਨੂੰ ਮਦਦ ਚਾਹੀਦੀ ਹੈ। ਮੇਰੀ ਲੋਕੇਸ਼ਨ:',
      locationDenied: 'ਲੋਕੇਸ਼ਨ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ। ਬ੍ਰਾਊਜ਼ਰ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਲੋਕੇਸ਼ਨ ਚਾਲੂ ਕਰੋ।',
      locationUnavailable: 'ਲੋਕੇਸ਼ਨ ਨਹੀਂ ਮਿਲੀ। ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      locationUnsupported: 'ਇਸ ਫ਼ੋਨ/ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਲੋਕੇਸ਼ਨ ਨਹੀਂ ਚੱਲਦੀ।',
    },
    me: {
      title: "ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ",
      openProfile: "ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਸੈਟਿੰਗਾਂ ਖੋਲ੍ਹੋ",
      statsTitle: "ਤੁਹਾਡਾ ਰਿਕਾਰਡ",
      statEntries: "ਐਂਟਰੀਆਂ",
      statDays: "ਦਿਨ ਲਿਖੇ",
      statStreak: "ਲਗਾਤਾਰ ਦਿਨ",
      settingsTitle: "ਸੈਟਿੰਗਾਂ",
      textSize: "ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ",
      textNormal: "ਆਮ",
      textLarge: "ਵੱਡਾ",
      textXLarge: "ਸਭ ਤੋਂ ਵੱਡਾ",
      dailyGoal: "ਰੋਜ਼ਾਨਾ ਟੀਚਾ",
      dailyGoalHint: "ਹੋਮ ਤੇ ਦਿਖੇਗਾ ਟੀਚੇ ਤੱਕ ਕਿੰਨਾ ਬਾਕੀ ਹੈ",
      goalSave: "ਟੀਚਾ ਰੱਖੋ",
      goalRemove: "ਟੀਚਾ ਹਟਾਓ",
      goalSaved: "ਟੀਚਾ ਸੇਵ ਹੋ ਗਿਆ",
      haptics: "ਸੇਵ ਤੇ ਹਲਕੀ ਵਾਈਬ੍ਰੇਸ਼ਨ",
      dataTitle: "ਤੁਹਾਡਾ ਡਾਟਾ",
      exportCsv: "ਹਿਸਾਬ ਡਾਊਨਲੋਡ ਕਰੋ (CSV)",
      exportEmpty: "ਅਜੇ ਡਾਊਨਲੋਡ ਕਰਨ ਲਈ ਕੁਝ ਨਹੀਂ",
      exportDone: "ਫਾਈਲ ਡਾਊਨਲੋਡ ਹੋ ਗਈ",
      clearChat: "ਗੱਲਬਾਤ ਸਾਫ਼ ਕਰੋ",
      chatCleared: "ਗੱਲਬਾਤ ਸਾਫ਼ ਹੋ ਗਈ",
      redoSetup: "ਸੈੱਟਅੱਪ ਦੁਬਾਰਾ ਕਰੋ",
      helplinesTitle: "ਜ਼ਰੂਰੀ ਨੰਬਰ",
      privacyNote: "ਤੁਹਾਡਾ ਹਿਸਾਬ ਸਿਰਫ਼ ਇਸ ਫ਼ੋਨ ਦੇ ਸੈਸ਼ਨ ਨਾਲ ਜੁੜਿਆ ਹੈ। ਕੋਈ ਲੌਗਇਨ ਜਾਂ ਆਧਾਰ ਨਹੀਂ ਚਾਹੀਦਾ।",
    },
    a11y: {
      skipToContent: 'ਸਿੱਧਾ ਮੁੱਖ ਸਮੱਗਰੀ ਤੇ ਜਾਓ',
      mainNav: 'ਮੁੱਖ ਨੈਵੀਗੇਸ਼ਨ',
      loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
      largeText: 'ਵੱਡੇ ਅੱਖਰ',
    },
    chat: {
      rateLimited: 'ਥੋੜ੍ਹਾ ਰੁਕ ਕੇ ਦੁਬਾਰਾ ਭੇਜੋ।',
      newReply: 'KaamPe ਦਾ ਜਵਾਬ ਆ ਗਿਆ',
      saveFailed: 'ਪੈਸਾ ਸੇਵ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    },
    forms: {
      invalidAmount: 'ਸਹੀ ਰਕਮ ਲਿਖੋ (0 ਤੋਂ ਵੱਧ)।',
      saveFailed: 'ਸੇਵ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      amountPlaceholder: 'ਜਿਵੇਂ 850',
      sourcePlaceholder: 'ਜਿਵੇਂ Swiggy, Zomato, Cash',
    },
    docQa: {
      title: 'ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਪੁੱਛੋ',
      hint: 'ਜਵਾਬ ਸਿਰਫ਼ ਇਸੇ ਦਸਤਾਵੇਜ਼ ਤੋਂ ਦਿੱਤਾ ਜਾਵੇਗਾ, ਨਾਲ ਦਸਤਾਵੇਜ਼ ਦੀ ਲਾਈਨ ਵੀ।',
      placeholder: 'ਜਿਵੇਂ: ਆਰਡਰ ਰੱਦ ਕਰਨ \'ਤੇ ਕਿੰਨਾ ਕੱਟੇਗਾ?',
      ask: 'ਪੁੱਛੋ',
      asking: 'ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਲੱਭ ਰਹੇ ਹਾਂ…',
      answer: 'ਜਵਾਬ',
      evidence: 'ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਲਿਖਿਆ ਹੈ',
      page: 'ਪੰਨਾ {page}',
      notFound: 'ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਨਹੀਂ ਮਿਲਿਆ',
    },
    grievance: {

      kaampe: 'KaamPe',
      you: 'ਤੁਸੀਂ',
      answerLabel: 'ਤੁਹਾਡਾ ਜਵਾਬ',
      answerPlaceholder: 'ਜਿਵੇਂ: ₹3200, 8 ਦਿਨ',
      send: 'ਭੇਜੋ',
      dontKnow: 'ਪਤਾ ਨਹੀਂ',
      reviewTitle: 'ਜਾਣਕਾਰੀ ਜਾਂਚ ਲਓ',
      amount: 'ਰਕਮ (₹)',
      duration: 'ਕਿੰਨੇ ਸਮੇਂ ਤੋਂ',
      days: 'ਦਿਨ',
      weeks: 'ਹਫ਼ਤੇ',
      months: 'ਮਹੀਨੇ',
      notKnown: 'ਪਤਾ ਨਹੀਂ',
      platform: 'ਪਲੇਟਫਾਰਮ ਜਾਂ ਮਾਲਕ ਦਾ ਨਾਂ (ਲਾਜ਼ਮੀ ਨਹੀਂ)',
      platformHint: 'ਨਾਂ ਨਹੀਂ ਲਿਖਣਾ ਤਾਂ ਖਾਲੀ ਛੱਡ ਦਿਓ।',
      createDraft: 'ਡਰਾਫਟ ਬਣਾਓ',
      creating: 'ਡਰਾਫਟ ਲਿਖ ਰਹੇ ਹਾਂ…',
      changeDetails: 'ਜਾਣਕਾਰੀ ਬਦਲੋ',
      notSent: 'KaamPe ਇਹ ਸੁਨੇਹਾ ਆਪ ਨਹੀਂ ਭੇਜਦਾ। ਕਾਪੀ ਕਰਕੇ ਤੁਸੀਂ ਆਪ ਭੇਜੋ।',
      fallbackNote: 'AI ਹੁਣੇ ਉਪਲਬਧ ਨਹੀਂ ਸੀ, ਇਸ ਲਈ ਇਹ ਸਿੱਧਾ ਡਰਾਫਟ ਸਿਰਫ਼ ਤੁਹਾਡੀ ਦਿੱਤੀ ਜਾਣਕਾਰੀ ਤੋਂ ਬਣਿਆ ਹੈ।',
      invalidAmount: 'ਸਹੀ ਰਕਮ ਲਿਖੋ (0 ਤੋਂ ਵੱਧ, 2 ਦਸ਼ਮਲਵ ਤੱਕ)।',
    },
    theme: {
      title: "ਰੰਗ (ਥੀਮ)",
      system: "ਫ਼ੋਨ ਵਾਂਗ",
      light: "ਦਿਨ (ਲਾਈਟ)",
      dark: "ਰਾਤ (ਡਾਰਕ)",
      switchTo: "ਥੀਮ ਬਦਲੋ, ਹੁਣ: {mode}",
    },
    access: {
      title: "ਸੁਣਨ ਵਿੱਚ ਮਦਦ",
      readPage: "ਇਹ ਸਕ੍ਰੀਨ ਸੁਣੋ",
      stopReading: "ਪੜ੍ਹਨਾ ਰੋਕੋ",
      autoRead: "ਜਵਾਬ ਆਪੇ ਸੁਣਾਓ",
      autoReadHint: "KaamPe ਦਾ ਹਰ ਨਵਾਂ ਜਵਾਬ ਆਪੇ ਬੋਲ ਕੇ ਸੁਣਾਇਆ ਜਾਵੇਗਾ।",
      tapToHear: "ਛੂਹ ਕੇ ਸੁਣੋ",
      tapToHearHint: "ਸਕ੍ਰੀਨ 'ਤੇ ਕੋਈ ਵੀ ਲਿਖਤ ਛੂਹੋ, KaamPe ਉਸਨੂੰ ਪੜ੍ਹ ਕੇ ਸੁਣਾਏਗਾ।",
      speechRate: "ਬੋਲਣ ਦੀ ਰਫ਼ਤਾਰ",
      rateSlow: "ਹੌਲੀ",
      rateNormal: "ਆਮ",
      rateFast: "ਤੇਜ਼",
      testVoice: "ਆਵਾਜ਼ ਜਾਂਚੋ",
      testVoiceSample: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ KaamPe ਹਾਂ। ਤੁਹਾਡੀ ਕਮਾਈ, ਹੱਕ ਅਤੇ ਮਦਦ ਦੀ ਗੱਲ ਸਿੱਧੀ ਭਾਸ਼ਾ ਵਿੱਚ।",
    },
    demo: {
      cardTitle: "ਡੈਮੋ ਵੇਖਣਾ ਹੈ?",
      cardText: "ਇੱਕ ਡਿਲਿਵਰੀ ਰਾਈਡਰ ਦੇ 3 ਹਫ਼ਤਿਆਂ ਦੇ ਹਿਸਾਬ ਨਾਲ ਐਪ ਚਲਾ ਕੇ ਵੇਖੋ।",
      tryDemo: "ਡੈਮੋ ਖਾਤਾ ਖੋਲ੍ਹੋ",
      loginTitle: "ਡੈਮੋ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ",
      loginIntro: "ਇਸ ਖਾਤੇ ਵਿੱਚ ਪਹਿਲਾਂ ਤੋਂ ਨਮੂਨਾ ਕਮਾਈ ਅਤੇ ਖਰਚੇ ਭਰੇ ਹਨ। ਹਰ ਲੌਗਇਨ ਨੂੰ ਨਵੀਂ, ਵੱਖਰੀ ਕਾਪੀ ਮਿਲਦੀ ਹੈ।",
      username: "ਯੂਜ਼ਰਨੇਮ",
      password: "ਪਾਸਵਰਡ",
      login: "ਲੌਗਇਨ ਕਰੋ",
      loggingIn: "ਲੌਗਇਨ ਹੋ ਰਿਹਾ ਹੈ…",
      credsLabel: "ਡੈਮੋ ਲੌਗਇਨ: {username} / {password}",
      fillCreds: "ਡੈਮੋ ਵੇਰਵੇ ਭਰੋ",
      failed: "ਲੌਗਇਨ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      welcome: "ਡੈਮੋ ਖਾਤਾ ਖੁੱਲ੍ਹ ਗਿਆ। ਸਾਰਾ ਡਾਟਾ ਨਮੂਨਾ ਹੈ।",
      badge: "ਡੈਮੋ ਖਾਤਾ",
      logout: "ਡੈਮੋ ਤੋਂ ਬਾਹਰ ਨਿਕਲੋ",
      loggedOut: "ਡੈਮੋ ਬੰਦ। ਨਵਾਂ ਖਾਲੀ ਖਾਤਾ ਸ਼ੁਰੂ ਹੋਇਆ।",
      adminLink: "ਐਡਮਿਨ ਪੈਨਲ",
    },
    admin: {
      title: "KaamPe ਐਡਮਿਨ",
      subtitle: "ਵਰਤੋਂ ਦੇ ਅੰਕੜੇ (ਸਿਰਫ਼ ਗਿਣਤੀ, ਕੋਈ ਨਿੱਜੀ ਗੱਲ ਨਹੀਂ)",
      loginTitle: "ਐਡਮਿਨ ਲੌਗਇਨ",
      login: "ਲੌਗਇਨ ਕਰੋ",
      loggingIn: "ਲੌਗਇਨ ਹੋ ਰਿਹਾ ਹੈ…",
      logout: "ਲੌਗਆਊਟ",
      refresh: "ਤਾਜ਼ਾ ਕਰੋ",
      updated: "{time} 'ਤੇ ਅੱਪਡੇਟ",
      loadFailed: "ਅੰਕੜੇ ਲੋਡ ਨਹੀਂ ਹੋਏ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      backToApp: "ਐਪ 'ਤੇ ਵਾਪਸ",
      totalSessions: "ਕੁੱਲ ਯੂਜ਼ਰ (ਸੈਸ਼ਨ)",
      active7d: "ਪਿਛਲੇ 7 ਦਿਨ ਸਰਗਰਮ",
      demoSessions: "ਡੈਮੋ ਸੈਸ਼ਨ",
      moneyEntries: "ਪੈਸਿਆਂ ਦੀਆਂ ਐਂਟਰੀਆਂ",
      earningsTracked: "ਕੁੱਲ ਕਮਾਈ ਦਰਜ",
      expensesTracked: "ਕੁੱਲ ਖਰਚਾ ਦਰਜ",
      conversations: "ਗੱਲਬਾਤ",
      messages: "ਸੁਨੇਹੇ",
      documents: "ਸਮਝਾਏ ਦਸਤਾਵੇਜ਼",
      byWorker: "ਕੰਮ ਦੇ ਹਿਸਾਬ ਨਾਲ",
      byState: "ਰਾਜ ਦੇ ਹਿਸਾਬ ਨਾਲ",
      byLanguage: "ਭਾਸ਼ਾ ਦੇ ਹਿਸਾਬ ਨਾਲ",
      activity: "ਪਿਛਲੇ 14 ਦਿਨ",
      newSessions: "ਨਵੇਂ ਯੂਜ਼ਰ",
      entriesLogged: "ਐਂਟਰੀਆਂ",
      topics: "ਲੋਕ ਕੀ ਪੁੱਛ ਰਹੇ ਹਨ",
      recent: "ਹਾਲੀਆ ਸੈਸ਼ਨ",
      colRef: "ਹਵਾਲਾ",
      colWho: "ਕੌਣ",
      colEntries: "ਐਂਟਰੀਆਂ",
      colLastActive: "ਆਖਰੀ ਵਾਰ",
      demoTag: "ਡੈਮੋ",
      none: "ਹਾਲੇ ਕੁਝ ਨਹੀਂ",
      privacyNote: "ਇੱਥੇ ਕਿਸੇ ਦਾ ਸੁਨੇਹਾ, ਨੋਟ ਜਾਂ ਪੂਰਾ ਸੈਸ਼ਨ ID ਨਹੀਂ ਵਿਖਾਇਆ ਜਾਂਦਾ।",
    },
    insights: {
      tipTitle: "ਆਪਣਾ ਹੱਕ ਜਾਣੋ",
      tipNext: "ਅਗਲਾ",
      tipAsk: "ਇਸ ਬਾਰੇ ਪੁੱਛੋ",
      schemesTitle: "ਤੁਹਾਡੇ ਲਈ ਸਕੀਮਾਂ",
      schemesHint: "ਤੁਹਾਡੇ ਕੰਮ ਦੇ ਹਿਸਾਬ ਨਾਲ। ਪੱਕੀ ਜਾਣਕਾਰੀ ਸਰਕਾਰੀ ਸਾਈਟ 'ਤੇ ਵੇਖੋ।",
      checkAll: "ਯੋਗਤਾ ਜਾਂਚੋ",
      officialSite: "ਸਰਕਾਰੀ ਸਾਈਟ",
      weekTitle: "ਇਸ ਹਫ਼ਤੇ",
      weekEarned: "{amount} ਕਮਾਏ",
      bestDay: "ਸਭ ਤੋਂ ਵਧੀਆ ਦਿਨ: {day}, {amount}",
      activeDays: "{count}/7 ਦਿਨ ਕੰਮ ਕੀਤਾ",
      weekEmpty: "ਇਸ ਹਫ਼ਤੇ ਹਾਲੇ ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ।",
      rightsTab: "ਤੁਹਾਡੇ ਹੱਕ",
      rightsTitle: "ਕੰਮ ਦੇ ਹੱਕ, ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ",
      rightsIntro: "ਹਰ ਵਿਸ਼ਾ ਛੋਟਾ ਹੈ। ਸੁਣੋ, ਜਾਂ KaamPe ਨੂੰ ਆਪਣੀ ਹਾਲਤ ਬਾਰੇ ਪੁੱਛੋ।",
      askAbout: "KaamPe ਨੂੰ ਪੁੱਛੋ",
      rightsNote: "ਇਹ ਆਮ ਜਾਣਕਾਰੀ ਹੈ, ਕਾਨੂੰਨੀ ਸਲਾਹ ਨਹੀਂ। ਪੱਕੀ ਗੱਲ ਲਈ ਲੇਬਰ ਦਫ਼ਤਰ ਜਾਂ 15100 (ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਮਦਦ) ਨਾਲ ਗੱਲ ਕਰੋ।",
      keyPoints: "ਜ਼ਰੂਰੀ ਗੱਲਾਂ",
    },
    letter: {
      nameLabel: 'ਤੁਹਾਡਾ ਨਾਮ (ਚਿੱਠੀ ਦੇ ਹੇਠਾਂ)',
      nameHint: 'ਜ਼ਰੂਰੀ ਨਹੀਂ। ਸਿਰਫ਼ ਇਸੇ ਫ਼ੋਨ \'ਤੇ ਯਾਦ ਰਹਿੰਦਾ ਹੈ।',
      englishTitle: 'ਅੰਗਰੇਜ਼ੀ ਕਾਪੀ (ਕੰਪਨੀ ਜਾਂ ਦਫ਼ਤਰ ਲਈ)',
      englishHint: 'ਸਿਰਫ਼ ਤੁਹਾਡੀਆਂ ਦੱਸੀਆਂ ਗੱਲਾਂ ਤੋਂ ਬਣੀ ਹੈ। ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਪੜ੍ਹ ਲਓ।',
    },
    trust: {
      aiNote: 'AI ਗਲਤੀ ਕਰ ਸਕਦਾ ਹੈ। ਜ਼ਰੂਰੀ ਗੱਲ ਸਰਕਾਰੀ ਸਾਈਟ ਜਾਂ ਹੈਲਪਲਾਈਨ ਤੋਂ ਪੱਕੀ ਕਰੋ।',
      newTab: 'ਨਵੀਂ ਟੈਬ ਵਿੱਚ ਖੁੱਲ੍ਹੇਗਾ',
    },
    moneyInsights: {
      title: 'AI ਨਾਲ ਹਿਸਾਬ ਸਮਝੋ',
      intro: 'ਪਿਛਲੇ 30 ਦਿਨਾਂ ਦੀ ਕਮਾਈ ਅਤੇ ਖਰਚ ਬਾਰੇ ਛੋਟੀ ਸਲਾਹ।',
      get: 'ਸਲਾਹ ਲਓ',
      getting: 'ਦੇਖ ਰਹੇ ਹਾਂ…',
      refresh: 'ਦੁਬਾਰਾ ਦੇਖੋ',
      empty: 'ਸਲਾਹ ਲਈ ਪਹਿਲਾਂ ਕੁਝ ਕਮਾਈ ਜਾਂ ਖਰਚ ਜੋੜੋ।',
      tipsTitle: 'ਬਚਤ ਵਧਾਉਣ ਦੇ ਤਰੀਕੇ',
      warningTitle: 'ਧਿਆਨ ਦਿਓ',
    },
    work: {
      title: 'ਕੰਮ ਦੀ ਜਾਣਕਾਰੀ',
      optional: 'ਜ਼ਰੂਰੀ ਨਹੀਂ',
      tripsLabel: 'ਕਿੰਨੀਆਂ ਡਿਲੀਵਰੀ / ਟ੍ਰਿਪ',
      hoursLabel: 'ਕਿੰਨੇ ਘੰਟੇ',
      invalid: 'ਟ੍ਰਿਪ 0 ਤੋਂ 1000 ਤੱਕ ਅਤੇ ਘੰਟੇ 24 ਤੱਕ ਲਿਖੋ।',
      perTrip: '{amount} ਹਰ ਟ੍ਰਿਪ',
      perHour: '{amount} ਹਰ ਘੰਟਾ',
      tripsShort: '{n} ਟ੍ਰਿਪ',
      hoursShort: '{n} ਘੰਟੇ',
    },
    autoSave: {
      label: 'ਚੈਟ ਤੋਂ ਪੈਸਾ ਸਿੱਧਾ ਸੇਵ ਕਰੋ',
      hint: 'ਬੰਦ ਹੋਵੇ ਤਾਂ ਹਰ ਵਾਰ ਪਹਿਲਾਂ ਪੁੱਛਿਆ ਜਾਂਦਾ ਹੈ। ਚਾਲੂ ਹੋਵੇ ਤਾਂ ਤੁਰੰਤ ਸੇਵ ਹੁੰਦਾ ਹੈ ਅਤੇ ਵਾਪਸ ਲੈਣ ਦਾ ਵਿਕਲਪ ਮਿਲਦਾ ਹੈ।',
      undone: 'ਐਂਟਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ।',
    },
    stream: {
      stop: 'ਰੋਕੋ',
      stopped: 'ਜਵਾਬ ਰੋਕ ਦਿੱਤਾ ਗਿਆ।',
    },
    safetyCoach: {
      tab: 'ਸੁਰੱਖਿਆ',
      title: 'ਸੁਰੱਖਿਆ ਸਲਾਹ',
      intro: 'ਹਾਲਾਤ ਚੁਣੋ ਜਾਂ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਦੱਸੋ। KaamPe ਛੋਟੀ ਚੈੱਕਲਿਸਟ ਦੇਵੇਗਾ।',
      quickLabel: 'ਜਲਦੀ ਚੁਣੋ',
      situationLabel: 'ਕੀ ਹੋ ਰਿਹਾ ਹੈ?',
      placeholder: 'ਜਿਵੇਂ: ਰਾਤ ਨੂੰ ਸੁੰਨਸਾਨ ਸੜਕ \'ਤੇ ਡਿਲੀਵਰੀ ਹੈ',
      get: 'ਸੁਰੱਖਿਆ ਕਦਮ ਲਓ',
      getting: 'ਕਦਮ ਬਣ ਰਹੇ ਹਨ…',
      firstStep: 'ਸਭ ਤੋਂ ਪਹਿਲਾਂ',
      helplinesTitle: 'ਲੋੜ ਹੋਵੇ ਤਾਂ ਕਾਲ ਕਰੋ',
      situations: {
        night: 'ਰਾਤ ਨੂੰ ਇਕੱਲੇ ਕੰਮ',
        rain: 'ਤੇਜ਼ ਮੀਂਹ ਜਾਂ ਪਾਣੀ ਭਰਿਆ',
        heat: 'ਬਹੁਤ ਗਰਮੀ / ਲੂ',
        harassment: 'ਕੋਈ ਤੰਗ ਕਰ ਰਿਹਾ ਜਾਂ ਧਮਕਾ ਰਿਹਾ ਹੈ',
        accident: 'ਸੜਕ ਹਾਦਸਾ',
        otp: 'ਕੋਈ OTP ਜਾਂ PIN ਮੰਗ ਰਿਹਾ ਹੈ',
      },
    },
    auth: {
      heroTitle: "ਕੰਮ, ਪੈਸਾ ਅਤੇ ਹੱਕ। ਇੱਕ ਥਾਂ।",
      heroText: "ਡਿਲਿਵਰੀ, ਡਰਾਈਵਿੰਗ, ਉਸਾਰੀ ਜਾਂ ਘਰੇਲੂ ਕੰਮ: KaamPe ਤੁਹਾਡੀ ਕਮਾਈ ਦਾ ਹਿਸਾਬ ਰੱਖਦਾ ਹੈ, ਹੱਕ ਅਤੇ ਸਕੀਮਾਂ ਸਮਝਾਉਂਦਾ ਹੈ, ਅਤੇ ਸ਼ਿਕਾਇਤ ਲਿਖਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।",
      featMoney: "ਬੋਲ ਕੇ ਕਮਾਈ ਅਤੇ ਖਰਚਾ ਲਿਖੋ",
      featRights: "ਆਪਣੇ ਹੱਕ ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ",
      featSchemes: "ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਦੀ ਜਾਂਚ",
      featSafety: "ਸੁਰੱਖਿਆ ਅਤੇ SOS ਇੱਕ ਟੈਪ 'ਤੇ",
      demoButton: "ਡੈਮੋ ਵੇਖੋ, ਇੱਕ ਕਲਿੱਕ ਵਿੱਚ",
      demoHint: "3 ਹਫ਼ਤਿਆਂ ਦੇ ਨਮੂਨਾ ਹਿਸਾਬ ਨਾਲ। ਕੋਈ ਪਾਸਵਰਡ ਨਹੀਂ।",
      orDivider: "ਜਾਂ ਲੌਗਇਨ ਕਰੋ",
      signInTab: "ਲੌਗਇਨ",
      signUpTab: "ਨਵਾਂ ਖਾਤਾ",
      username: "ਯੂਜ਼ਰਨੇਮ",
      usernameHint: "3-32 ਅੱਖਰ: a-z, 0-9, _ ਜਾਂ .",
      password: "ਪਾਸਵਰਡ",
      passwordHint: "ਘੱਟੋ-ਘੱਟ 8 ਅੱਖਰ",
      name: "ਤੁਹਾਡਾ ਨਾਂ (ਲਾਜ਼ਮੀ ਨਹੀਂ)",
      signIn: "ਲੌਗਇਨ ਕਰੋ",
      signingIn: "ਲੌਗਇਨ ਹੋ ਰਿਹਾ ਹੈ…",
      signUp: "ਖਾਤਾ ਬਣਾਓ",
      signingUp: "ਖਾਤਾ ਬਣ ਰਿਹਾ ਹੈ…",
      guest: "ਬਿਨਾਂ ਖਾਤੇ ਅੱਗੇ ਵਧੋ",
      guestHint: "ਡਾਟਾ ਸਿਰਫ਼ ਇਸ ਫ਼ੋਨ ਦੇ ਸੈਸ਼ਨ ਵਿੱਚ ਰਹੇਗਾ।",
      invalidUsername: "ਯੂਜ਼ਰਨੇਮ 3-32 ਅੱਖਰਾਂ ਦਾ ਹੋਵੇ: a-z, 0-9, _ ਜਾਂ .",
      invalidPassword: "ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 8 ਅੱਖਰਾਂ ਦਾ ਹੋਵੇ।",
      failed: "ਲੌਗਇਨ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      welcomeBack: "ਵਾਪਸ ਆਉਣ 'ਤੇ ਜੀ ਆਇਆਂ ਨੂੰ!",
      welcomeNew: "ਖਾਤਾ ਬਣ ਗਿਆ। ਹੁਣ ਆਪਣੇ ਕੰਮ ਬਾਰੇ ਦੱਸੋ।",
      logout: "ਲੌਗਆਊਟ",
      loggedOut: "ਤੁਸੀਂ ਲੌਗਆਊਟ ਹੋ ਗਏ।",
      signedInAs: "{name} ਵਜੋਂ",
      guestLabel: "ਬਿਨਾਂ ਖਾਤਾ",
      adminOpening: "ਐਡਮਿਨ ਪੈਨਲ ਖੁੱਲ੍ਹ ਰਿਹਾ ਹੈ…",
    },
    tools: {
      title: "ਟੂਲ",
      openMenu: "ਮੀਨੂ ਖੋਲ੍ਹੋ",
      closeMenu: "ਮੀਨੂ ਬੰਦ ਕਰੋ",
      assistant: "ਸਹਾਇਕ",
      assistantDesc: "ਕੁਝ ਵੀ ਪੁੱਛੋ",
      schemes: "ਸਕੀਮਾਂ",
      schemesDesc: "ਕਿਹੜੀ ਸਕੀਮ ਤੁਹਾਡੇ ਲਈ",
      rights: "ਤੁਹਾਡੇ ਹੱਕ",
      rightsDesc: "ਕਾਨੂੰਨ ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ",
      safety: "ਸੁਰੱਖਿਆ",
      safetyDesc: "ਰਾਤ, ਮੀਂਹ, ਧੋਖਾ",
      documents: "ਦਸਤਾਵੇਜ਼",
      documentsDesc: "ਕਾਗਜ਼ ਸਮਝੋ",
      complaint: "ਸ਼ਿਕਾਇਤ",
      complaintDesc: "ਭੁਗਤਾਨ ਝਗੜੇ ਦੀ ਚਿੱਠੀ",
      preferences: "ਪਸੰਦ",
    },
  },
};
