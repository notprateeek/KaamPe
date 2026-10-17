import React, { useState } from 'react';
import { MessageCircle, MessageSquare, Copy, Check, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog } from '../ui/Dialog';
import { copyText } from '../speech/CopyButton';

const optionClass =
  'flex flex-col items-center justify-center gap-1.5 min-h-[84px] p-2 rounded-subtle border-[1.5px] border-hairline bg-surface-1 text-sm font-semibold text-ink text-center hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Share a short text. WhatsApp and SMS are plain links, so they open even where
 * the Web Share API is missing or its sheet is cancelled; "More apps" appears
 * only when the browser supports navigator.share.
 */
export const ShareSheet: React.FC<{ open: boolean; onClose: () => void; title: string; text: string }> = ({
  open,
  onClose,
  title,
  text,
}) => {
  const { t } = useApp();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const encoded = encodeURIComponent(text);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const close = () => {
    setCopyState('idle');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={title}>
      <p className="text-[0.9375rem] text-ink leading-relaxed whitespace-pre-wrap bg-surface-2 rounded-subtle p-3 mb-4">{text}</p>

      <div className={`grid gap-2 ${canNativeShare ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer" className={optionClass}>
          <MessageCircle className="w-6 h-6 text-semantic-success" aria-hidden="true" />
          WhatsApp
        </a>
        <a href={`sms:?&body=${encoded}`} className={optionClass}>
          <MessageSquare className="w-6 h-6 text-ink" aria-hidden="true" />
          {t.sos.sendSms}
        </a>
        <button
          type="button"
          onClick={async () => setCopyState((await copyText(text)) ? 'copied' : 'failed')}
          className={optionClass}
        >
          {copyState === 'copied' ? (
            <Check className="w-6 h-6 text-semantic-success" aria-hidden="true" />
          ) : (
            <Copy className="w-6 h-6 text-ink" aria-hidden="true" />
          )}
          {copyState === 'copied' ? t.help.copied : t.help.copy}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={() => {
              navigator.share({ text }).catch(() => {
                /* cancelled or unsupported target: the other options stay available */
              });
            }}
            className={optionClass}
          >
            <Share2 className="w-6 h-6 text-ink" aria-hidden="true" />
            {t.common.moreApps}
          </button>
        )}
      </div>

      <p role="status" className="mt-2 min-h-[1.25rem] text-sm font-medium text-semantic-error">
        {copyState === 'failed' ? t.speech.copyFailed : ''}
      </p>

      <button
        type="button"
        onClick={close}
        className="mt-1 w-full min-h-[48px] rounded-subtle text-sm font-semibold text-ink hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t.common.close}
      </button>
    </Dialog>
  );
};
