import React, { useState, useEffect, useRef } from 'react';
import { useApp, TabId } from '../../context/AppContext';
import { useToast } from '../../components/ui/Toast';
import { fill, formatPaise } from '../money/moneyUtils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { VoiceInputButton } from '../../components/voice/VoiceInputButton';
import { ReadAloudButton } from '../../components/speech/ReadAloudButton';
import { CopyButton } from '../../components/speech/CopyButton';
import {
  GuidedGrievance,
  type GrievanceDraftResponse,
  type GrievanceGuideResponse,
} from '../grievance/GuidedGrievance';
import type { Language, Translations } from '../../i18n/translations';
import {
  Send,
  Landmark,
  AlertCircle,
  FileText,
  ShieldAlert,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  Trash2,
  Target,
  ChevronRight,
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
  type?: 'text' | 'confirmation' | 'answer' | 'grievance' | 'grievance_guide';
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
  /** Guided complaint state from the server (questions for missing facts, or a draft). */
  grievance?: GrievanceGuideResponse | GrievanceDraftResponse;
  /** The worker's message that started the complaint. */
  grievanceDescription?: string;
  /** Language the message was written in (for read-aloud voice). */
  lang?: Language;
  /** Request failed; `retryText` is the prompt to resend. */
  isError?: boolean;
  retryText?: string;
  createdAt: number;
}

