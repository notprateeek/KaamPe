import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, PenLine, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VoiceInputButton } from '../../components/voice/VoiceInputButton';
import { ReadAloudButton, actionButtonClass } from '../../components/speech/ReadAloudButton';
import { CopyButton } from '../../components/speech/CopyButton';
import { safeGetItem, safeSetItem } from '../../lib/storage';
import { MAX_AMOUNT_RUPEES, MAX_GRIEVANCE_CONTEXT_CHARS, MAX_GRIEVANCE_DESCRIPTION_CHARS } from '../../../shared/grievance';

const NAME_KEY = 'kaampe_letter_name';

/** Adds the worker's name as the sign-off, if they gave one. */
export function withSignature(text: string, name: string): string {
  const clean = name.replace(/\s+/g, ' ').trim();
  return clean ? `${text.trimEnd()}\n\n${clean}` : text;
}

export type GrievanceField = 'amount' | 'duration';
type DurationUnit = 'days' | 'weeks' | 'months';

export interface GrievanceFacts {
  amount?: number;
  days?: number;
  weeks?: number;
  months?: number;
  platform?: string;
}

/** `/api/ai/grievance` collect response (also returned by chat for a grievance with missing facts). */
export interface GrievanceGuideResponse {
  type: 'grievance_guide';
  stage: 'questions' | 'review';
  issue: string;
  description: string;
  facts: GrievanceFacts;
  unknown: GrievanceField[];
  questions: Array<{ field: GrievanceField; text: string }>;
  message: string;
  summary: string;
  notUnderstood?: boolean;
}

/** `/api/ai/grievance` draft response (also returned by chat when all facts were given). */
export interface GrievanceDraftResponse {
  type: 'grievance';
  summary: string;
  draftMessage: string;
  facts?: GrievanceFacts;
  usedFallback?: boolean;
  /** Fact-only English version of a hi/pa draft. */
  englishDraft?: string;
}

type Turn = { role: 'kaampe' | 'worker'; text: string };
type Stage = 'questions' | 'drafting' | 'draft' | 'draft_failed';
type DraftRequest = { facts: GrievanceFacts; unknown: GrievanceField[] };

/** Everything the worker has done so far, so the card can be restored after it unmounts (e.g. a tab switch). */
export interface GrievanceSnapshot {
  turns: Turn[];
  questions: Array<{ field: GrievanceField; text: string }>;
  facts: GrievanceFacts;
  unknown: GrievanceField[];
  summary: string;
  draft: string;
  usedFallback: boolean;
  englishDraft: string;
  stage: Stage;
  /** The last draft request, kept for Retry and to resume a draft interrupted by unmounting. */
  pending: DraftRequest | null;
}

const MAX_ANSWER_CHARS = 500;
const AMOUNT_RE = /^\d{1,8}(\.\d{1,2})?$/;

function durationOf(facts: GrievanceFacts): { value: number; unit: DurationUnit } | null {
  if (typeof facts.days === 'number') return { value: facts.days, unit: 'days' };
  if (typeof facts.weeks === 'number') return { value: facts.weeks, unit: 'weeks' };
  if (typeof facts.months === 'number') return { value: facts.months, unit: 'months' };
  return null;
}

/**
 * Guided complaint: asks only for missing facts (with "I don't know"),
 * then shows the facts and an editable draft. Facts can be corrected and the
 * draft regenerated. Nothing is ever sent: the worker copies it themselves.
 */
