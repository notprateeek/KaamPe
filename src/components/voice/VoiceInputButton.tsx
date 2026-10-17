import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useVoiceRecorder, MAX_RECORDING_SECONDS, type VoiceRecorderError } from '../../hooks/useVoiceRecorder';
import { useSpeechInput, type SpeechInputError } from '../../hooks/useSpeechInput';
import type { Translations } from '../../i18n/translations';

export interface VoiceInputButtonProps {
  /** Current field value. The transcript is appended to it for the worker to review. */
  value: string;
  /** Receives the field's new value once the recording has been transcribed. */
  onChange: (next: string) => void;
  /** Notified when recording/transcribing starts or stops (e.g. to show status elsewhere). */
  onListeningChange?: (busy: boolean) => void;
  /** Optional id of the field, wired to aria-controls; it is focused after transcription. */
  controlsId?: string;
  /** Where the error / review bubble opens relative to the button. */
  errorPlacement?: 'top' | 'bottom';
  disabled?: boolean;
  className?: string;
}

const errorText = (t: Translations, e: VoiceRecorderError): string =>
  ({
    unsupported: t.voice.errorUnsupported,
    permission: t.voice.errorPermission,
    'no-mic': t.voice.errorNoMic,
    'too-short': t.voice.errorTooShort,
    'too-long': t.voice.errorTooLong,
    network: t.voice.errorNetwork,
    generic: t.voice.errorGeneric,
  })[e];

const speechErrorText = (t: Translations, e: SpeechInputError): string =>
  ({
    permission: t.voice.errorPermission,
    'no-speech': t.voice.errorNoSpeech,
    'no-mic': t.voice.errorNoMic,
    network: t.voice.errorNetwork,
    service: t.voice.errorGeneric,
    generic: t.voice.errorGeneric,
  })[e];

/** Speech-service failures where recording + Gemini transcription can still work. */
const FALLBACK_ERRORS: ReadonlySet<SpeechInputError> = new Set(['network', 'service']);

