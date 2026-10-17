import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VoiceInputButton } from '../../components/voice/VoiceInputButton';
import { ReadAloudButton, actionButtonClass } from '../../components/speech/ReadAloudButton';
import { CopyButton } from '../../components/speech/CopyButton';
import { SchemeEligibility } from '../schemes/SchemeEligibility';
import { DocumentQuestion } from '../documents/DocumentQuestion';
import { RightsLibrary } from '../rights/RightsLibrary';
import { SafetyCoach } from '../safety/SafetyCoach';
import { compressImage } from '../../lib/compressImage';
import { GuidedGrievance, type GrievanceGuideResponse } from '../grievance/GuidedGrievance';
import { computePlatformStats, fetchMoneyEntries, fetchMoneySummary, fill, formatPaise } from '../money/moneyUtils';
import {
  FileText,
  AlertCircle,
  Upload,
  Camera,
  AlertTriangle,
  Calendar,
  IndianRupee,
  ArrowRight,
  Landmark,
  PenLine,
  Scale,
  ShieldCheck,
} from 'lucide-react';

interface DocExplanation {
  whatIsThis: string;
  importantPoints: string[];
  money: string[];
  dates: string[];
  cautions: string[];
  readable: boolean;
}

export type HelpTab = 'doc' | 'dispute' | 'schemes' | 'rights' | 'safety';
const TABS: HelpTab[] = ['doc', 'dispute', 'schemes', 'rights', 'safety'];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = /\.(pdf|jpe?g|png|webp)$/i;
const MAX_DISPUTE_CHARS = 1500;
const MAX_CHAT_CHARS = 2000;

/** Primary form card style shared by the Help panels. */
const helpFormCardClass = 'bg-surface-1 border-2 border-ink shadow-offset-sm md:shadow-offset p-5 md:p-6 lg:sticky lg:top-8';

type Evidence =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'ready'; text: string }
  | { status: 'empty' }
  | { status: 'error' };

/** API errors are `{ error: <localized message>, code, ...extra }`. */
const readError = (data: any, fallback: string): string =>
  typeof data?.error === 'string' && data.error.trim() ? data.error : fallback;

