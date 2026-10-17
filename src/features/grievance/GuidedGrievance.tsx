import React, { useEffect, useRef, useState } from 'react';
import { Download, PenLine, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VoiceInputButton } from '../../components/voice/VoiceInputButton';
import { ReadAloudButton, actionButtonClass } from '../../components/speech/ReadAloudButton';
import { CopyButton } from '../../components/speech/CopyButton';

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
}

type Turn = { role: 'kaampe' | 'worker'; text: string };

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
}> = ({ description, draftContext, initial, idPrefix }) => {
  const { t, profile } = useApp();
  const [turns, setTurns] = useState<Turn[]>(() =>
    initial.type === 'grievance_guide' && initial.stage === 'questions' ? [{ role: 'kaampe', text: initial.message }] : []
  );
  const [questions, setQuestions] = useState(initial.type === 'grievance_guide' ? initial.questions : []);
  const [facts, setFacts] = useState<GrievanceFacts>(initial.facts ?? {});
  const [unknown, setUnknown] = useState<GrievanceField[]>(initial.type === 'grievance_guide' ? initial.unknown : []);
  const [summary, setSummary] = useState(initial.summary);
  const [draft, setDraft] = useState(initial.type === 'grievance' ? initial.draftMessage : '');
  const [usedFallback, setUsedFallback] = useState(initial.type === 'grievance' ? !!initial.usedFallback : false);
  const [stage, setStage] = useState<'questions' | 'drafting' | 'draft'>(
    initial.type === 'grievance' ? 'draft' : initial.stage === 'questions' ? 'questions' : 'drafting'
  );
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
    try {
      const full = draftContext ? `${description}\n\n${draftContext}` : description;
      const data = (await post({ action: 'draft', description: full, facts: confirmed, unknown: unknownFields })) as GrievanceDraftResponse;
      setSummary(data.summary);
      setDraft(data.draftMessage);
      setFacts(data.facts ?? confirmed);
      setUsedFallback(!!data.usedFallback);
      setStage('draft');
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setStage(draft ? 'draft' : 'questions');
    } finally {
      setBusy(false);
    }
  };

  // Facts were already complete: write the draft straight away.
  useEffect(() => {
    if (initial.type === 'grievance_guide' && initial.stage === 'review') void createDraft(initial.facts, initial.unknown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleDownload = () => {
    const blob = new Blob([draft], { type: 'text/plain;charset=utf-8' });
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
                  turn.role === 'worker' ? 'bg-ink text-white rounded-tr-sm' : 'bg-surface-1 border border-hairline text-ink rounded-tl-sm'
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
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <CopyButton text={draft} label={t.help.copy} copiedLabel={t.help.copied} />
              <ReadAloudButton text={draft} />
              <button type="button" onClick={handleDownload} className={actionButtonClass}>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{t.help.downloadTxt}</span>
              </button>
            </div>
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
    if (cleanAmount && (!AMOUNT_RE.test(cleanAmount) || Number(cleanAmount) <= 0)) {
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
