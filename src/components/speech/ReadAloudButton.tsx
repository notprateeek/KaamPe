import React from 'react';
import { Volume2, Square } from 'lucide-react';
import { SPEECH_RATES, useApp } from '../../context/AppContext';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import type { Language } from '../../i18n/translations';

export interface ReadAloudButtonProps {
  /** Plain text to speak. */
  text: string;
  /** Language of the text; defaults to the active UI language. */
  lang?: Language;
  className?: string;
}

export const actionButtonClass =
  'inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full border border-hairline bg-surface-1 text-xs font-semibold text-ink hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

/**
 * Listen / Stop toggle that reads `text` aloud with the browser's built-in
 * speech synthesis (the device's own voices; nothing is sent to a server).
 * Renders nothing without speechSynthesis.
 */
export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({ text, lang, className = '' }) => {
  const { t, profile, speechRate } = useApp();
  const { supported, speaking, failed, voiceMissing, speak, stop } = useSpeechSynthesis(
    lang ?? profile.language,
    SPEECH_RATES[speechRate]
  );

  if (!supported || !text.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (speaking ? stop() : speak(text, lang ?? profile.language))}
        data-no-tap-to-hear
        title={t.speech.listenHint}
        className={`${actionButtonClass} ${speaking ? 'border-accent text-accent' : ''} ${className}`}
      >
        {speaking ? (
          <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Volume2 className="w-4 h-4" aria-hidden="true" />
        )}
        <span>{speaking ? t.speech.stop : t.speech.listen}</span>
      </button>
      {(failed || voiceMissing) && (
        <span role="alert" className="text-xs font-medium text-semantic-error">
          {voiceMissing ? t.speech.voiceUnavailable : t.speech.speakError}
        </span>
      )}
    </>
  );
};