export const HelpView: React.FC<{
  initialTab?: HelpTab;
  onNavigateToChatWithPrompt?: (prompt: string) => void;
  /** Optional: notified when the user switches tabs (lets the parent remember the tab). */
  onTabChange?: (tab: HelpTab) => void;
}> = ({ initialTab = 'doc', onNavigateToChatWithPrompt, onTabChange }) => {
  const { t, profile } = useApp();
  const [activeTab, setActiveTab] = useState<HelpTab>(initialTab);
  const tabRefs = useRef<Record<HelpTab, HTMLButtonElement | null>>({ doc: null, dispute: null, schemes: null, rights: null, safety: null });

  // Document state
  const [file, setFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<DocExplanation | null>(null);
  /** Id of the excerpts stored for follow-up questions (absent if nothing could be kept). */
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [docQuestion, setDocQuestion] = useState('');

  // Dispute state
  const [disputeInput, setDisputeInput] = useState('');
  const [isGeneratingDispute, setIsGeneratingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  /** Guided complaint started from the form; `key` restarts it on a new submission. */
  const [guide, setGuide] = useState<{ key: number; description: string; draftContext?: string; initial: GrievanceGuideResponse } | null>(null);
  const [evidence, setEvidence] = useState<Evidence>({ status: 'off' });
  const disputeInputRef = useRef<HTMLTextAreaElement>(null);
  const [focusDisputeInput, setFocusDisputeInput] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // After the document -> complaint handoff, put the cursor at the end of the prefilled facts
  useEffect(() => {
    if (activeTab !== 'dispute' || !focusDisputeInput) return;
    const el = disputeInputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setFocusDisputeInput(false);
  }, [activeTab, focusDisputeInput]);

  const selectTab = (tab: HelpTab, focus = false) => {
    setActiveTab(tab);
    onTabChange?.(tab);
    if (focus) tabRefs.current[tab]?.focus();
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = TABS.indexOf(activeTab);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    selectTab(TABS[next], true);
  };

  // ---------------- Document ----------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!picked) return;
    if (!ALLOWED_MIME.includes(picked.type) && !ALLOWED_EXT.test(picked.name)) {
      setDocError(t.help.docTypeError);
      return;
    }
    // Phone photos are shrunk on the device (≤1600px JPEG): faster on mobile data. PDFs pass through.
    const selected = await compressImage(picked);
    if (selected.size > MAX_FILE_BYTES) {
      setDocError(t.help.docTooLarge);
      return;
    }
    setFile(selected);
    setDocError(null);
    setExplanation(null);
    setDocumentId(null);
  };

  const handleUploadDocument = async () => {
    if (!file) return;
    setIsUploadingDoc(true);
    setDocError(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('language', profile.language);

    try {
      const res = await fetch('/api/document/explain', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.explanation) {
        setDocError(readError(data, res.status === 429 ? t.help.rateLimited : t.help.docUploadFailed));
        return;
      }
      setExplanation(data.explanation);
      setDocumentId(typeof data.documentId === 'string' ? data.documentId : null);
    } catch {
      setDocError(t.help.docUploadFailed);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const explanationText = explanation
    ? [
        `${t.help.docWhatIsThis} ${explanation.whatIsThis}`,
        explanation.importantPoints.length ? `${t.help.docKeyPoints}: ${explanation.importantPoints.join('. ')}` : '',
        explanation.money.length ? `${t.help.docMoney}: ${explanation.money.join('. ')}` : '',
        explanation.dates.length ? `${t.help.docDates}: ${explanation.dates.join('. ')}` : '',
        explanation.cautions.length ? `${t.help.docCautions}: ${explanation.cautions.join('. ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const startComplaintFromDocument = () => {
    if (!explanation) return;
    const money = explanation.money.length ? fill(t.help.docComplaintMoney, { items: explanation.money.join('; ') }) : '';
    const prefill = fill(t.help.docComplaintPrefill, { doc: explanation.whatIsThis, money }).slice(0, MAX_DISPUTE_CHARS);
    setDisputeInput(prefill);
    setDisputeError(null);
    setFocusDisputeInput(true);
    selectTab('dispute');
  };

  const askAboutDocument = () => {
    if (!explanation || !onNavigateToChatWithPrompt) return;
    const base = t.help.docAskPrompt.replace('{doc}', explanation.whatIsThis);
    const q = docQuestion.trim();
    onNavigateToChatWithPrompt(q ? `${base} ${q}` : base);
  };

  // ---------------- Dispute ----------------
  /** Builds a deterministic, paise-exact summary of the last 7 days to attach as evidence. */
  const loadEvidence = async () => {
    setEvidence({ status: 'loading' });
    try {
      const [summary, entries] = await Promise.all([fetchMoneySummary(), fetchMoneyEntries().catch(() => [])]);
      const days = summary.weekly.days;
      if (!days.length || summary.weekly.totalEarningsPaise <= 0) {
        setEvidence({ status: 'empty' });
        return;
      }
      const locale = profile.language === 'pa' ? 'pa-IN' : 'en-IN';
      const fmtDate = (d: string) =>
        new Date(`${d}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
      let text = fill(t.help.evidenceTemplate, {
        from: fmtDate(days[0].date),
        to: fmtDate(days[days.length - 1].date),
        earned: formatPaise(summary.weekly.totalEarningsPaise),
        spent: formatPaise(summary.weekly.totalExpensesPaise),
        net: formatPaise(summary.weekly.netPaise),
        days: days.filter((d) => d.earningsPaise > 0).length,
      });
      const named = computePlatformStats(entries, days.map((d) => d.date)).filter((s) => s.label);
      if (named.length > 0) {
        const list = named
          .map((s) => `${s.label} ${formatPaise(s.earningsPaise)} (${fill(t.money.platformDays, { n: s.activeDays })})`)
          .join(', ');
        text += fill(t.help.evidencePlatforms, { list });
      }
      setEvidence({ status: 'ready', text });
    } catch {
      setEvidence({ status: 'error' });
    }
  };

  const handleEvidenceToggle = (checked: boolean) => {
    if (checked) loadEvidence();
    else setEvidence({ status: 'off' });
  };

  const handleGenerateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    const facts = disputeInput.trim().slice(0, MAX_CHAT_CHARS);
    if (!facts) return;

    setIsGeneratingDispute(true);
    setDisputeError(null);

    try {
      // Facts are read only from the worker's own words; earnings evidence is added when drafting.
      const res = await fetch('/api/ai/grievance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'collect', description: facts, language: profile.language }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.type !== 'grievance_guide') {
        const fallback = res.status === 429 ? t.help.rateLimited : res.status === 400 ? t.help.disputeInvalid : t.common.error;
        setDisputeError(readError(data, fallback));
        return;
      }

      setGuide({
        key: Date.now(),
        description: facts,
        draftContext: evidence.status === 'ready' ? evidence.text : undefined,
        initial: data as GrievanceGuideResponse,
      });
    } catch {
      setDisputeError(t.common.error);
    } finally {
      setIsGeneratingDispute(false);
    }
  };

  const tabMeta: Record<HelpTab, { label: string; icon: React.ElementType }> = {
    doc: { label: t.help.tabExplainDoc, icon: FileText },
    dispute: { label: t.help.tabDispute, icon: AlertCircle },
    schemes: { label: t.help.tabSchemes, icon: Landmark },
    rights: { label: t.insights.rightsTab, icon: Scale },
    safety: { label: t.safetyCoach.tab, icon: ShieldCheck },
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl md:text-5xl leading-none font-extrabold font-wide text-ink">{t.help.title}</h1>
        <p className="text-xs md:text-sm text-ink-muted mt-0.5">{t.help.subtitle}</p>
      </div>

      {/* TABS (WAI-ARIA tabs pattern: roving tabindex, arrow/Home/End keys, automatic activation) */}
      <div
        className="flex gap-1 bg-surface-1 p-1 rounded-2xl sm:rounded-full border border-hairline md:max-w-3xl"
        role="tablist"
        aria-label={t.help.tabListLabel}
        onKeyDown={handleTabKeyDown}
      >
        {TABS.map((tab) => {
          const { label, icon: Icon } = tabMeta[tab];
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              ref={(el) => {
                tabRefs.current[tab] = el;
              }}
              id={`help-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`help-panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab)}
              className={`flex-1 min-w-0 min-h-[44px] px-1.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold leading-tight rounded-xl sm:rounded-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                selected ? 'bg-ink text-inverse' : 'text-ink hover:bg-surface-2'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXPLAIN A DOCUMENT */}
      <div role="tabpanel" id="help-panel-doc" aria-labelledby="help-tab-doc" hidden={activeTab !== 'doc'}>
        {activeTab === 'doc' && (
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 lg:items-start">
            <Card className={helpFormCardClass}>
              <h2 className="text-sm font-bold text-ink mb-1">{t.help.docUploadTitle}</h2>
              <p className="text-xs text-ink-muted mb-4">{t.help.docUploadDesc}</p>

              {/* Visually hidden (but focusable) file input; the styled label is the click target */}
              <div className="relative">
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  aria-describedby="doc-file-hint"
                  className="peer sr-only"
                />
                <label
                  htmlFor="doc-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-hairline rounded-xl p-6 md:p-10 text-center hover:border-accent transition-colors bg-surface-2/50 peer-focus-visible:border-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2"
                >
                  <span className="w-10 h-10 rounded-full bg-accent-light text-accent flex items-center justify-center mb-2" aria-hidden="true">
                    <Upload className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-semibold text-ink break-all">{file ? file.name : t.help.docUploadBtn}</span>
                  <span id="doc-file-hint" className="text-xs text-ink-tertiary mt-0.5">
                    {t.help.docFileHint}
                  </span>
                </label>
              </div>

              {/* Camera capture for phones (desktop browsers fall back to an image picker) */}
              <div className="relative mt-3">
                <input
                  id="doc-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="peer sr-only"
                />
                <label
                  htmlFor="doc-camera-input"
                  className={`${actionButtonClass} w-full justify-center cursor-pointer text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2`}
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>{t.help.docTakePhoto}</span>
                </label>
              </div>

              <p className="sr-only" role="status">
                {file ? fill(t.help.docSelected, { name: file.name }) : ''}
              </p>

              {docError && (
                <p className="text-xs text-semantic-error font-medium mt-2" role="alert">
                  {docError}
                </p>
              )}

              {file && (
                <div className="mt-4 flex gap-2">
                  <Button variant="accent" size="md" fullWidth onClick={handleUploadDocument} isLoading={isUploadingDoc}>
                    {isUploadingDoc ? t.help.docAnalyzing : t.help.tabExplainDoc}
                  </Button>
                </div>
              )}
            </Card>

            {/* DOCUMENT EXPLANATION RESULT (Section 30) */}
            {!explanation && <ResultPlaceholder icon={FileText} text={t.help.resultPlaceholderDoc} />}
            {explanation && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <Card className="bg-surface-1 border border-hairline p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    {t.help.docWhatIsThis}
                  </h3>
                  <p className="text-sm font-medium text-ink leading-relaxed">{explanation.whatIsThis}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ReadAloudButton text={explanationText} />
                    <CopyButton text={explanationText} />
                  </div>
                </Card>

                {explanation.importantPoints.length > 0 && (
                  <Card className="bg-surface-1 border border-hairline p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">{t.help.docKeyPoints}</h3>
                    <ul className="space-y-1.5 text-xs text-ink list-disc list-inside">
                      {explanation.importantPoints.map((pt, i) => (
                        <li key={i} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {explanation.money.length > 0 && (
                  <Card className="bg-surface-1 border border-hairline p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-semantic-success mb-2 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" aria-hidden="true" />
                      {t.help.docMoney}
                    </h3>
                    <ul className="space-y-1 text-xs text-ink font-medium">
                      {explanation.money.map((m, i) => (
                        <li key={i} className="bg-surface-2 px-2.5 py-1.5 rounded-lg border border-hairline-soft">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {explanation.dates.length > 0 && (
                  <Card className="bg-surface-1 border border-hairline p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      {t.help.docDates}
                    </h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {explanation.dates.map((d, i) => (
                        <li key={i} className="text-xs bg-surface-2 text-ink px-2.5 py-1 rounded-md border border-hairline-soft">
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {explanation.cautions.length > 0 && (
                  <Card className="bg-semantic-error/5 border border-semantic-error/20 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-semantic-error mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-semantic-error" aria-hidden="true" />
                      {t.help.docCautions}
                    </h3>
                    <ul className="space-y-1 text-xs text-ink list-disc list-inside">
                      {explanation.cautions.map((c, i) => (
                        <li key={i} className="leading-relaxed">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Document -> complaint handoff */}
                <Card className="bg-surface-1 border border-hairline p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-ink">{t.help.docComplaintTitle}</h3>
                    <p className="text-[11px] text-ink-muted">{t.help.docComplaintHint}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={startComplaintFromDocument} className="gap-1 shrink-0">
                    <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.help.docComplaintBtn}</span>
                  </Button>
                </Card>

                {/* Questions answered from this document, with the supporting excerpt */}
                {documentId && <DocumentQuestion key={documentId} documentId={documentId} />}

                {/* Without stored excerpts, fall back to a general question in KaamPe chat */}
                {!documentId && onNavigateToChatWithPrompt && (
                  <Card className="bg-accent-light border border-accent-subtle p-3.5">
                    <h3 className="text-xs font-bold text-accent">{t.help.docAskKaamPe}</h3>
                    <p className="text-[11px] text-ink-muted mb-2">{t.help.docAskHint}</p>
                    <form
                      className="flex items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        askAboutDocument();
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <Input
                          id="doc-question-input"
                          label={t.help.docQuestionLabel}
                          type="text"
                          maxLength={500}
                          placeholder={t.help.docQuestionPlaceholder}
                          value={docQuestion}
                          onChange={(e) => setDocQuestion(e.target.value)}
                          endAdornment={
                            <VoiceInputButton
                              value={docQuestion}
                              onChange={setDocQuestion}
                              controlsId="doc-question-input"
                              errorPlacement="top"
                            />
                          }
                        />
                      </div>
                      <Button type="submit" variant="accent" size="md" className="gap-1 shrink-0">
                        <span>{t.home.askButton}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                    </form>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB 2: HELP WITH A DISPUTE (Section 32, 33) */}
      <div role="tabpanel" id="help-panel-dispute" aria-labelledby="help-tab-dispute" hidden={activeTab !== 'dispute'}>
        {activeTab === 'dispute' && (
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 lg:items-start">
            <Card className={helpFormCardClass}>
              <h2 id="dispute-input-label" className="text-sm font-bold text-ink mb-1">
                {t.help.disputeTitle}
              </h2>
              <p id="dispute-input-hint" className="text-xs text-ink-muted mb-3">
                {t.help.disputeHint}
              </p>

              <form onSubmit={handleGenerateDispute} className="space-y-3">
                <div className="relative">
                  <textarea
                    id="dispute-input"
                    ref={disputeInputRef}
                    rows={5}
                    maxLength={MAX_DISPUTE_CHARS}
                    placeholder={t.help.disputePlaceholder}
                    aria-labelledby="dispute-input-label"
                    aria-describedby="dispute-input-hint"
                    value={disputeInput}
                    onChange={(e) => setDisputeInput(e.target.value)}
                    className="w-full bg-surface-1 text-ink placeholder:text-ink-tertiary border border-hairline rounded-xl p-3 pr-14 text-base sm:text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                    required
                  />
                  <div className="absolute right-1.5 bottom-2.5">
                    <VoiceInputButton
                      value={disputeInput}
                      onChange={(next) => setDisputeInput(next.slice(0, MAX_DISPUTE_CHARS))}
                      controlsId="dispute-input"
                      errorPlacement="top"
                    />
                  </div>
                </div>

                {/* Optional: attach the last 7 days of earnings as evidence */}
                <div className="rounded-xl border border-hairline-soft bg-surface-2/60 p-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      id="dispute-evidence"
                      type="checkbox"
                      checked={evidence.status !== 'off'}
                      onChange={(e) => handleEvidenceToggle(e.target.checked)}
                      aria-describedby="dispute-evidence-hint"
                      className="mt-0.5 h-5 w-5 shrink-0 accent-ink cursor-pointer"
                    />
                    <div className="min-w-0">
                      <label htmlFor="dispute-evidence" className="text-sm font-medium text-ink cursor-pointer">
                        {t.help.evidenceLabel}
                      </label>
                      <p id="dispute-evidence-hint" className="text-[11px] text-ink-muted">
                        {t.help.evidenceHint}
                      </p>
                    </div>
                  </div>
                  <div aria-live="polite" className="empty:hidden mt-2 text-xs">
                    {evidence.status === 'loading' && <p className="text-ink-muted">{t.help.evidenceLoading}</p>}
                    {evidence.status === 'empty' && <p className="text-ink-muted">{t.help.evidenceEmpty}</p>}
                    {evidence.status === 'error' && <p className="text-semantic-error font-medium">{t.help.evidenceError}</p>}
                    {evidence.status === 'ready' && (
                      <div className="rounded-lg border border-hairline-soft bg-surface-1 p-2.5">
                        <p className="font-semibold text-ink-muted mb-0.5">{t.help.evidencePreviewTitle}</p>
                        <p className="text-ink leading-relaxed">{evidence.text}</p>
                      </div>
                    )}
                  </div>
                </div>

                {disputeError && (
                  <p className="text-xs text-semantic-error font-medium" role="alert">
                    {disputeError}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  fullWidth
                  isLoading={isGeneratingDispute}
                  disabled={evidence.status === 'loading'}
                >
                  {isGeneratingDispute ? t.help.disputeGenerating : t.help.disputeGenerateBtn}
                </Button>
              </form>
            </Card>

            {/* GUIDED COMPLAINT: missing-fact questions, then an editable draft */}
            {!guide && <ResultPlaceholder icon={AlertCircle} text={t.help.resultPlaceholderDispute} />}
            {guide && (
              <div className="animate-in fade-in duration-200">
                <GuidedGrievance
                  key={guide.key}
                  idPrefix="dispute"
                  description={guide.description}
                  draftContext={guide.draftContext}
                  initial={guide.initial}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB 3: SCHEME ELIGIBILITY (kept mounted so answers survive tab switches) */}
      <div role="tabpanel" id="help-panel-schemes" aria-labelledby="help-tab-schemes" hidden={activeTab !== 'schemes'}>
        <SchemeEligibility onAskAboutScheme={onNavigateToChatWithPrompt} />
      </div>

      {/* TAB 4: KNOW YOUR RIGHTS */}
      <div role="tabpanel" id="help-panel-rights" aria-labelledby="help-tab-rights" hidden={activeTab !== 'rights'}>
        {activeTab === 'rights' && <RightsLibrary onAsk={(p) => onNavigateToChatWithPrompt?.(p)} />}
      </div>

      {/* TAB 5: SAFETY COACH */}
      <div role="tabpanel" id="help-panel-safety" aria-labelledby="help-tab-safety" hidden={activeTab !== 'safety'}>
        {activeTab === 'safety' && <SafetyCoach />}
      </div>
    </div>
  );
};

/** Desktop-only empty state for the results column, so the two-column layout isn't half blank. */
const ResultPlaceholder: React.FC<{ icon: React.ElementType; text: string }> = ({ icon: Icon, text }) => (
  <div className="hidden lg:flex flex-col items-center justify-center text-center gap-3 rounded-card border border-dashed border-hairline p-10 min-h-[280px]">
    <div className="w-10 h-10 rounded-full bg-surface-2 text-ink-muted flex items-center justify-center">
      <Icon className="w-5 h-5" aria-hidden="true" />
    </div>
    <p className="text-sm text-ink-muted max-w-xs">{text}</p>
  </div>
);
