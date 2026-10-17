import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Send,
  Plus,
  AlertCircle,
  FileText,
  ShieldAlert,
  ExternalLink,
  Check,
  MessageCircle,
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
  createdAt: number;
}

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
  const [savingConfirmation, setSavingConfirmation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server error');
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
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_' + Date.now(),
          role: 'assistant',
          type: 'text',
          content: err.message || t.common.error,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Section 17: User presses Save on confirmation card -> Persist it!
  const handleConfirmMoneySave = async (msgId: string, conf: MoneyConfirmation) => {
    setSavingConfirmation(true);
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
    } catch (err: any) {
      alert(err.message || 'Error saving money');
    } finally {
      setSavingConfirmation(false);
    }
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
    'flex items-center gap-2.5 p-3 bg-surface-1 border border-hairline rounded-card text-left hover:bg-surface-2 transition-colors min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    // Mobile: one column (ask → today's money → shortcuts → conversation).
    // lg+: conversation column on the left, money + shortcuts pinned on the right.
    <div className="grid gap-4 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-14 md:top-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-xs font-semibold px-4 py-2 rounded-full shadow-float flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
        >
          <Check className="w-3.5 h-3.5 text-semantic-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ASK AREA (Section 10) */}
      <section className="space-y-4 lg:col-start-1 lg:row-start-1 min-w-0">
        <div className="pt-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-ink">
            {t.home.greeting}
          </h1>
          <p className="text-sm md:text-base text-ink-muted mt-0.5">
            {t.home.questionPrompt}
          </p>
        </div>

        {/* LARGE CONVERSATIONAL INPUT — STRONGEST ACTION (Section 10) */}
        <Card className="bg-surface-1 border border-hairline shadow-subtle p-3 md:p-4 focus-within:border-accent transition-colors">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-2"
          >
            <textarea
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.home.inputPlaceholder}
              aria-label={t.home.inputPlaceholder}
              className="w-full bg-transparent text-ink placeholder:text-ink-tertiary text-sm md:text-base resize-none focus:outline-none md:min-h-[72px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-hairline-soft">
              <span className="text-[11px] text-ink-tertiary">{t.home.languagesHint}</span>

              <Button
                type="submit"
                variant="accent"
                size="sm"
                disabled={!inputMessage.trim() || isSending}
                isLoading={isSending}
                className="flex items-center gap-1.5 px-4 shrink-0"
              >
                <span>{t.home.askButton}</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </Card>
      </section>

      {/* SIDE PANEL: TODAY'S MONEY + SHORTCUTS (Section 10) */}
      <aside className="space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-8 min-w-0">
        <Card
          onClick={() => onNavigateToTab('money')}
          className="bg-surface-1 border border-hairline p-4 cursor-pointer hover:border-ink-muted transition-all shadow-subtle"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {t.home.todaysMoneyTitle}
            </h2>
            <span className="text-xs font-semibold text-accent hover:underline">
              {t.home.viewDetails}
            </span>
          </div>

          {!hasMoneyRecords ? (
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm font-medium text-ink-muted">{t.home.noMoneyTitle}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddEarning();
                }}
                className="text-xs py-1 shrink-0"
              >
                {t.home.addMoneyAction}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 py-1 text-center">
              <div className="bg-surface-2 p-2 rounded-subtle border border-hairline-soft">
                <span className="text-[11px] text-ink-muted block">{t.home.earned}</span>
                <span className="text-sm font-bold text-semantic-success">
                  {formatCurrency(todayMoney?.earningsRupees ?? 0)}
                </span>
              </div>

              <div className="bg-surface-2 p-2 rounded-subtle border border-hairline-soft">
                <span className="text-[11px] text-ink-muted block">{t.home.spent}</span>
                <span className="text-sm font-bold text-semantic-error">
                  {formatCurrency(todayMoney?.expensesRupees ?? 0)}
                </span>
              </div>

              <div className="bg-surface-2 p-2 rounded-subtle border border-hairline-soft">
                <span className="text-[11px] text-ink-muted block font-semibold">{t.home.netToday}</span>
                <span className="text-sm font-extrabold text-ink">
                  {formatCurrency(todayMoney?.netRupees ?? 0)}
                </span>
              </div>
            </div>
          )}
        </Card>

        <div>
          <h2 className="text-xs font-semibold text-ink-muted mb-2 px-1">{t.home.quickActions}</h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onOpenAddEarning()} className={quickActionClass}>
              <div className="w-8 h-8 rounded-subtle bg-accent-light text-accent flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">{t.home.shortcuts.addEarning}</span>
            </button>

            <button onClick={() => onOpenHelp('dispute')} className={quickActionClass}>
              <div className="w-8 h-8 rounded-subtle bg-semantic-error/10 text-semantic-error flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">{t.home.shortcuts.paymentMissing}</span>
            </button>

            <button onClick={() => onOpenHelp('doc')} className={quickActionClass}>
              <div className="w-8 h-8 rounded-subtle bg-surface-2 text-ink flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">{t.home.shortcuts.explainDoc}</span>
            </button>

            <button onClick={() => handleSendMessage(t.home.safetyPrompt)} className={quickActionClass}>
              <div className="w-8 h-8 rounded-subtle bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">{t.home.shortcuts.safetyQuestion}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* CONVERSATION THREAD */}
      <section className="lg:col-start-1 lg:row-start-2 min-w-0" aria-live="polite">
        {messages.length === 0 && !isSending ? (
          <div className="rounded-card border border-dashed border-hairline p-4 md:p-6">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-accent" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-ink">{t.home.emptyChatTitle}</h2>
            </div>
            <p className="text-xs text-ink-muted mb-3">{t.home.emptyChatHint}</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              {t.home.examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInputMessage(prompt)}
                  className="text-left text-xs font-medium text-ink bg-surface-1 border border-hairline rounded-full px-3 py-2 hover:border-accent hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">
            {t.home.conversation}
          </h2>

          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-ink text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] md:max-w-[70%] text-sm shadow-subtle">
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
                    <Card className="bg-surface-1 border-2 border-accent/40 shadow-float p-4 max-w-md animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                          ₹
                        </div>
                        <h3 className="text-sm font-bold text-ink">{t.ai.addToTodayMoney}</h3>
                      </div>

                      <div className="bg-surface-2 p-3 rounded-xl space-y-1.5 mb-3 border border-hairline-soft text-sm">
                        {msg.confirmation.earning && (
                          <div className="flex items-center justify-between text-semantic-success font-medium">
                            <span>{msg.confirmation.earning.source}</span>
                            <span className="font-bold">{msg.confirmation.formattedEarning}</span>
                          </div>
                        )}

                        {msg.confirmation.expense && (
                          <div className="flex items-center justify-between text-semantic-error font-medium">
                            <span>{t.money.categories[msg.confirmation.expense.category as keyof typeof t.money.categories] ?? msg.confirmation.expense.category}</span>
                            <span className="font-bold">{msg.confirmation.formattedExpense}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-hairline flex items-center justify-between font-extrabold text-ink text-base">
                          <span>{t.ai.netImpact}:</span>
                          <span className="text-accent">{msg.confirmation.formattedNet}</span>
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
                          variant="accent"
                          size="md"
                          onClick={() => handleConfirmMoneySave(msg.id, msg.confirmation!)}
                          isLoading={savingConfirmation}
                          className="flex-1"
                        >
                          {t.ai.saveToMoney}
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* DIRECT ANSWER + WHAT YOU CAN DO (Section 14) */}
                  {msg.directAnswer && (
                    <Card className="bg-surface-1 border border-hairline p-4 md:p-5 shadow-subtle space-y-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-accent block mb-1">
                          {t.ai.directAnswer}
                        </span>
                        <p className="text-sm md:text-[15px] font-medium text-ink leading-relaxed">
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
                            <span className="font-extrabold text-ink">
                              {formatCurrency(msg.breakdown.netRupees)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 2-4 Practical Steps */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="pt-2 border-t border-hairline-soft">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
                            {t.ai.whatYouCanDo}
                          </span>
                          <ul className="space-y-1 text-xs md:text-sm text-ink list-disc list-inside">
                            {msg.steps.map((st, i) => (
                              <li key={i} className="leading-relaxed">
                                {st}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Official Grounded Sources (Section 20 & 21) */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-hairline-soft">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
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
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-accent" />
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
                      <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                        {t.help.disputeDraftTitle}
                      </span>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap bg-surface-2 p-3 rounded-xl border border-hairline-soft">
                        {msg.draftMessage}
                      </p>
                    </Card>
                  )}

                  {/* PLAIN TEXT OR FALLBACK MESSAGE */}
                  {msg.content && !msg.confirmation && !msg.directAnswer && (
                    <Card className="bg-surface-1 border border-hairline p-3 text-sm text-ink">
                      {msg.content}
                    </Card>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-surface-1 border border-hairline rounded-2xl px-4 py-2.5 text-xs text-ink-muted flex items-center gap-2 shadow-subtle">
                <svg className="animate-spin h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none">
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
