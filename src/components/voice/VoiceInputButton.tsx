import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSpeechInput, SpeechInputError } from '../../hooks/useSpeechInput';
import type { Translations } from '../../i18n/translations';

export interface VoiceInputButtonProps {
  /** Current field value. Spoken text is appended to it. */
  value: string;
  /** Receives the field's new value (live while speaking, final when done). */
  onChange: (next: string) => void;
  /** Notified when listening starts/stops (e.g. to show "Listening…" elsewhere). */
  onListeningChange?: (listening: boolean) => void;
  /** Optional id of the field, wired to aria-controls. */
  controlsId?: string;
  /** Where the error bubble opens relative to the button. */
  errorPlacement?: 'top' | 'bottom';
  disabled?: boolean;
  className?: string;
}

const errorText = (t: Translations, e: SpeechInputError): string =>
  ({
    permission: t.voice.errorPermission,
    'no-speech': t.voice.errorNoSpeech,
    'no-mic': t.voice.errorNoMic,
    network: t.voice.errorNetwork,
    generic: t.voice.errorGeneric,
  })[e];

/**
 * Mic toggle that dictates into a text field via the Web Speech API, in the
 * active UI language (hi-IN / pa-IN / en-IN). Renders nothing when the
 * browser has no speech recognition.
 */
export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  value,
  onChange,
  onListeningChange,
  controlsId,
  errorPlacement = 'bottom',
  disabled = false,
  className = '',
}) => {
  const { t, profile } = useApp();
  const baseRef = useRef('');
  const wasListening = useRef(false);

  const { supported, listening, error, toggle, clearError } = useSpeechInput({
    language: profile.language,
    onTranscript: (spoken) => {
      onChange(spoken ? `${baseRef.current}${spoken}` : baseRef.current.trimEnd());
    },
  });

  const [hasListened, setHasListened] = useState(false);

  useEffect(() => {
    if (wasListening.current !== listening) {
      wasListening.current = listening;
      if (listening) setHasListened(true);
      onListeningChange?.(listening);
    }
  }, [listening, onListeningChange]);

  // Auto-hide the error bubble after a while.
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(clearError, 7000);
    return () => window.clearTimeout(id);
  }, [error, clearError]);

  if (!supported) return null;

  const handleClick = () => {
    if (!listening) {
      const trimmed = value.trimEnd();
      baseRef.current = trimmed ? `${trimmed} ` : '';
    }
    toggle();
  };

  const statusText = listening ? t.voice.listening : hasListened ? t.voice.stopped : '';

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={listening}
        // Constant name + aria-pressed: screen readers announce "pressed" while listening.
        aria-label={t.voice.start}
        aria-controls={controlsId}
        title={listening ? t.voice.stop : t.voice.start}
        className={`relative inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${
          listening
            ? 'bg-accent border-accent text-white'
            : 'bg-surface-1 border-hairline text-ink hover:bg-surface-2'
        }`}
      >
        {listening && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full ring-4 ring-accent/30 motion-safe:animate-pulse"
          />
        )}
        {listening ? (
          <MicOff className="w-5 h-5" aria-hidden="true" />
        ) : (
          <Mic className="w-5 h-5" aria-hidden="true" />
        )}
      </button>

      {/* Polite status for screen readers ("Listening…"). */}
      <span role="status" aria-live="polite" className="sr-only">
        {statusText}
      </span>

      {error && (
        <span
          role="alert"
          className={`absolute right-0 z-20 w-60 max-w-[calc(100vw-2rem)] rounded-subtle border border-semantic-error/40 bg-surface-1 px-3 py-2 text-xs font-medium text-semantic-error shadow-float ${
            errorPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {errorText(t, error)}
        </span>
      )}
    </span>
  );
};