/**
 * Voice typing with two paths, cheapest first:
 * 1. The browser's speech recognition (Web Speech API): free, shows words live.
 *    In Chrome the audio goes to Google's speech service, not to our server.
 * 2. Fallback when the browser has no speech recognition or its service fails
 *    (blocked, offline, language not offered): record one short message (max
 *    1 minute) and transcribe it with Gemini via /api/ai/transcribe.
 * Either way the text is only put into the field: the worker reviews/edits it
 * and submits it themselves.
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
  const valueRef = useRef(value);
  valueRef.current = value;
  const [reviewHint, setReviewHint] = useState(false);

  const finishTranscript = () => {
    setReviewHint(true);
    if (controlsId) window.setTimeout(() => document.getElementById(controlsId)?.focus(), 0);
  };

  const recorder = useVoiceRecorder({
    language: profile.language,
    onTranscript: (text) => {
      const base = valueRef.current.trimEnd();
      onChange(base ? `${base} ${text}` : text);
      finishTranscript();
    },
  });

  // Browser speech recognition: live text replaces only what this session added.
  const speechBaseRef = useRef('');
  const heardRef = useRef(false);
  const speech = useSpeechInput({
    language: profile.language,
    onTranscript: (text) => {
      heardRef.current = !!text;
      const base = speechBaseRef.current;
      onChange(base && text ? `${base} ${text}` : base || text);
    },
  });
  const [speechFailed, setSpeechFailed] = useState(false);
  const useBrowserSpeech = speech.supported && !speechFailed;

  // Switch to the Gemini recorder for this session if the browser's speech service is unusable.
  const { error: speechError, clearError: clearSpeechError } = speech;
  const startRecorder = recorder.start;
  useEffect(() => {
    if (!speechError || !FALLBACK_ERRORS.has(speechError)) return;
    clearSpeechError();
    setSpeechFailed(true);
    void startRecorder();
  }, [speechError, clearSpeechError, startRecorder]);

  // Browser recognition ended: ask the worker to check what was heard.
  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (wasListeningRef.current && !speech.listening && heardRef.current) finishTranscript();
    wasListeningRef.current = speech.listening;
  }, [speech.listening]);

  const state = speech.listening ? 'recording' : recorder.state;
  const elapsed = recorder.elapsed;
  const toggle = () => {
    if (useBrowserSpeech && recorder.state === 'idle') {
      if (!speech.listening) {
        speechBaseRef.current = valueRef.current.trimEnd();
        heardRef.current = false;
      }
      speech.toggle();
    } else {
      recorder.toggle();
    }
  };
  const clearError = () => {
    recorder.clearError();
    clearSpeechError();
  };

  const busy = state !== 'idle';
  useEffect(() => {
    onListeningChange?.(busy);
  }, [busy, onListeningChange]);

  // Auto-hide bubbles after a while.
  const message =
    recorder.serverMessage ??
    (recorder.error ? errorText(t, recorder.error) : null) ??
    (speechError && !FALLBACK_ERRORS.has(speechError) ? speechErrorText(t, speechError) : null);
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => {
      recorder.clearError();
      clearSpeechError();
    }, 8000);
    return () => window.clearTimeout(id);
  }, [message]);
  useEffect(() => {
    if (!reviewHint) return;
    const id = window.setTimeout(() => setReviewHint(false), 8000);
    return () => window.clearTimeout(id);
  }, [reviewHint]);

  const recording = state === 'recording';
  const statusText = speech.listening
    ? t.voice.listening
    : recording
    ? t.voice.recordingTime.replace('{seconds}', String(elapsed)).replace('{max}', String(MAX_RECORDING_SECONDS))
    : state === 'transcribing'
      ? t.voice.transcribing
      : reviewHint
        ? t.voice.reviewTranscript
        : '';

  const bubblePosition = errorPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => {
          setReviewHint(false);
          toggle();
        }}
        disabled={disabled || state === 'transcribing'}
        aria-pressed={recording}
        // Constant name + aria-pressed: screen readers announce "pressed" while recording.
        aria-label={t.voice.start}
        aria-controls={controlsId}
        aria-busy={state === 'transcribing' || undefined}
        title={recording ? t.voice.stop : t.voice.start}
        className={`relative inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${
          recording ? 'bg-ink border-ink text-white' : 'bg-surface-1 border-hairline text-ink hover:bg-surface-2'
        }`}
      >
        {recording && (
          <span aria-hidden="true" className="absolute inset-0 rounded-full ring-4 ring-accent/30 motion-safe:animate-pulse" />
        )}
        {state === 'transcribing' ? (
          <svg className="motion-safe:animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : recording ? (
          <Square className="w-4 h-4 fill-current" aria-hidden="true" />
        ) : (
          <Mic className="w-5 h-5" aria-hidden="true" />
        )}
      </button>

      {/* Polite status: recording time, transcribing, then "check and edit". */}
      <span role="status" aria-live="polite" className="sr-only">
        {recording ? t.voice.listening : statusText}
      </span>

      {(recording || state === 'transcribing' || reviewHint) && !message && (
        <span
          aria-hidden="true"
          className={`absolute right-0 z-20 w-60 max-w-[calc(100vw-2rem)] rounded-subtle border border-hairline bg-surface-1 px-3 py-2 text-xs font-medium text-ink shadow-float ${bubblePosition}`}
        >
          {statusText}
        </span>
      )}

      {message && (
        <span
          role="alert"
          className={`absolute right-0 z-20 w-60 max-w-[calc(100vw-2rem)] rounded-subtle border border-semantic-error/40 bg-surface-1 px-3 py-2 text-xs font-medium text-semantic-error shadow-float ${bubblePosition}`}
        >
          {message}
        </span>
      )}
    </span>
  );
};
