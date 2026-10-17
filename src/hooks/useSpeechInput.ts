import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../i18n/translations';
import { SPEECH_LOCALES } from '../lib/speechLocale';

// Minimal typings for the Web Speech API (not in TS's DOM lib).
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export type SpeechInputError = 'permission' | 'no-speech' | 'no-mic' | 'network' | 'generic';

function mapError(code: string): SpeechInputError | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'no-mic';
    case 'network':
      return 'network';
    case 'aborted':
      return null; // we stopped it ourselves
    default:
      return 'generic';
  }
}

export interface UseSpeechInputOptions {
  language: Language;
  /**
   * Called with the text recognised so far in this session.
   * `isFinal` is true once the browser has committed the words.
   */
  onTranscript: (text: string, isFinal: boolean) => void;
}

/**
 * Speech-to-text via the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * `supported` is false when the browser has no implementation — hide the mic UI then.
 */
export function useSpeechInput({ language, onTranscript }: UseSpeechInputOptions) {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechInputError | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = SPEECH_LOCALES[language];
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += chunk;
        else interim += chunk;
      }
      const combined = (finalText + interim).replace(/\s+/g, ' ').trim();
      onTranscriptRef.current(combined, interim === '');
    };
    recognition.onerror = (event) => {
      const mapped = mapError(event.error);
      if (mapped) setError(mapped);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError('generic');
    }
  }, [language]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  const clearError = useCallback(() => setError(null), []);

  // Never keep the mic open after the component goes away.
  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      r?.abort();
    };
  }, []);

  return { supported, listening, error, start, stop, toggle, clearError };
}
