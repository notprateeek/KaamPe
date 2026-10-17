import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import { HomeView, ChatMessage } from './features/home/HomeView';
import type { HelpTab } from './features/help/HelpView';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Dialog } from './components/ui/Dialog';
import { SosButton } from './components/sos/SosButton';
import { todayLocalISODate } from './lib/date';

// Non-home views are split out of the initial bundle. Onboarding stays eager:
// it is the first thing a new user sees, and tests check for it right after load.
const loadMoneyView = () => import('./features/money/MoneyView');
const loadHelpView = () => import('./features/help/HelpView');
const MoneyView = lazy(() => loadMoneyView().then((m) => ({ default: m.MoneyView })));
const HelpView = lazy(() => loadHelpView().then((m) => ({ default: m.HelpView })));

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
  const { profile, activeTab, setActiveTab, t } = useApp();
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();
  // Lives here so the conversation survives switching tabs
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [helpTab, setHelpTab] = useState<HelpTab>('doc');

  // Quick Add Earning Modal triggerable from anywhere
  const [showGlobalEarningModal, setShowGlobalEarningModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(todayLocalISODate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Warm the lazy chunks once the home screen is idle so tab switches are instant.
  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadMoneyView();
      void loadHelpView();
    }, 1200);
    return () => window.clearTimeout(id);
  }, []);

  const openEarningModal = () => {
    setError('');
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
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError(t.forms.invalidAmount);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/money/earning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: num,
          source: source.trim() || undefined,
          date,
        }),
      });

      if (!res.ok) throw new Error('save_failed');

      setShowGlobalEarningModal(false);
      setAmount('');
      setSource('');
      setActiveTab('money');
    } catch {
      setError(t.forms.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#main-content" className="skip-link">
        {t.a11y.skipToContent}
      </a>

      <div className="block-print h-2.5" aria-hidden="true" />

      <div className="md:flex">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Header />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 lg:px-10 pt-4 md:pt-8 pb-40 md:pb-28 focus:outline-none"
        >
          {activeTab === 'home' && (
            <HomeView
              messages={chatMessages}
              setMessages={setChatMessages}
              onOpenAddEarning={openEarningModal}
              onNavigateToTab={setActiveTab}
              onOpenHelp={(tab) => {
                setHelpTab(tab);
                setActiveTab('help');
              }}
              initialPrompt={initialPrompt}
            />
          )}

          {activeTab !== 'home' && (
            <Suspense fallback={<ViewFallback label={t.a11y.loading} />}>
              {activeTab === 'money' && <MoneyView />}
              {activeTab === 'help' && (
                <HelpView
                  initialTab={helpTab}
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
              type="number"
              inputMode="decimal"
              step="any"
              min="0.01"
              placeholder={t.forms.amountPlaceholder}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={error === t.forms.invalidAmount ? error : undefined}
              required
            />

            <Input
              id="quick-earning-source"
              label={t.money.sourceLabel}
              type="text"
              placeholder={t.forms.sourcePlaceholder}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />

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
      <AppContent />
    </AppProvider>
  );
}
