import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { SPEECH_RATES, useApp } from '../../context/AppContext';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useToast } from '../ui/Toast';

interface ScreenReaderContextType {
  /** Speech synthesis exists in this browser. */
  supported: boolean;
  /** Something started from here (page read / tap-to-hear / auto-read) is speaking. */
  speaking: boolean;
  /** Reads arbitrary text; `highlight` gets an outline while it is read. */
  readText: (text: string, highlight?: Element | null) => void;
  /** Reads the visible text of the current screen, top to bottom. */
  readPage: () => void;
  stop: () => void;
}

const ScreenReaderContext = createContext<ScreenReaderContextType | undefined>(undefined);

/** Elements whose whole text is read when any part of them is tapped. */
const READABLE_BLOCK = 'p, h1, h2, h3, h4, li, dt, dd, label, button, a, [role="button"], [role="switch"], td, th, figcaption';
/** Regions where tap-to-hear is active (dialogs included, page chrome too). */
const READABLE_REGION = '#main-content, header, nav, aside, dialog, [role="status"]';
const SKIP = 'input, textarea, select, [contenteditable="true"], [data-no-tap-to-hear]';

/** Visible text of an element with line breaks turned into pauses. */
function textOf(el: Element): string {
  const label = el.getAttribute('aria-label');
  const raw = (el as HTMLElement).innerText || el.textContent || '';
  const text = raw.trim() || label || '';
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/[.!?।:]$/.test(line) ? line : `${line}.`))
    .join(' ');
}

/**
 * App-wide read-aloud helpers: "Read this screen", tap-to-hear (any tapped text
 * is spoken without blocking the tap), and auto-read of new replies. Uses the
 * device's own voices; nothing is sent to a server.
 */
export const ScreenReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, speechRate, tapToHear, t } = useApp();
  const { showToast } = useToast();
  const { supported, speaking, voiceMissing, speak, stop: stopSpeech } = useSpeechSynthesis(
    profile.language,
    SPEECH_RATES[speechRate]
  );
  const highlightRef = useRef<Element | null>(null);

  const clearHighlight = () => {
    highlightRef.current?.classList.remove('kp-reading');
    highlightRef.current = null;
  };

  const readText = useCallback(
    (text: string, highlight?: Element | null) => {
      clearHighlight();
      if (!text.trim()) return;
      if (highlight) {
        highlight.classList.add('kp-reading');
        highlightRef.current = highlight;
      }
      speak(text);
    },
    [speak]
  );

  const readPage = useCallback(() => {
    const main = document.getElementById('main-content');
    if (main) readText(textOf(main));
  }, [readText]);

  const stop = useCallback(() => {
    clearHighlight();
    stopSpeech();
  }, [stopSpeech]);

  useEffect(() => {
    if (!speaking) clearHighlight();
  }, [speaking]);

  useEffect(() => {
    if (voiceMissing) showToast(t.speech.voiceUnavailable);
  }, [voiceMissing, showToast, t.speech.voiceUnavailable]);

  // Tap-to-hear: listen in the capture phase and never cancel the tap itself,
  // so buttons and links still work while their label is spoken.
  useEffect(() => {
    if (!tapToHear || !supported) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || target.closest(SKIP) || !target.closest(READABLE_REGION)) return;
      const block = target.closest(READABLE_BLOCK) ?? target;
      const text = textOf(block);
      if (text) readText(text, block);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [tapToHear, supported, readText]);

  return (
    <ScreenReaderContext.Provider value={{ supported, speaking, readText, readPage, stop }}>
      {children}
    </ScreenReaderContext.Provider>
  );
};

export const useScreenReader = () => {
  const ctx = useContext(ScreenReaderContext);
  if (!ctx) throw new Error('useScreenReader must be used within a ScreenReaderProvider');
  return ctx;
};