/** Plain-text version of an assistant reply, for read-aloud and copy. */
function speakableText(msg: ChatMessage, t: Translations): string {
  // Complaint cards carry their own Listen/Copy actions for the draft.
  if (msg.type === 'confirmation' || msg.isError || msg.grievance) return '';
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
  onNavigateToTab: (tab: TabId) => void;
  onOpenHelp: (tab: HelpTab) => void;
  initialPrompt?: string;
  /** Changes whenever money was added/removed elsewhere, so today's totals refetch. */
  moneyVersion?: number;
}> = ({ messages, setMessages, onOpenAddEarning, onNavigateToTab, onOpenHelp, initialPrompt, moneyVersion = 0 }) => {
  const { t, profile, dailyGoalPaise, buzz } = useApp();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputMessage, setInputMessage] = useState(initialPrompt || '');
  const [isSending, setIsSending] = useState(false);
  const [todayMoney, setTodayMoney] = useState<TodaySummary | null>(null);
  // Per-card save state so saving one confirmation doesn't spin every card.
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [isListening, setIsListening] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');

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
  }, [moneyVersion]);

  // Composer grows with the text (up to ~6 lines) instead of scrolling inside two rows.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [inputMessage]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [messages, isSending]);

  // A new prompt handed over from Help replaces the draft.
  useEffect(() => {
    if (initialPrompt) setInputMessage(initialPrompt);
  }, [initialPrompt]);


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
        ...(data.type === 'grievance_guide' || data.type === 'grievance'
          ? { grievance: data, grievanceDescription: textToSend }
          : {}),
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

      buzz();
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

  const earnedPaise = Math.round((todayMoney?.earningsRupees ?? 0) * 100);
  const goalLeftPaise = dailyGoalPaise ? Math.max(dailyGoalPaise - earnedPaise, 0) : 0;
  const goalPct = dailyGoalPaise ? Math.min(100, Math.round((earnedPaise * 100) / dailyGoalPaise)) : 0;
  // Hindi copy is Romanized, so the date uses en-IN for it too
  const todayLabel = new Date().toLocaleDateString(profile.language === 'pa' ? 'pa-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const quickActionClass =
    'flex items-center gap-3 p-3 min-h-[64px] rounded-subtle text-left bg-surface-1 border border-hairline hover:border-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const quickIconClass = 'w-10 h-10 rounded-full flex items-center justify-center shrink-0';
  const hasThread = messages.length > 0 || isSending;

  return (
    // Mobile: one column (ask → conversation → today's money → shortcuts).
    // lg+: ask + conversation on the left, money + shortcuts pinned on the right.
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* ASK AREA (Section 10) */}
      <section className="space-y-3 lg:col-start-1 lg:row-start-1 min-w-0">
        <div className="pt-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[0.9375rem] md:text-base text-ink-muted">
            <span className="font-semibold text-ink">{t.home.greeting}</span>
            <span>{todayLabel}</span>
          </p>
          <h1 className="mt-1 text-[1.75rem] md:text-[2.75rem] leading-[1.08] font-extrabold font-wide text-ink text-balance">
            {t.home.questionPrompt}
          </h1>
        </div>

        {/* LARGE CONVERSATIONAL INPUT — STRONGEST ACTION (Section 10) */}
        <div className="rounded-card bg-surface-1 border-[1.5px] border-ink p-3 md:p-4 shadow-[0_12px_32px_rgba(23,33,77,0.10)] focus-within:ring-2 focus-within:ring-ink/20">
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
              ref={inputRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.home.inputPlaceholder}
              className="w-full bg-transparent text-ink placeholder:text-ink-tertiary text-lg md:text-xl leading-snug resize-none focus:outline-none min-h-[3.5rem] md:min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-hairline-soft">
              <span
                className={`text-xs min-w-0 ${isListening ? 'text-accent font-semibold' : 'hidden sm:inline text-ink-tertiary'}`}
              >
                {isListening ? t.voice.listening : t.home.languagesHint}
              </span>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <VoiceInputButton
                  value={inputMessage}
                  onChange={setInputMessage}
                  onListeningChange={setIsListening}
                  controlsId="home-chat-input"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  variant="primary"
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
        </div>

        {/* Example prompts sit right under the composer until the first message */}
        {!hasThread && (
          <div>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted mb-2 px-1">
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              {t.home.emptyChatTitle}. {t.home.emptyChatHint}
            </p>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
              {t.home.examplePrompts.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => {
                    setInputMessage(prompt);
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 max-w-[16rem] md:max-w-none text-left min-h-[44px] text-sm font-medium text-ink bg-surface-1 border border-hairline rounded-subtle px-3.5 py-2 hover:border-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Short announcements only — the thread itself is not a live region (too verbose). */}
      <p role="status" aria-live="polite" className="sr-only">
        {liveStatus}
      </p>

      {/* CONVERSATION THREAD (rendered once there is something to show, so it leaves no gap) */}
      {hasThread && (
      <section className="lg:col-start-1 lg:row-start-2 min-w-0" aria-labelledby="home-conversation-heading">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 id="home-conversation-heading" className="text-sm font-semibold text-ink-muted">
              {t.home.conversation}
            </h2>
            {!isSending && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  showToast(t.me.chatCleared);
                }}
                className="flex items-center gap-1.5 min-h-[40px] px-2.5 rounded-[10px] text-sm font-semibold text-ink-muted hover:text-ink hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                {t.me.clearChat}
              </button>
            )}
          </div>

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
                          <span className="text-sm font-semibold text-ink-muted">
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
                          <span className="text-sm font-semibold text-ink-muted block mb-1.5">
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
                          <span className="text-sm font-semibold text-ink-muted block mb-1.5">
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

                  {/* GUIDED COMPLAINT FROM CHAT: asks for missing facts, then an editable draft */}
                  {msg.grievance && msg.grievanceDescription && (
                    <Card className="bg-surface-1 border border-hairline p-4 md:p-5 shadow-subtle">
                      <GuidedGrievance
                        idPrefix={`chat-${msg.id}`}
                        description={msg.grievanceDescription}
                        initial={msg.grievance}
                      />
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
                    !msg.directAnswer &&
                    !msg.grievance && (
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
      </section>
      )}

      {/* SIDE PANEL: TODAY'S MONEY + SHORTCUTS (Section 10) */}
      <aside className="space-y-6 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-10 min-w-0">
        {/* AAJ KA KHATA: ruled ledger card with a red margin line */}
        <section className="relative overflow-hidden rounded-card border border-hairline bg-surface-1" aria-labelledby="home-khata-title">
          <span className="absolute inset-y-0 left-10 w-0.5 bg-rule" aria-hidden="true" />
          <div className="relative pl-14 pr-4 pt-4 pb-3">
            <h2 id="home-khata-title" className="text-sm font-semibold text-ink-muted">
              {t.home.todaysMoneyTitle}
            </h2>
            {hasMoneyRecords ? (
              <p className="flex items-baseline gap-2 mt-1">
                <span className={`text-[2.75rem] leading-none font-extrabold font-wide tabular-nums ${(todayMoney?.netRupees ?? 0) < 0 ? 'text-semantic-error' : 'text-ink'}`}>
                  {formatCurrency(todayMoney?.netRupees ?? 0)}
                </span>
                <span className="text-sm text-ink-muted">{t.home.netToday}</span>
              </p>
            ) : (
              <p className="text-lg font-semibold text-ink mt-1">{t.home.noMoneyTitle}</p>
            )}

            {dailyGoalPaise ? (
              <div className="mt-3">
                <div
                  role="progressbar"
                  aria-label={t.me.dailyGoal}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={goalPct}
                  className="h-2 rounded-full bg-wash overflow-hidden"
                >
                  <div className="h-full rounded-full bg-marigold transition-[width] duration-500" style={{ width: `${goalPct}%` }} />
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink">
                  <Target className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                  {goalLeftPaise === 0
                    ? t.home.goalReached
                    : fill(t.home.goalProgress, { goal: formatPaise(dailyGoalPaise), left: formatPaise(goalLeftPaise) })}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateToTab('me')}
                className="mt-2 -ml-1 flex items-center gap-1.5 min-h-[40px] px-1 rounded text-sm font-semibold text-accent hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Target className="w-4 h-4" aria-hidden="true" />
                {t.home.setGoal}
              </button>
            )}
          </div>
          {hasMoneyRecords && (
            <dl className="relative ledger-rules border-t border-hairline">
              <div className="flex items-center justify-between h-10 pl-14 pr-4">
                <dt className="text-sm text-ink">{t.home.earned}</dt>
                <dd className="text-base font-bold text-semantic-success tabular-nums">+{formatCurrency(todayMoney?.earningsRupees ?? 0)}</dd>
              </div>
              <div className="flex items-center justify-between h-10 pl-14 pr-4">
                <dt className="text-sm text-ink">{t.home.spent}</dt>
                <dd className="text-base font-bold text-semantic-error tabular-nums">−{formatCurrency(todayMoney?.expensesRupees ?? 0)}</dd>
              </div>
            </dl>
          )}
          <div className="relative flex items-center gap-2 pl-14 pr-3 py-3 border-t border-hairline">
            <Button variant="accent" size="md" onClick={onOpenAddEarning} className="flex-1 whitespace-nowrap">
              {t.home.addMoneyAction}
            </Button>
            <button
              type="button"
              onClick={() => onNavigateToTab('money')}
              aria-label={t.home.viewDetails.replace(/\s*→\s*$/, '')}
              className="flex items-center justify-center w-12 h-12 shrink-0 rounded-subtle border-[1.5px] border-hairline text-ink hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </section>

        <div>
          <h2 className="text-sm font-semibold text-ink-muted mb-2 px-1">{t.home.quickActions}</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpenHelp('schemes')} className={quickActionClass}>
              <span className={`${quickIconClass} bg-accent-light text-accent`}>
                <Landmark className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-[0.9375rem] font-semibold text-ink leading-tight">{t.help.tabSchemes}</span>
            </button>

            <button type="button" onClick={() => onOpenHelp('dispute')} className={quickActionClass}>
              <span className={`${quickIconClass} bg-semantic-error/10 text-semantic-error`}>
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-[0.9375rem] font-semibold text-ink leading-tight">{t.home.shortcuts.paymentMissing}</span>
            </button>

            <button type="button" onClick={() => onOpenHelp('doc')} className={quickActionClass}>
              <span className={`${quickIconClass} bg-wash text-ink`}>
                <FileText className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-[0.9375rem] font-semibold text-ink leading-tight">{t.home.shortcuts.explainDoc}</span>
            </button>

            <button type="button" onClick={() => handleSendMessage(t.home.safetyPrompt)} className={quickActionClass}>
              <span className={`${quickIconClass} bg-semantic-success/10 text-semantic-success`}>
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-[0.9375rem] font-semibold text-ink leading-tight">{t.home.shortcuts.safetyQuestion}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
