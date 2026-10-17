import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { VoiceInputButton } from '../../components/voice/VoiceInputButton';
import { ReadAloudButton } from '../../components/speech/ReadAloudButton';
import { CopyButton } from '../../components/speech/CopyButton';
import type { Language, Translations } from '../../i18n/translations';
import {
  Send,
  Plus,
  AlertCircle,
  FileText,
  ShieldAlert,
  ExternalLink,
  Check,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import type { HelpTab } from '../help/HelpView';

interface MoneyConfirmation {
  ready: boolean;
  earning: { amountRupees: number; source: string } | null;
  expense: { amountRupees: number; category: string } | null;
  netRupees: number;
  formattedEarning: string | null;
  formattedExpense: string | null;
  formattedNet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  type?: 'text' | 'confirmation' | 'answer' | 'grievance';
  confirmation?: MoneyConfirmation;
  directAnswer?: string;
  steps?: string[];
  sources?: Array<{ title: string; url: string }>;
  eligibilityState?: string;
  breakdown?: {
    earnedRupees: number;
    spentRupees: number;
    netRupees: number;
  };
  summary?: string;
  draftMessage?: string;
  /** Language the message was written in (for read-aloud voice). */
  lang?: Language;
  /** Request failed; `retryText` is the prompt to resend. */
  isError?: boolean;
  retryText?: string;
  createdAt: number;
}

/** Plain-text version of an assistant reply, for read-aloud and copy. */
function speakableText(msg: ChatMessage, t: Translations): string {
  if (msg.type === 'confirmation' || msg.isError) return '';
  const parts: string[] = [];
  if (msg.directAnswer) parts.push(msg.directAnswer);
  if (msg.steps?.length) parts.push(`${t.ai.whatYouCanDo}:`, ...msg.steps);
  if (msg.type === 'grievance' && msg.draftMessage) {
    if (msg.summary) parts.push(msg.summary);
    parts.push(msg.draftMessage);
  }
  if (!parts.length && msg.content) parts.push(msg.content);
  return parts.join('\n');
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface TodaySummary {
  earningsRupees: number;
  expensesRupees: number;
  netRupees: number;
  entryCount: number;
}

export const HomeView: React.FC<{
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onOpenAddEarning: () => void;
  onNavigateToTab: (tab: 'home' | 'money' | 'help') => void;
  onOpenHelp: (tab: HelpTab) => void;
  initialPrompt?: string;
}> = ({ messages, setMessages, onOpenAddEarning, onNavigateToTab, onOpenHelp, initialPrompt }) => {
  const { t, profile } = useApp();
  const [inputMessage, setInputMessage] = useState(initialPrompt || '');
  const [isSending, setIsSending] = useState(false);
  const [todayMoney, setTodayMoney] = useState<TodaySummary | null>(null);
  // Per-card save state so saving one confirmation doesn't spin every card.
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch today's actual money totals
  const fetchTodayMoney = async () => {
    try {
      const res = await fetch('/api/money/summary', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTodayMoney(data.today);
      }
    } catch (err) {
      console.warn('Failed to load today money', err);
    }
  };

  useEffect(() => {
    fetchTodayMoney();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [messages, isSending]);

  // A new prompt handed over from Help replaces the draft.
  useEffect(() => {
    if (initialPrompt) setInputMessage(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendMessage = async (msgText?: string) => {
    const textToSend = (msgText || inputMessage).trim();
    if (!textToSend || isSending) return;

    setInputMessage('');

    // Add user message to thread
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: textToSend,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setLiveStatus(t.ai.thinking);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: textToSend,
          language: profile.language,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(res.status === 429 ? t.chat.rateLimited : t.common.error);
      }

      const assistantMsg: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        type: data.type,
        content: data.message,
        confirmation: data.confirmation,
        directAnswer: data.directAnswer,
        steps: data.steps,
        sources: data.sources,
        eligibilityState: data.eligibilityState,
        breakdown: data.breakdown,
        summary: data.summary,
        draftMessage: data.draftMessage,
        lang: profile.language,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLiveStatus(t.chat.newReply);
    } catch (err: unknown) {
      // Network failures (TypeError) and server errors both get a localized message.
      const message =
        err instanceof Error && (err.message === t.chat.rateLimited || err.message === t.common.error)
          ? err.message
          : t.common.error;
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_' + Date.now() + '_err',
          role: 'assistant',
          type: 'text',
          content: message,
          isError: true,
          retryText: textToSend,
          lang: profile.language,
          createdAt: Date.now(),
        },
      ]);
      setLiveStatus('');
    } finally {
      setIsSending(false);
    }
  };

  // Section 17: User presses Save on confirmation card -> Persist it!
  const handleConfirmMoneySave = async (msgId: string, conf: MoneyConfirmation) => {
    if (savingIds[msgId]) return;
    setSavingIds((prev) => ({ ...prev, [msgId]: true }));
    setSaveErrors((prev) => {
      const { [msgId]: _omit, ...rest } = prev;
      return rest;
    });
    try {
      const res = await fetch('/api/ai/confirm-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          earning: conf.earning ? { amount: conf.earning.amountRupees, source: conf.earning.source } : null,
          expense: conf.expense ? { amount: conf.expense.amountRupees, category: conf.expense.category } : null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save transaction');
      }

      const data = await res.json();

      // Refresh today money card immediately
      await fetchTodayMoney();

      // Update message card state to confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                type: 'text',
                content: `${data.message} (${conf.formattedNet})`,
                confirmation: undefined,
              }
            : m
        )
      );

      showToast(t.ai.moneySavedToast);
    } catch {
      setSaveErrors((prev) => ({ ...prev, [msgId]: t.chat.saveFailed }));
    } finally {
      setSavingIds((prev) => {
        const { [msgId]: _omit, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRetry = (msg: ChatMessage) => {
    if (!msg.retryText || isSending) return;
    const text = msg.retryText;
    // Drop the failed reply and the user message it answered, then resend.
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx === -1) return prev;
      const before = prev[idx - 1];
      const cut = before && before.role === 'user' && before.content === text ? idx - 1 : idx;
      return [...prev.slice(0, cut), ...prev.slice(idx + 1)];
    });
    handleSendMessage(text);
  };

  const handleCancelConfirmation = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              type: 'text',
              content: t.ai.cancelled,
              confirmation: undefined,
            }
          : m
      )
    );
  };

  const formatCurrency = (val: number) => {
    const isNeg = val < 0;
    const abs = Math.abs(val);
    const str = abs % 1 === 0 ? abs.toLocaleString('en-IN') : abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNeg ? `-₹${str}` : `₹${str}`;
  };

  const hasMoneyRecords = (todayMoney?.entryCount ?? 0) > 0;

  const quickActionClass =
    'flex flex-col items-start justify-between gap-3 p-3.5 min-h-[6.5rem] rounded-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2';
  const quickActionPlain = `${quickActionClass} bg-surface-1 border border-hairline hover:border-ink`;

  return (
    // Mobile: one column (ask → today's money → shortcuts → conversation).
    // lg+: conversation column on the left, money + shortcuts pinned on the right.
    <div className="grid gap-5 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-14 md:top-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-xs font-semibold px-4 py-2 rounded-full shadow-float flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
        >
          <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ASK AREA (Section 10) */}
      <section className="space-y-4 lg:col-start-1 lg:row-start-1 min-w-0">
        <div className="pt-1">
          <p className="text-base md:text-lg font-medium text-ink-muted">{t.home.greeting}</p>
          <h1 className="mt-0.5 text-[1.875rem] md:text-5xl leading-[1.02] font-extrabold font-wide text-ink">
            {t.home.questionPrompt}
          </h1>
        </div>

        {/* LARGE CONVERSATIONAL INPUT — STRONGEST ACTION (Section 10) */}
        <Card className="bg-surface-1 border-2 border-ink shadow-offset-sm md:shadow-offset p-3 md:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="home-chat-input" className="sr-only">
              {t.home.inputPlaceholder}
            </label>
            <textarea
              id="home-chat-input"
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.home.inputPlaceholder}
              className="w-full bg-transparent text-ink placeholder:text-ink-tertiary text-lg md:text-xl leading-snug resize-none focus:outline-none md:min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-hairline-soft">
              <span
                className={`text-[0.6875rem] min-w-0 ${isListening ? 'text-accent font-semibold' : 'hidden sm:inline text-ink-tertiary'}`}
              >
                {isListening ? t.voice.listening : t.home.languagesHint}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <VoiceInputButton
                  value={inputMessage}
                  onChange={setInputMessage}
                  onListeningChange={setIsListening}
                  controlsId="home-chat-input"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  disabled={!inputMessage.trim() || isSending}
                  isLoading={isSending}
                  className="flex items-center gap-2 px-5 shrink-0"
                >
                  <span>{t.home.askButton}</span>
                  <Send className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </section>

      {/* SIDE PANEL: TODAY'S MONEY + SHORTCUTS (Section 10) */}
      <aside className="space-y-5 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-8 min-w-0">
        {/* AAJ KA KHATA: ruled ledger card with a red margin line */}
        <section className="relative overflow-hidden rounded-card border border-hairline bg-surface-1" aria-labelledby="home-khata-title">
          <span className="absolute inset-y-0 left-12 w-0.5 bg-rule" aria-hidden="true" />
          <div className="relative pl-16 pr-4 pt-4 pb-3">
            <h2 id="home-khata-title" className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {t.home.todaysMoneyTitle}
            </h2>
            {hasMoneyRecords ? (
              <>
                <p className="text-5xl leading-none font-extrabold font-wide text-ink mt-1">
                  {formatCurrency(todayMoney?.netRupees ?? 0)}
                </p>
                <p className="text-sm text-ink-muted mt-1">{t.home.netToday}</p>
              </>
            ) : (
              <p className="text-base font-semibold text-ink mt-2">{t.home.noMoneyTitle}</p>
            )}
          </div>
          {hasMoneyRecords && (
            <dl className="relative ledger-rules border-t border-hairline">
              <div className="flex items-center justify-between h-10 pl-16 pr-4">
                <dt className="text-sm text-ink">{t.home.earned}</dt>
                <dd className="text-base font-bold text-semantic-success">+{formatCurrency(todayMoney?.earningsRupees ?? 0)}</dd>
              </div>
              <div className="flex items-center justify-between h-10 pl-16 pr-4">
                <dt className="text-sm text-ink">{t.home.spent}</dt>
                <dd className="text-base font-bold text-semantic-error">−{formatCurrency(todayMoney?.expensesRupees ?? 0)}</dd>
              </div>
            </dl>
          )}
          <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 pl-16 pr-3 py-3 border-t border-hairline">
            <Button variant="primary" size="md" onClick={onOpenAddEarning} className="flex-1 whitespace-nowrap">
              {t.home.addMoneyAction}
            </Button>
            <button
              type="button"
              onClick={() => onNavigateToTab('money')}
              className="min-h-[44px] px-2 rounded-subtle text-sm font-bold text-accent whitespace-nowrap hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {t.home.viewDetails}
            </button>
          </div>
        </section>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 px-1">{t.home.quickActions}</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpenAddEarning()} className={`${quickActionClass} bg-marigold hover:bg-marigold-hover`}>
              <Plus className="w-6 h-6 text-ink" aria-hidden="true" />
              <span className="text-[0.9375rem] font-bold text-ink leading-tight">{t.home.shortcuts.addEarning}</span>
            </button>

            <button type="button" onClick={() => onOpenHelp('dispute')} className={`${quickActionClass} bg-ink hover:bg-ink-hover`}>
              <AlertCircle className="w-6 h-6 text-marigold" aria-hidden="true" />
              <span className="text-[0.9375rem] font-bold text-white leading-tight">{t.home.shortcuts.paymentMissing}</span>
            </button>

            <button type="button" onClick={() => onOpenHelp('doc')} className={quickActionPlain}>
              <FileText className="w-6 h-6 text-ink" aria-hidden="true" />
              <span className="text-[0.9375rem] font-bold text-ink leading-tight">{t.home.shortcuts.explainDoc}</span>
            </button>

            <button type="button" onClick={() => handleSendMessage(t.home.safetyPrompt)} className={quickActionPlain}>
              <ShieldAlert className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-[0.9375rem] font-bold text-ink leading-tight">{t.home.shortcuts.safetyQuestion}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* CONVERSATION THREAD */}
      <section className="lg:col-start-1 lg:row-start-2 min-w-0" aria-labelledby="home-conversation-heading">
        {/* Short announcements only — the thread itself is not a live region (too verbose). */}
        <p role="status" aria-live="polite" className="sr-only">
          {liveStatus}
        </p>
        {messages.length === 0 && !isSending ? (
          <div className="rounded-card bg-surface-2 border border-hairline p-4 md:p-6">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-accent" aria-hidden="true" />
              <h2 id="home-conversation-heading" className="text-sm font-semibold text-ink">{t.home.emptyChatTitle}</h2>
            </div>
            <p className="text-xs text-ink-muted mb-3">{t.home.emptyChatHint}</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              {t.home.examplePrompts.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => {
                    setInputMessage(prompt);
                    document.getElementById('home-chat-input')?.focus();
                  }}
                  className="text-left min-h-[44px] text-sm font-medium text-ink bg-surface-1 border border-dashed border-ink-subtle rounded-full px-3.5 py-2 hover:border-ink hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
        <div className="space-y-3">
          <h2 id="home-conversation-heading" className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">
            {t.home.conversation}
          </h2>

          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-ink text-white rounded-[1.125rem] rounded-br-md px-4 py-2.5 max-w-[85%] md:max-w-[70%] text-base">
                    {msg.content}
                  </div>
                </div>
              );
            }

            // ASSISTANT RESPONSES: STRUCTURED (Section 14 & 17)
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="w-full md:max-w-[90%] space-y-2">
                  {/* CONFIRMATION CARD (Section 17: Signature demo moment) */}
                  {msg.type === 'confirmation' && msg.confirmation && (
                    <div className="receipt bg-surface-1 border-x border-hairline px-5 pt-6 pb-6 max-w-md drop-shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-lg font-extrabold font-wide text-ink leading-tight">{t.ai.addToTodayMoney}</h3>
                        <span className="shrink-0 -rotate-6 border-2 border-semantic-error text-semantic-error rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wider">
                          {t.ai.notSavedYet}
                        </span>
                      </div>

                      <div className="text-base mb-4">
                        {msg.confirmation.earning && (
                          <div className="flex items-center justify-between py-2 border-b border-hairline">
                            <span className="text-ink">{msg.confirmation.earning.source}</span>
                            <span className="font-bold text-semantic-success">{msg.confirmation.formattedEarning}</span>
                          </div>
                        )}

                        {msg.confirmation.expense && (
                          <div className="flex items-center justify-between py-2 border-b border-hairline">
                            <span className="text-ink">{t.money.categories[msg.confirmation.expense.category as keyof typeof t.money.categories] ?? msg.confirmation.expense.category}</span>
                            <span className="font-bold text-semantic-error">{msg.confirmation.formattedExpense}</span>
                          </div>
                        )}

                        <div className="flex items-baseline justify-between pt-2 pb-1 border-b-4 border-double border-ink">
                          <span className="text-ink-muted">{t.ai.netImpact}</span>
                          <span className="text-3xl font-extrabold font-wide text-ink">{msg.confirmation.formattedNet}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => handleCancelConfirmation(msg.id)}
                          className="flex-1"
                        >
                          {t.ai.cancel}
                        </Button>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => handleConfirmMoneySave(msg.id, msg.confirmation!)}
                          isLoading={!!savingIds[msg.id]}
                          className="flex-[2]"
                        >
                          {t.ai.saveToMoney}
                        </Button>
                      </div>
                      {saveErrors[msg.id] && (
                        <p role="alert" className="mt-2 text-xs font-medium text-semantic-error">
                          {saveErrors[msg.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* DIRECT ANSWER + WHAT YOU CAN DO (Section 14) */}
                  {msg.directAnswer && (
                    <Card className="bg-surface-1 border border-hairline p-4 md:p-6 space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                            {t.ai.directAnswer}
                          </span>
                          {msg.eligibilityState && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent-light text-accent-hover border border-accent-subtle">
                              {msg.eligibilityState}
                            </span>
                          )}
                        </div>
                        <p className="text-base md:text-lg font-medium text-ink leading-relaxed">
                          {msg.directAnswer}
                        </p>
                      </div>

                      {/* Money breakdown if available */}
                      {msg.breakdown && (
                        <div className="grid grid-cols-3 gap-2 bg-surface-2 p-2.5 rounded-xl border border-hairline-soft text-xs text-center">
                          <div>
                            <span className="text-ink-muted block">{t.ai.earned}</span>
                            <span className="font-bold text-semantic-success">
                              {formatCurrency(msg.breakdown.earnedRupees)}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-muted block">{t.ai.spent}</span>
                            <span className="font-bold text-semantic-error">
                              {formatCurrency(msg.breakdown.spentRupees)}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-muted block font-semibold">{t.ai.left}</span>
                            <span className="font-bold text-ink">
                              {formatCurrency(msg.breakdown.netRupees)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 2-4 Practical Steps */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="pt-2 border-t border-hairline-soft">
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
                            {t.ai.whatYouCanDo}
                          </span>
                          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {msg.steps.map((st, i) => (
                              <li key={i} className="flex gap-3 sm:flex-col sm:gap-1 bg-surface-2 rounded-subtle p-3 text-sm text-ink leading-snug">
                                <span className="text-xl font-extrabold font-wide text-accent leading-none" aria-hidden="true">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span>{st}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Official Grounded Sources (Section 20 & 21) */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-hairline-soft">
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
                            {t.ai.sources}
                          </span>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {msg.sources.map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-hairline-soft text-xs font-semibold text-ink hover:text-accent hover:border-accent transition-colors"
                              >
                                <span className="truncate pr-2">{src.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-accent" aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* GRIEVANCE DRAFT FROM CHAT */}
                  {msg.type === 'grievance' && msg.draftMessage && (
                    <Card className="bg-surface-1 border border-hairline p-4 md:p-5 shadow-subtle space-y-2">
                      {msg.summary && <p className="text-sm font-semibold text-ink">{msg.summary}</p>}
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent block">
                        {t.help.disputeDraftTitle}
                      </span>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap bg-surface-2 p-3 rounded-xl border border-hairline-soft">
                        {msg.draftMessage}
                      </p>
                    </Card>
                  )}

                  {/* PLAIN TEXT OR FALLBACK MESSAGE */}
                  {msg.isError ? (
                    <Card
                      role="alert"
                      className="bg-surface-1 border border-semantic-error/40 p-3 text-sm text-semantic-error flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {msg.content}
                      </span>
                      {msg.retryText && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRetry(msg)}
                          disabled={isSending}
                          className="gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          {t.common.retry}
                        </Button>
                      )}
                    </Card>
                  ) : (
                    msg.content &&
                    !msg.confirmation &&
                    !msg.directAnswer && (
                      <Card className="bg-surface-1 border border-hairline p-3 text-sm text-ink">
                        {msg.content}
                      </Card>
                    )
                  )}

                  {/* READ ALOUD + COPY */}
                  {(() => {
                    const spoken = speakableText(msg, t);
                    if (!spoken) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <ReadAloudButton text={spoken} lang={msg.lang} />
                        <CopyButton text={spoken} />
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-surface-1 border border-hairline rounded-2xl px-4 py-2.5 text-xs text-ink-muted flex items-center gap-2 shadow-subtle">
                <svg className="motion-safe:animate-spin h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>{t.ai.thinking}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        )}
      </section>
    </div>
  );
};