export const GuidedGrievance: React.FC<{
  /** The worker's own description of the problem (used to read facts). */
  description: string;
  /** Extra worker-approved context added only when drafting (e.g. earnings evidence). */
  draftContext?: string;
  initial: GrievanceGuideResponse | GrievanceDraftResponse;
  /** Unique prefix for element ids. */
  idPrefix: string;
  /** Saved progress from an earlier mount; takes precedence over `initial`. */
  snapshot?: GrievanceSnapshot;
  /** Called whenever progress changes, so the parent can keep it across unmounts. */
  onSnapshot?: (snapshot: GrievanceSnapshot) => void;
}> = ({ description, draftContext, initial, idPrefix, snapshot, onSnapshot }) => {
  const { t, profile } = useApp();
  const [turns, setTurns] = useState<Turn[]>(() =>
    snapshot
      ? snapshot.turns
      : initial.type === 'grievance_guide' && initial.stage === 'questions'
        ? [{ role: 'kaampe', text: initial.message }]
        : []
  );
  const [questions, setQuestions] = useState(snapshot?.questions ?? (initial.type === 'grievance_guide' ? initial.questions : []));
  const [facts, setFacts] = useState<GrievanceFacts>(snapshot?.facts ?? initial.facts ?? {});
  const [unknown, setUnknown] = useState<GrievanceField[]>(snapshot?.unknown ?? (initial.type === 'grievance_guide' ? initial.unknown : []));
  const [summary, setSummary] = useState(snapshot?.summary ?? initial.summary);
  const [draft, setDraft] = useState(snapshot?.draft ?? (initial.type === 'grievance' ? initial.draftMessage : ''));
  const [usedFallback, setUsedFallback] = useState(snapshot?.usedFallback ?? (initial.type === 'grievance' ? !!initial.usedFallback : false));
  const [englishDraft, setEnglishDraft] = useState(snapshot?.englishDraft ?? (initial.type === 'grievance' ? initial.englishDraft ?? '' : ''));
  const [name, setName] = useState(() => safeGetItem(NAME_KEY) ?? '');
  const [stage, setStage] = useState<Stage>(
    snapshot?.stage ?? (initial.type === 'grievance' ? 'draft' : initial.stage === 'questions' ? 'questions' : 'drafting')
  );
  const [pending, setPending] = useState<DraftRequest | null>(snapshot?.pending ?? null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const answerRef = useRef<HTMLInputElement>(null);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/ai/grievance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ language: profile.language, ...body }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) throw new Error(typeof data?.error === 'string' ? data.error : t.common.error);
    return data;
  };

  const createDraft = async (confirmed: GrievanceFacts, unknownFields: GrievanceField[]) => {
    setBusy(true);
    setError(null);
    setStage('drafting');
    setPending({ facts: confirmed, unknown: unknownFields });
    try {
      // Evidence goes in its own field so it never pushes the description past the server limit.
      const context = draftContext?.trim().slice(0, MAX_GRIEVANCE_CONTEXT_CHARS);
      const data = (await post({
        action: 'draft',
        description: description.slice(0, MAX_GRIEVANCE_DESCRIPTION_CHARS),
        ...(context ? { context } : {}),
        facts: confirmed,
        unknown: unknownFields,
      })) as GrievanceDraftResponse;
      setSummary(data.summary);
      setDraft(data.draftMessage);
      setFacts(data.facts ?? confirmed);
      setUsedFallback(!!data.usedFallback);
      setEnglishDraft(data.englishDraft ?? '');
      setStage('draft');
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      // With no earlier draft to fall back to, offer a retry instead of an empty card.
      setStage(draft ? 'draft' : 'draft_failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Restored mid-draft: the earlier request's reply was lost on unmount, so ask again.
    if (snapshot) {
      if (snapshot.stage === 'drafting' && snapshot.pending) void createDraft(snapshot.pending.facts, snapshot.pending.unknown);
      return;
    }
    // Facts were already complete: write the draft straight away.
    if (initial.type === 'grievance_guide' && initial.stage === 'review') void createDraft(initial.facts, initial.unknown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  useEffect(() => {
    onSnapshotRef.current?.({ turns, questions, facts, unknown, summary, draft, usedFallback, englishDraft, stage, pending });
  }, [turns, questions, facts, unknown, summary, draft, usedFallback, englishDraft, stage, pending]);

  const sendAnswer = async (dontKnow: boolean) => {
    const text = dontKnow ? t.grievance.dontKnow : answer.trim();
    if (!text || busy) return;
    setTurns((prev) => [...prev, { role: 'worker', text }]);
    setAnswer('');
    setBusy(true);
    setError(null);
    try {
      const data = (await post({
        action: 'collect',
        description,
        facts,
        unknown,
        answer: dontKnow ? '' : text,
        dontKnow,
        asked: questions.map((q) => q.field),
      })) as GrievanceGuideResponse;
      setFacts(data.facts);
      setUnknown(data.unknown);
      setQuestions(data.questions);
      setSummary(data.summary);
      if (data.stage === 'questions') {
        setTurns((prev) => [...prev, { role: 'kaampe', text: data.message }]);
        setBusy(false);
        answerRef.current?.focus();
        return;
      }
      setTurns((prev) => [...prev, { role: 'kaampe', text: `${data.message}\n${data.summary}` }]);
      setBusy(false);
      await createDraft(data.facts, data.unknown);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  };

  const signed = withSignature(draft, name);
  const signedEnglish = englishDraft ? withSignature(englishDraft, name) : '';

  const handleDownload = () => {
    const text = signedEnglish ? `${signed}\n\n---\n\n${signedEnglish}` : signed;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KaamPe_Grievance_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-3">
      {/* Short conversation: KaamPe's questions and the worker's answers */}
      {turns.length > 0 && (
        <ol className="space-y-2" aria-label={t.grievance.reviewTitle}>
          {turns.map((turn, i) => (
            <li key={i} className={`flex ${turn.role === 'worker' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                  turn.role === 'worker' ? 'bg-ink text-inverse rounded-tr-sm' : 'bg-surface-1 border border-hairline text-ink rounded-tl-sm'
                }`}
              >
                <span className="sr-only">{turn.role === 'worker' ? t.grievance.you : t.grievance.kaampe}: </span>
                {turn.text}
              </div>
            </li>
          ))}
        </ol>
      )}

      {stage === 'questions' && questions.length > 0 && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendAnswer(false);
          }}
        >
          <Input
            ref={answerRef}
            id={`${idPrefix}-answer`}
            label={t.grievance.answerLabel}
            placeholder={t.grievance.answerPlaceholder}
            maxLength={MAX_ANSWER_CHARS}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={busy}
            endAdornment={
              <VoiceInputButton
                value={answer}
                onChange={(next) => setAnswer(next.slice(0, MAX_ANSWER_CHARS))}
                controlsId={`${idPrefix}-answer`}
                errorPlacement="top"
                disabled={busy}
              />
            }
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={!answer.trim()} className="flex-1 gap-1.5">
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.grievance.send}</span>
            </Button>
            <Button type="button" variant="secondary" size="md" disabled={busy} onClick={() => void sendAnswer(true)} className="flex-1">
              {t.grievance.dontKnow}
            </Button>
          </div>
        </form>
      )}

      {stage === 'drafting' && (
        <p role="status" className="text-sm text-ink-muted flex items-center gap-2">
          <svg className="motion-safe:animate-spin h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {t.grievance.creating}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-semantic-error">
          {error}
        </p>
      )}

      {stage === 'draft_failed' && pending && (
        <Button type="button" variant="secondary" size="md" onClick={() => void createDraft(pending.facts, pending.unknown)}>
          {t.common.retry}
        </Button>
      )}

      {stage === 'draft' && (
        <>
          <Card className="bg-surface-2 border border-hairline-soft p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">{t.help.disputeProblemTitle}</h3>
                <p className="text-sm font-semibold text-ink">{summary}</p>
              </div>
              {!editing && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 shrink-0">
                  <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.grievance.changeDetails}</span>
                </Button>
              )}
            </div>
            {editing && (
              <FactsEditor
                idPrefix={idPrefix}
                facts={facts}
                busy={busy}
                onSubmit={(next, nextUnknown) => void createDraft(next, nextUnknown)}
                onCancel={() => setEditing(false)}
              />
            )}
          </Card>

          <Card className="bg-surface-1 border border-hairline p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
              <label htmlFor={`${idPrefix}-draft`} className="text-xs font-bold uppercase tracking-wider text-accent">
                {t.help.disputeDraftTitle}
              </label>
              <span id={`${idPrefix}-draft-hint`} className="text-[11px] text-ink-muted">
                ({t.help.draftEditable})
              </span>
            </div>
            <textarea
              id={`${idPrefix}-draft`}
              rows={8}
              value={draft}
              aria-describedby={`${idPrefix}-draft-hint ${idPrefix}-draft-note`}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full bg-surface-2 text-ink border border-hairline-soft rounded-xl p-3 text-base sm:text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent leading-relaxed"
            />
            <p id={`${idPrefix}-draft-note`} className="mt-2 text-[11px] text-ink-muted">
              {t.grievance.notSent}
              {usedFallback ? ` ${t.grievance.fallbackNote}` : ''}
            </p>
            <div className="mt-3">
              <Input
                id={`${idPrefix}-name`}
                label={t.letter.nameLabel}
                helperText={t.letter.nameHint}
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  safeSetItem(NAME_KEY, e.target.value.trim());
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <CopyButton text={signed} label={t.help.copy} copiedLabel={t.help.copied} />
              <ReadAloudButton text={signed} />
              <button type="button" onClick={handleDownload} className={actionButtonClass}>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{t.help.downloadTxt}</span>
              </button>
            </div>

            {signedEnglish && (
              <details className="mt-4 rounded-xl border border-hairline-soft bg-surface-2 group">
                <summary className="cursor-pointer list-none min-h-[44px] flex items-center justify-between gap-2 px-3 text-sm font-semibold text-ink rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {t.letter.englishTitle}
                  <ChevronDown className="w-4 h-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-[11px] text-ink-muted">{t.letter.englishHint}</p>
                  <p lang="en" className="text-sm text-ink leading-relaxed whitespace-pre-line">{signedEnglish}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton text={signedEnglish} label={t.help.copy} copiedLabel={t.help.copied} />
                    <ReadAloudButton text={signedEnglish} lang="en" />
                  </div>
                </div>
              </details>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

/** Lets the worker correct collected facts; blank means "not known". */
const FactsEditor: React.FC<{
  idPrefix: string;
  facts: GrievanceFacts;
  busy: boolean;
  onSubmit: (facts: GrievanceFacts, unknown: GrievanceField[]) => void;
  onCancel: () => void;
}> = ({ idPrefix, facts, busy, onSubmit, onCancel }) => {
  const { t } = useApp();
  const initialDuration = durationOf(facts);
  const [amount, setAmount] = useState(typeof facts.amount === 'number' ? String(facts.amount) : '');
  const [durationValue, setDurationValue] = useState(initialDuration ? String(initialDuration.value) : '');
  const [unit, setUnit] = useState<DurationUnit>(initialDuration?.unit ?? 'days');
  const [platform, setPlatform] = useState(facts.platform ?? '');
  const [amountError, setAmountError] = useState<string | undefined>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = amount.trim().replace(/,/g, '');
    if (cleanAmount && (!AMOUNT_RE.test(cleanAmount) || Number(cleanAmount) <= 0 || Number(cleanAmount) > MAX_AMOUNT_RUPEES)) {
      setAmountError(t.grievance.invalidAmount);
      return;
    }
    setAmountError(undefined);
    const next: GrievanceFacts = {};
    const unknownFields: GrievanceField[] = [];
    // Kept exactly as typed: the number is only parsed, never rounded or converted.
    if (cleanAmount) next.amount = Number(cleanAmount);
    else unknownFields.push('amount');
    const d = Number(durationValue);
    if (durationValue.trim() && Number.isInteger(d) && d >= 1 && d <= 3650) next[unit] = d;
    else unknownFields.push('duration');
    if (platform.trim()) next.platform = platform.trim().slice(0, 60);
    onSubmit(next, unknownFields);
  };

  return (
    <form onSubmit={submit} className="space-y-3 pt-2 border-t border-hairline-soft">
      <h4 className="text-xs font-bold text-ink">{t.grievance.reviewTitle}</h4>
      <Input
        id={`${idPrefix}-amount`}
        label={t.grievance.amount}
        inputMode="decimal"
        placeholder={t.grievance.notKnown}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={amountError}
      />
      <div>
        <label htmlFor={`${idPrefix}-duration`} className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
          {t.grievance.duration}
        </label>
        <div className="flex gap-2">
          <input
            id={`${idPrefix}-duration`}
            inputMode="numeric"
            placeholder={t.grievance.notKnown}
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            className="w-full min-h-[44px] bg-surface-1 text-ink placeholder:text-ink-tertiary border border-hairline rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent"
          />
          <select
            aria-label={t.grievance.duration}
            value={unit}
            onChange={(e) => setUnit(e.target.value as DurationUnit)}
            className="min-h-[44px] bg-surface-1 text-ink border border-hairline rounded-xl px-3 text-base sm:text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent"
          >
            <option value="days">{t.grievance.days}</option>
            <option value="weeks">{t.grievance.weeks}</option>
            <option value="months">{t.grievance.months}</option>
          </select>
        </div>
      </div>
      <Input
        id={`${idPrefix}-platform`}
        label={t.grievance.platform}
        helperText={t.grievance.platformHint}
        maxLength={60}
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="md" isLoading={busy} className="flex-1">
          {t.grievance.createDraft}
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={busy}>
          {t.ai.cancel}
        </Button>
      </div>
    </form>
  );
};
