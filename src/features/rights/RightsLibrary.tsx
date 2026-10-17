import React from 'react';
import { ChevronDown, Info, MessageCircleQuestion } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReadAloudButton } from '../../components/speech/ReadAloudButton';
import { RIGHTS } from '../../content/rights';
import { RIGHT_ICONS, rightSpeech } from '../home/HomeExtras';

/** Help > Your rights: short, listenable topics that hand off to chat for specifics. */
export const RightsLibrary: React.FC<{ onAsk: (prompt: string) => void }> = ({ onAsk }) => {
  const { t, profile } = useApp();
  const lang = profile.language;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold font-wide text-ink">{t.insights.rightsTitle}</h2>
        <p className="text-sm text-ink-muted mt-1">{t.insights.rightsIntro}</p>
      </div>

      <ul className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {RIGHTS.map((topic) => {
          const Icon = RIGHT_ICONS[topic.icon];
          return (
            <li key={topic.id}>
              <details className="group rounded-card bg-surface-1 border border-hairline open:border-ink open:shadow-lift">
                <summary className="flex items-start gap-3 p-4 cursor-pointer list-none rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
                  <span className="w-10 h-10 rounded-full bg-accent-light text-accent flex items-center justify-center shrink-0" aria-hidden="true">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[0.9375rem] font-bold text-ink leading-tight">{topic.title[lang]}</span>
                    <span className="block text-sm text-ink-muted mt-1 leading-snug">{topic.summary[lang]}</span>
                  </span>
                  <ChevronDown className="w-5 h-5 mt-2 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-hairline-soft mx-4 -mt-px">
                  <p className="text-xs font-semibold text-ink-muted mt-3 mb-1.5">{t.insights.keyPoints}</p>
                  <ul className="space-y-1.5">
                    {topic.points.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink leading-snug">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-marigold shrink-0" aria-hidden="true" />
                        <span>{p[lang]}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => onAsk(topic.ask[lang])}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full bg-ink text-inverse text-xs font-semibold hover:bg-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    >
                      <MessageCircleQuestion className="w-4 h-4" aria-hidden="true" />
                      {t.insights.askAbout}
                    </button>
                    <ReadAloudButton text={rightSpeech(topic, lang)} lang={lang} />
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="flex gap-2 text-sm text-ink-muted">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        {t.insights.rightsNote}
      </p>
    </div>
  );
};
