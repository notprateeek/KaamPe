import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../i18n/translations';

export const MAX_RECORDING_SECONDS = 60;
const MIN_RECORDING_MS = 800;
/** Matches the server's limit for /api/ai/transcribe. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type VoiceRecorderError =
  | 'unsupported'
  | 'permission'
  | 'no-mic'
  | 'too-short'
  | 'too-long'
  | 'network'
  | 'generic';

export type VoiceRecorderState = 'idle' | 'recording' | 'transcribing';

/** Container types to try, best first; the server accepts all of these. */
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];

export function isVoiceRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext !== false &&
    typeof window.MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function pickMimeType(): string | undefined {
  const isSupported = window.MediaRecorder?.isTypeSupported?.bind(window.MediaRecorder);
  return isSupported ? PREFERRED_TYPES.find((t) => isSupported(t)) : undefined;
}

function mapStartError(err: unknown): VoiceRecorderError {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission';
  if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') return 'no-mic';
  return 'generic';
}

export interface UseVoiceRecorderOptions {
  language: Language;
  /** Receives the reviewed-by-nobody-yet transcript; the caller must let the worker edit and submit it. */
  onTranscript: (text: string) => void;
}

/**
 * Records ONE short voice message (tap to start, tap to stop, auto-stop at
 * MAX_RECORDING_SECONDS) and sends it to /api/ai/transcribe, where Gemini turns
 * it into text. The microphone is released as soon as recording stops.
 */
export function useVoiceRecorder({ language, onTranscript }: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [error, setError] = useState<VoiceRecorderError | null>(null);
  /** Localized message from the server (no speech, AI busy, …), shown as-is. */
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const discardRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const releaseMic = useCallback(() => {
    window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const upload = useCallback(
    async (blob: Blob) => {
      setState('transcribing');
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const form = new FormData();
        // Language first so the server can localize errors even for rejected files.
        form.append('language', language);
        const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
        form.append('audio', blob, `voice.${ext}`);
        const res = await fetch('/api/ai/transcribe', {
          method: 'POST',
          credentials: 'include',
          body: form,
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.transcript !== 'string') {
          if (typeof data.error === 'string' && data.error) setServerMessage(data.error);
          else setError('generic');
          return;
        }
        onTranscriptRef.current(data.transcript);
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') setError('network');
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setState('idle');
      }
    },
    [language]
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setServerMessage(null);
    if (!isVoiceRecordingSupported()) {
      setError('unsupported');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(mapStartError(err));
      return;
    }
    streamRef.current = stream;

    let recorder: MediaRecorder;
    try {
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 });
    } catch {
      releaseMic();
      setError('unsupported');
      return;
    }

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    discardRef.current = false;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => {
      discardRef.current = true;
      setError('generic');
    };
    recorder.onstop = () => {
      releaseMic();
      recorderRef.current = null;
      setElapsed(0);
      if (discardRef.current) {
        setState('idle');
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
      if (Date.now() - startedAt < MIN_RECORDING_MS || blob.size === 0) {
        setState('idle');
        setError('too-short');
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        setState('idle');
        setError('too-long');
        return;
      }
      void upload(blob);
    };

    recorderRef.current = recorder;
    recorder.start();
    setElapsed(0);
    setState('recording');
    timerRef.current = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      // One short message only: stop automatically at the limit.
      if (seconds >= MAX_RECORDING_SECONDS) stop();
    }, 250);
  }, [releaseMic, stop, upload]);

  const toggle = useCallback(() => {
    if (state === 'recording') stop();
    else if (state === 'idle') void start();
  }, [start, state, stop]);

  const clearError = useCallback(() => {
    setError(null);
    setServerMessage(null);
  }, []);

  // Never keep the mic open or an upload running after unmount.
  useEffect(() => {
    return () => {
      discardRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      releaseMic();
      abortRef.current?.abort();
    };
  }, [releaseMic]);

  return { state, error, serverMessage, elapsed, start, stop, toggle, clearError };
}
