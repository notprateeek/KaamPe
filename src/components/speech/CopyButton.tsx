import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { actionButtonClass } from './ReadAloudButton';

/** Clipboard API with a legacy execCommand fallback; resolves to whether it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface CopyButtonProps {
  text: string;
  /** Override the default "copy answer" wording, e.g. for a letter draft. */
  label?: string;
  copiedLabel?: string;
  className?: string;
}

/** Copies `text` and reports real success/failure in a live status next to the button. */
export const CopyButton: React.FC<CopyButtonProps> = ({ text, label, copiedLabel, className = '' }) => {
  const { t } = useApp();
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const id = window.setTimeout(() => setState('idle'), state === 'copied' ? 2500 : 5000);
    return () => window.clearTimeout(id);
  }, [state]);

  if (!text.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={async () => setState((await copyText(text)) ? 'copied' : 'failed')}
        className={`${actionButtonClass} ${className}`}
      >
        {state === 'copied' ? (
          <Check className="w-4 h-4 text-semantic-success" aria-hidden="true" />
        ) : (
          <Copy className="w-4 h-4" aria-hidden="true" />
        )}
        <span>{label ?? t.speech.copy}</span>
      </button>
      <span
        role="status"
        className={`text-xs font-medium ${state === 'failed' ? 'text-semantic-error' : 'text-semantic-success'}`}
      >
        {state === 'copied' ? (copiedLabel ?? t.speech.copied) : state === 'failed' ? t.speech.copyFailed : ''}
      </span>
    </>
  );
};
