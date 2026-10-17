import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import { HomeView, ChatMessage } from './features/home/HomeView';
import { clearChatHistory, fetchChatHistory } from './features/home/chatHistory';
import { LoginScreen } from './features/auth/LoginScreen';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Dialog } from './components/ui/Dialog';
import { SosButton } from './components/sos/SosButton';
import { ToastProvider, useToast } from './components/ui/Toast';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { ScreenReaderProvider } from './components/speech/ScreenReader';
import { AmountChips, SourceChips } from './features/money/QuickChips';
import { parseRupeesToPaise, parseWorkFields, saveMoneyEntry } from './features/money/moneyUtils';
import { useSavedEntryToast } from './features/money/useSavedEntryToast';
import { WORKER_PLATFORMS } from './constants/workerIcons';
import { todayLocalISODate } from './lib/date';

// Non-home views are split out of the initial bundle. Onboarding stays eager:
// it is the first thing a new user sees, and tests check for it right after load.
const loadMoneyView = () => import('./features/money/MoneyView');
const loadHelpView = () => import('./features/help/HelpView');
const loadMeView = () => import('./features/me/MeView');
const MoneyView = lazy(() => loadMoneyView().then((m) => ({ default: m.MoneyView })));
const HelpView = lazy(() => loadHelpView().then((m) => ({ default: m.HelpView })));
const MeView = lazy(() => loadMeView().then((m) => ({ default: m.MeView })));

const ViewFallback: React.FC<{ label: string }> = ({ label }) => (
  <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
    <svg className="motion-safe:animate-spin h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    <span>{label}</span>
  </div>
);

