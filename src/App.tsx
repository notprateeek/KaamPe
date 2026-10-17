import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import { HomeView, ChatMessage } from './features/home/HomeView';
import { MoneyView } from './features/money/MoneyView';
import { HelpView, HelpTab } from './features/help/HelpView';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';

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
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGlobalAddEarning = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount');
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      setShowGlobalEarningModal(false);
      setAmount('');
      setSource('');
      // Trigger tab refresh or switch to money
      setActiveTab('money');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink md:flex">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 lg:px-10 pt-4 md:pt-8 pb-24 md:pb-12">
          {activeTab === 'home' && (
            <HomeView
              messages={chatMessages}
              setMessages={setChatMessages}
              onOpenAddEarning={() => setShowGlobalEarningModal(true)}
              onNavigateToTab={setActiveTab}
              onOpenHelp={(tab) => {
                setHelpTab(tab);
                setActiveTab('help');
              }}
              initialPrompt={initialPrompt}
            />
          )}

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
        </main>

        <BottomNav />

        {/* ONBOARDING MODAL IF NOT YET ONBOARDED */}
        {!profile.isOnboarded && <OnboardingModal />}

        {/* QUICK ADD EARNING MODAL */}
        {showGlobalEarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-sm bg-surface-1 shadow-float border border-hairline p-5">
              <h3 className="text-lg font-bold text-ink mb-4">
                {t.money.earningModalTitle}
              </h3>

              <form onSubmit={handleGlobalAddEarning} className="space-y-4">
                <Input
                  label={t.money.amountLabel}
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="e.g. 850"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  required
                />

                <Input
                  label={t.money.sourceLabel}
                  type="text"
                  placeholder="e.g. Swiggy, Zomato, Cash"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />

                <Input
                  label={t.money.dateLabel}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />

                {error && (
                  <p className="text-xs text-semantic-error font-medium" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setShowGlobalEarningModal(false)}
                    className="flex-1"
                  >
                    {t.money.cancel}
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    size="md"
                    isLoading={isSubmitting}
                    className="flex-1"
                  >
                    {t.money.save}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
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
