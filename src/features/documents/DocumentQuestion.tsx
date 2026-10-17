import React, { useState } from 'react';
import { ArrowRight, Quote } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VoiceInputButton } from '../../components/voice/VoiceInputButton';
import { ReadAloudButton } from '../../components/speech/ReadAloudButton';
import { fill } from '../money/moneyUtils';
import type { Language } from '../../i18n/translations';

interface DocumentAnswer {
  id: number;
  question: string;
  found: boolean;
  answer: string;
  evidence: Array<{ excerpt: string; page: number | null }>;
  lang: Language;
}

const MAX_QUESTION_CHARS = 500;

/**
 * Follow-up questions about an explained document. Answers come from the
 * excerpts stored for this guest session, with the supporting line(s) shown;
 * page numbers appear only when the server could verify them.
 */
export const DocumentQuestion: React.FC<{ documentId: string }> = ({ documentId }) => {
  const { t, profile } = useApp();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<DocumentAnswer[]>([]);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/document/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ documentId, question: q, language: profile.language }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.answer !== 'string') {
        setError(typeof data?.error === 'string' && data.error ? data.error : t.common.error);
        return;
      }
      setAnswers((prev) => [
        { id: Date.now(), question: q, found: !!data.found, answer: data.answer, evidence: data.evidence ?? [], lang: profile.language },
        ...prev,
      ]);
      setQuestion('');
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-accent-light border border-accent-subtle p-3.5 space-y-3">
      <div>
        <h3 className="text-xs font-bold text-accent">{t.docQa.title}</h3>
        <p className="text-[11px] text-ink-muted">{t.docQa.hint}</p>
      </div>
      <form className="flex items-end gap-2" onSubmit={ask}>
        <div className="flex-1 min-w-0">
          <Input
            id="doc-question-input"
            label={t.help.docQuestionLabel}
            type="text"
            maxLength={MAX_QUESTION_CHARS}
            placeholder={t.docQa.placeholder}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            endAdornment={
              <VoiceInputButton
                value={question}
                onChange={(next) => setQuestion(next.slice(0, MAX_QUESTION_CHARS))}
                controlsId="doc-question-input"
                errorPlacement="top"
                disabled={busy}
              />
            }
          />
        </div>
        <Button type="submit" variant="accent" size="md" isLoading={busy} disabled={!question.trim()} className="gap-1 shrink-0">
          <span>{t.docQa.ask}</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </form>

      <p role="status" className="sr-only">
        {busy ? t.docQa.asking : ''}
      </p>
      {error && (
        <p role="alert" className="text-xs font-medium text-semantic-error">
          {error}
        </p>
      )}

      {answers.map((a) => (
        <div key={a.id} className="rounded-xl border border-hairline bg-surface-1 p-3 space-y-2">
          <p className="text-xs font-semibold text-ink-muted">{a.question}</p>
          <div>
            <span className={`text-[0.6875rem] font-bold uppercase tracking-wider block mb-0.5 ${a.found ? 'text-accent' : 'text-ink-muted'}`}>
              {a.found ? t.docQa.answer : t.docQa.notFound}
            </span>
            <p className="text-sm font-medium text-ink leading-relaxed">{a.answer}</p>
          </div>
          {a.evidence.length > 0 && (
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted block mb-1">{t.docQa.evidence}</span>
              <ul className="space-y-1.5">
                {a.evidence.map((ev, i) => (
                  <li key={i} className="flex gap-2 rounded-lg border border-hairline-soft bg-surface-2 p-2 text-xs text-ink">
                    <Quote className="w-3.5 h-3.5 shrink-0 text-ink-muted mt-0.5" aria-hidden="true" />
                    <span className="min-w-0">
                      <q className="leading-relaxed">{ev.excerpt}</q>
                      {ev.page !== null && <span className="block text-ink-muted mt-0.5">{fill(t.docQa.page, { page: ev.page })}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ReadAloudButton text={[a.answer, ...a.evidence.map((ev) => ev.excerpt)].join('\n')} lang={a.lang} />
        </div>
      ))}
    </Card>
  );
};
