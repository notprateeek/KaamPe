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

import { hi } from './locales/hi';
import { en } from './locales/en';
import { pa } from './locales/pa';

/**
 * Every language in one object — used by tests and tooling.
 * The app itself loads one language at a time via ./loader so the main bundle
 * only ships the default (Hindi) strings.
 */
export const translations: Record<Language, Translations> = { hi, en, pa };