const AppContent: React.FC = () => {
  const {
    profile,
    activeTab,
    setActiveTab,
    t,
    buzz,
    sessionVersion,
    needsLogin,
    isLoadingSession,
    helpTab,
    setHelpTab,
    openHelp,
    helpNavKey,
  } = useApp();
  const { showToast } = useToast();
  const notifySaved = useSavedEntryToast();
  // Bumped after any money change made outside a view, so Home's totals refetch.
  const [moneyVersion, setMoneyVersion] = useState(0);
  const bumpMoney = () => setMoneyVersion((v) => v + 1);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();
  // Lives here so the conversation survives switching tabs
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Quick Add Earning Modal triggerable from anywhere
  const [showGlobalEarningModal, setShowGlobalEarningModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [trips, setTrips] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(todayLocalISODate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // A different account (demo login / logout) starts with an empty conversation.
  useEffect(() => {
    if (sessionVersion > 0) {
      setChatMessages([]);
      bumpMoney();
    }
  }, [sessionVersion]);

  // Bring back this session's saved chat after a reload or account switch.
  // Never replaces messages the worker has already sent in the meantime.
  useEffect(() => {
    let cancelled = false;
    fetchChatHistory(profile.language)
      .then((saved) => {
        if (!cancelled && saved.length) setChatMessages((prev) => (prev.length ? prev : saved));
      })
      .catch(() => {
        /* offline: start with an empty chat */
      });
    return () => {
      cancelled = true;
    };
    // Language only labels the read-aloud voice; reloading on a language change is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionVersion]);

  // Warm the lazy chunks once the home screen is idle so tab switches are instant.
  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadMoneyView();
      void loadHelpView();
      void loadMeView();
    }, 1200);
    return () => window.clearTimeout(id);
  }, []);

  const openEarningModal = () => {
    setError('');
    setAmount('');
    setSource('');
    setTrips('');
    setHours('');
    setDate(todayLocalISODate());
    setShowGlobalEarningModal(true);
  };

  const closeEarningModal = () => {
    setShowGlobalEarningModal(false);
    setError('');
  };

  const handleGlobalAddEarning = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const paise = parseRupeesToPaise(amount);
    if (paise === null) {
      setError(t.forms.invalidAmount);
      return;
    }

    const work = parseWorkFields(trips, hours);
    if (work === null) {
      setError(t.work.invalid);
      return;
    }

    setIsSubmitting(true);
    try {
      const entryId = await saveMoneyEntry('earning', paise, { source: source.trim() || undefined, date, ...work });

      setShowGlobalEarningModal(false);
      setAmount('');
      setSource('');
      buzz();
      bumpMoney();
      notifySaved('earning', paise, entryId, bumpMoney);
    } catch {
      setError(t.forms.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  // First visit: one-tap demo, sign in / sign up, or continue as a guest.
  if (needsLogin) return <LoginScreen />;
  // Unknown visitor while the session loads: a blank canvas instead of a flash of the app.
  if (isLoadingSession && !profile.isOnboarded) return <div className="min-h-screen bg-canvas" aria-busy="true" />;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#main-content" className="skip-link">
        {t.a11y.skipToContent}
      </a>

      <OfflineBanner />

      <div className="md:flex">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Header />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 lg:px-10 pt-2 md:pt-10 pb-36 md:pb-28 focus:outline-none"
        >
          {activeTab === 'home' && (
            <HomeView
              messages={chatMessages}
              setMessages={setChatMessages}
              onOpenAddEarning={openEarningModal}
              onNavigateToTab={setActiveTab}
              onOpenHelp={openHelp}
              initialPrompt={initialPrompt}
              moneyVersion={moneyVersion}
            />
          )}

          {activeTab !== 'home' && (
            <Suspense fallback={<ViewFallback label={t.a11y.loading} />}>
              {activeTab === 'money' && <MoneyView onEntryAdded={bumpMoney} />}
              {activeTab === 'me' && (
                <MeView
                  hasChat={chatMessages.length > 0}
                  onClearChat={async () => {
                    if (await clearChatHistory()) {
                      setChatMessages([]);
                      showToast(t.me.chatCleared);
                    } else {
                      showToast(t.common.error);
                    }
                  }}
                />
              )}
              {activeTab === 'help' && (
                <HelpView
                  key={helpNavKey}
                  initialTab={helpTab}
                  onTabChange={setHelpTab}
                  onNavigateToChatWithPrompt={(p) => {
                    setInitialPrompt(p);
                    setActiveTab('home');
                  }}
                />
              )}
            </Suspense>
          )}
        </main>

        <BottomNav />

        {profile.isOnboarded && <SosButton />}

        {/* ONBOARDING MODAL IF NOT YET ONBOARDED */}
        {!profile.isOnboarded && <OnboardingModal />}

        {/* QUICK ADD EARNING MODAL */}
        <Dialog open={showGlobalEarningModal} onClose={closeEarningModal} title={t.money.earningModalTitle}>
          <form onSubmit={handleGlobalAddEarning} className="space-y-4" noValidate>
            <Input
              id="quick-earning-amount"
              label={t.money.amountLabel}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={t.forms.amountPlaceholder}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={error === t.forms.invalidAmount ? error : undefined}
              required
            />
            <AmountChips value={amount} onPick={setAmount} label={t.money.quickAmounts} />

            <Input
              id="quick-earning-source"
              label={t.money.sourceLabel}
              type="text"
              placeholder={t.forms.sourcePlaceholder}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <SourceChips
              options={WORKER_PLATFORMS[profile.workerType]}
              value={source}
              onPick={setSource}
              label={t.money.quickSources}
            />

            <fieldset>
              <legend className="text-sm font-semibold text-ink mb-1.5">
                {t.work.title} <span className="font-normal text-ink-muted">({t.work.optional})</span>
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="quick-earning-trips"
                  label={t.work.tripsLabel}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={trips}
                  onChange={(e) => setTrips(e.target.value.replace(/[^\d]/g, ''))}
                />
                <Input
                  id="quick-earning-hours"
                  label={t.work.hoursLabel}
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={5}
                  value={hours}
                  onChange={(e) => setHours(e.target.value.replace(/[^\d.]/g, ''))}
                />
              </div>
            </fieldset>

            <Input
              id="quick-earning-date"
              label={t.money.dateLabel}
              type="date"
              value={date}
              max={todayLocalISODate()}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            {error && error !== t.forms.invalidAmount && (
              <p className="text-xs text-semantic-error font-medium" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" size="md" onClick={closeEarningModal} className="flex-1">
                {t.money.cancel}
              </Button>
              <Button type="submit" variant="accent" size="md" isLoading={isSubmitting} className="flex-1">
                {t.money.save}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ScreenReaderProvider>
          <AppContent />
        </ScreenReaderProvider>
      </ToastProvider>
    </AppProvider>
  );
}
