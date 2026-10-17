import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../i18n/translations';
import { SPEECH_LOCALES } from '../lib/speechLocale';

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (typeof window.SpeechSynthesisUtterance !== 'function') return null;
  return window.speechSynthesis;
}

/** Best voice for a locale: exact match (e.g. hi-IN), then same base language (hi). */
function pickVoice(synth: SpeechSynthesis, locale: string): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const target = norm(locale);
  const base = target.split('-')[0];
  return (
    voices.find((v) => norm(v.lang) === target && v.localService) ||
    voices.find((v) => norm(v.lang) === target) ||
    voices.find((v) => norm(v.lang).split('-')[0] === base) ||
    null
  );
}

/**
 * Chrome silently stops utterances after ~15s, so long answers are split into
 * sentence-sized chunks and queued.
 */
function chunkText(text: string, max = 180): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[।.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= max) {
      current = (current + ' ' + sentence).trim();
      continue;
    }
    if (current) chunks.push(current);
    if (sentence.length <= max) {
      current = sentence;
    } else {
      // Very long sentence: break on word boundaries.
      let rest = sentence;
      while (rest.length > max) {
        const cut = rest.lastIndexOf(' ', max);
        const at = cut > 40 ? cut : max;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Text-to-speech via window.speechSynthesis. Only one thing speaks at a time
 * across the app: starting a new read cancels any other. Cancels on unmount.
 */
export function useSpeechSynthesis(language: Language, rate = 0.95) {
  const [supported] = useState(() => getSynth() !== null);
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The device has voices, but none for this language (common for Punjabi). */
  const [voiceMissing, setVoiceMissing] = useState(false);
  // Token identifying this hook's current read; stale utterance events are ignored.
  const tokenRef = useRef(0);
  const ownsSpeechRef = useRef(false);

  // Voices load asynchronously in Chrome; touching getVoices() early primes the list.
  useEffect(() => {
    const synth = getSynth();
    if (!synth) return;
    synth.getVoices();
    const noop = () => synth.getVoices();
    synth.addEventListener?.('voiceschanged', noop);
    return () => synth.removeEventListener?.('voiceschanged', noop);
  }, []);

  const stop = useCallback(() => {
    const synth = getSynth();
    tokenRef.current++;
    if (synth && ownsSpeechRef.current) synth.cancel();
    ownsSpeechRef.current = false;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, lang: Language = language) => {
      const synth = getSynth();
      if (!synth || !text.trim()) return;
      const locale = SPEECH_LOCALES[lang];
      const voice = pickVoice(synth, locale);
      setFailed(false);
      // Voices loaded but none speaks this language: say so instead of reading it in a wrong-language voice.
      if (!voice && synth.getVoices().length > 0) {
        setVoiceMissing(true);
        return;
      }
      setVoiceMissing(false);
      synth.cancel(); // stop anything else in the app
      const token = ++tokenRef.current;
      const chunks = chunkText(text);

      const finish = (error: boolean) => {
        if (tokenRef.current !== token) return;
        ownsSpeechRef.current = false;
        setSpeaking(false);
        if (error) setFailed(true);
      };

      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = locale;
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        utterance.onerror = (e) => {
          // 'interrupted'/'canceled' happen when we (or another button) stop it.
          const benign = e.error === 'interrupted' || e.error === 'canceled';
          finish(!benign);
        };
        if (index === chunks.length - 1) utterance.onend = () => finish(false);
        synth.speak(utterance);
      });
      ownsSpeechRef.current = true;
      setSpeaking(true);
    },
    [language, rate]
  );

  useEffect(() => {
    return () => {
      tokenRef.current++;
      if (ownsSpeechRef.current) getSynth()?.cancel();
    };
  }, []);

  return { supported, speaking, failed, voiceMissing, speak, stop };
}
