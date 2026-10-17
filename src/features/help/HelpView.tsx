import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, AlertCircle, Upload, Check, Copy, AlertTriangle, Calendar, IndianRupee, ArrowRight } from 'lucide-react';

interface DocExplanation {
  whatIsThis: string;
  importantPoints: string[];
  money: string[];
  dates: string[];
  cautions: string[];
  readable: boolean;
}

export type HelpTab = 'doc' | 'dispute';

export const HelpView: React.FC<{
  initialTab?: HelpTab;
  onNavigateToChatWithPrompt?: (prompt: string) => void;
}> = ({ initialTab = 'doc', onNavigateToChatWithPrompt }) => {
  const { t, profile } = useApp();
  const [activeTab, setActiveTab] = useState<HelpTab>(initialTab);

  // Document state
  const [file, setFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<DocExplanation | null>(null);
  const [docFollowup, setDocFollowup] = useState('');

  // Dispute state
  const [disputeInput, setDisputeInput] = useState('');
  const [isGeneratingDispute, setIsGeneratingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSummary, setDisputeSummary] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        setDocError('File size exceeds 10MB limit.');
        return;
      }
      setFile(selected);
      setDocError(null);
      setExplanation(null);
    }
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze document');
      }

      setExplanation(data.explanation);
    } catch (err: any) {
      setDocError(err.message || 'Error uploading document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleGenerateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeInput.trim()) return;

    setIsGeneratingDispute(true);
    setDisputeError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: disputeInput,
          language: profile.language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate dispute draft');
      }

      setDisputeSummary(data.summary || 'Payment issue reported');
      setDraftMessage(data.draftMessage || '');
    } catch (err: any) {
      setDisputeError(err.message || 'Error drafting message');
    } finally {
      setIsGeneratingDispute(false);
    }
  };

  const handleCopyDraft = async () => {
    if (!draftMessage) return;
    try {
      await navigator.clipboard.writeText(draftMessage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleDownloadTxt = () => {
    if (!draftMessage) return;
    const blob = new Blob([draftMessage], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KaamPe_Grievance_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold tracking-tight text-ink">{t.help.title}</h1>
        <p className="text-xs md:text-sm text-ink-muted mt-0.5">{t.help.subtitle}</p>
      </div>

      {/* 2 PRIMARY TABS (Section 28: Exactly two primary actions) */}
      <div className="flex bg-surface-2 p-1 rounded-xl border border-hairline-soft md:max-w-lg" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'doc'}
          onClick={() => setActiveTab('doc')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            activeTab === 'doc'
              ? 'bg-surface-1 text-ink shadow-subtle'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t.help.tabExplainDoc}</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'dispute'}
          onClick={() => setActiveTab('dispute')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            activeTab === 'dispute'
              ? 'bg-surface-1 text-ink shadow-subtle'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>{t.help.tabDispute}</span>
        </button>
      </div>

      {/* TAB 1: EXPLAIN A DOCUMENT */}
      {activeTab === 'doc' && (
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="bg-surface-1 border border-hairline p-5 lg:sticky lg:top-8">
            <h2 className="text-sm font-bold text-ink mb-1">{t.help.docUploadTitle}</h2>
            <p className="text-xs text-ink-muted mb-4">{t.help.docUploadDesc}</p>

            <div className="border-2 border-dashed border-hairline rounded-xl p-6 md:p-10 text-center hover:border-accent transition-colors bg-surface-2/50">
              <input
                id="doc-file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="doc-file-input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full bg-accent-light text-accent flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-ink">
                  {file ? file.name : t.help.docUploadBtn}
                </span>
                <span className="text-xs text-ink-tertiary mt-0.5">
                  PDF, JPG, PNG (Max 10MB)
                </span>
              </label>
            </div>

            {docError && (
              <p className="text-xs text-semantic-error font-medium mt-2" role="alert">
                {docError}
              </p>
            )}

            {file && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="accent"
                  size="md"
                  fullWidth
                  onClick={handleUploadDocument}
                  isLoading={isUploadingDoc}
                >
                  {isUploadingDoc ? t.help.docAnalyzing : t.help.tabExplainDoc}
                </Button>
              </div>
            )}
          </Card>

          {/* DOCUMENT EXPLANATION RESULT (Section 30) */}
          {!explanation && <ResultPlaceholder icon={FileText} text={t.help.resultPlaceholderDoc} />}
          {explanation && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Yeh document kya hai? */}
              <Card className="bg-surface-1 border border-hairline p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  {t.help.docWhatIsThis}
                </h3>
                <p className="text-sm font-medium text-ink leading-relaxed">
                  {explanation.whatIsThis}
                </p>
              </Card>

              {/* Important baatein */}
              {explanation.importantPoints.length > 0 && (
                <Card className="bg-surface-1 border border-hairline p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
                    {t.help.docKeyPoints}
                  </h3>
                  <ul className="space-y-1.5 text-xs text-ink list-disc list-inside">
                    {explanation.importantPoints.map((pt, i) => (
                      <li key={i} className="leading-relaxed">
                        {pt}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Paisa */}
              {explanation.money.length > 0 && (
                <Card className="bg-surface-1 border border-hairline p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-semantic-success mb-2 flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
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

              {/* Important dates */}
              {explanation.dates.length > 0 && (
                <Card className="bg-surface-1 border border-hairline p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {t.help.docDates}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {explanation.dates.map((d, i) => (
                      <span key={i} className="text-xs bg-surface-2 text-ink px-2.5 py-1 rounded-md border border-hairline-soft">
                        {d}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Dhyan dene wali baat */}
              {explanation.cautions.length > 0 && (
                <Card className="bg-semantic-error/5 border border-semantic-error/20 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-semantic-error mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-semantic-error" />
                    {t.help.docCautions}
                  </h3>
                  <ul className="space-y-1 text-xs text-ink">
                    {explanation.cautions.map((c, i) => (
                      <li key={i} className="leading-relaxed">
                        • {c}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Follow-up with KaamPe */}
              {onNavigateToChatWithPrompt && (
                <Card className="bg-accent-light border border-accent-subtle p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-accent">
                      {t.help.docAskKaamPe}
                    </div>
                    <div className="text-[11px] text-ink-muted">{t.help.docAskHint}</div>
                  </div>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() =>
                      onNavigateToChatWithPrompt(t.help.docAskPrompt.replace('{doc}', explanation.whatIsThis))
                    }
                    className="flex items-center gap-1 shrink-0"
                  >
                    <span>{t.home.askButton}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HELP WITH A DISPUTE (Section 32, 33) */}
      {activeTab === 'dispute' && (
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="bg-surface-1 border border-hairline p-5 lg:sticky lg:top-8">
            <h2 className="text-sm font-bold text-ink mb-1">{t.help.disputeTitle}</h2>
            <p className="text-xs text-ink-muted mb-3">{t.help.disputeHint}</p>

            <form onSubmit={handleGenerateDispute} className="space-y-3">
              <textarea
                rows={4}
                placeholder={t.help.disputePlaceholder}
                aria-label={t.help.disputeTitle}
                value={disputeInput}
                onChange={(e) => setDisputeInput(e.target.value)}
                className="w-full bg-surface-1 text-ink placeholder:text-ink-tertiary border border-hairline rounded-xl p-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                required
              />

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
              >
                {isGeneratingDispute ? t.help.disputeGenerating : t.help.disputeGenerateBtn}
              </Button>
            </form>
          </Card>

          {/* DRAFT RESULT */}
          {!draftMessage && <ResultPlaceholder icon={AlertCircle} text={t.help.resultPlaceholderDispute} />}
          {draftMessage && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Samasya */}
              {disputeSummary && (
                <Card className="bg-surface-2 border border-hairline-soft p-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-1">
                    {t.help.disputeProblemTitle}
                  </span>
                  <p className="text-xs font-semibold text-ink">
                    {disputeSummary}
                  </p>
                </Card>
              )}

              {/* Draft Message (Editable) */}
              <Card className="bg-surface-1 border border-hairline p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                  <label htmlFor="dispute-draft" className="text-xs font-bold uppercase tracking-wider text-accent">
                    {t.help.disputeDraftTitle}
                  </label>
                  <span className="text-[11px] text-ink-muted">({t.help.draftEditable})</span>
                </div>

                <textarea
                  id="dispute-draft"
                  rows={7}
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  className="w-full bg-surface-2 text-ink border border-hairline-soft rounded-xl p-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent leading-relaxed"
                />

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCopyDraft}
                    className="flex-1 flex items-center justify-center gap-1.5"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-semantic-success" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? t.help.copied : t.help.copy}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleDownloadTxt}
                    className="text-xs"
                  >
                    .txt
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
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
