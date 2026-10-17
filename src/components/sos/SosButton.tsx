import React, { useState } from 'react';
import { Phone, MapPin, ExternalLink, MessageSquare, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { HELPLINES } from '../../../shared/helplines';

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; mapUrl: string; message: string }
  | { status: 'error'; reason: 'denied' | 'unavailable' | 'unsupported' };

const linkClass =
  'flex items-center gap-2 min-h-[44px] px-3 rounded-subtle border border-hairline bg-surface-1 text-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Floating SOS button (bottom-right, above the mobile BottomNav) that opens a
 * dialog with one-tap helpline calls and a "share my location" action.
 */
export const SosButton: React.FC = () => {
  const { t, profile } = useApp();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });

  const close = () => {
    setOpen(false);
    setLocation({ status: 'idle' });
  };

  const shareOrFallback = async (message: string) => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t.sos.title, text: message });
      } catch {
        /* user cancelled the share sheet — the SMS/map links stay visible */
      }
    }
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocation({ status: 'error', reason: 'unsupported' });
      return;
    }
    setLocation({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
        const message = `${t.sos.shareMessage} ${mapUrl}`;
        setLocation({ status: 'ready', mapUrl, message });
        void shareOrFallback(message);
      },
      (err) => {
        setLocation({
          status: 'error',
          reason: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const errorMessage =
    location.status === 'error'
      ? {
          denied: t.sos.locationDenied,
          unavailable: t.sos.locationUnavailable,
          unsupported: t.sos.locationUnsupported,
        }[location.reason]
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.sos.buttonLabel}
        aria-haspopup="dialog"
        className="fixed z-40 right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:right-8 md:bottom-8 w-14 h-14 rounded-full bg-semantic-error text-white text-sm font-extrabold tracking-wide shadow-float border-2 border-surface-1 flex items-center justify-center hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-95 transition"
      >
        SOS
      </button>

      <Dialog open={open} onClose={close} title={t.sos.title}>
        <p className="text-sm text-ink-muted mb-3">{t.sos.intro}</p>

        <ul className="space-y-2 mb-4">
          {HELPLINES.map((h) => (
            <li key={h.id}>
              <a
                href={`tel:${h.number}`}
                className="flex items-center justify-between gap-3 min-h-[48px] px-3 py-2 rounded-subtle border border-hairline bg-surface-1 hover:border-semantic-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{h.label[profile.language]}</span>
                  <span className="block text-xs text-ink-muted">
                    {t.sos.callLabel} {h.number}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0 text-semantic-error font-bold text-base">
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  {h.number}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="border-t border-hairline-soft pt-4 space-y-3">
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={requestLocation}
            isLoading={location.status === 'locating'}
            className="gap-2"
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span>{t.sos.shareLocation}</span>
          </Button>

          <div role="status" aria-live="polite" className="text-sm">
            {location.status === 'locating' && <p className="text-ink-muted">{t.sos.locating}</p>}
            {location.status === 'ready' && <p className="text-ink font-medium">{t.sos.locationReady}</p>}
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm font-medium text-semantic-error">
              {errorMessage}
            </p>
          )}

          {location.status === 'ready' && (
            <div className="grid gap-2">
              {typeof navigator.share === 'function' && (
                <button type="button" onClick={() => shareOrFallback(location.message)} className={linkClass}>
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  <span>{t.sos.shareLocation}</span>
                </button>
              )}
              <a href={`sms:?body=${encodeURIComponent(location.message)}`} className={linkClass}>
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                <span>{t.sos.sendSms}</span>
              </a>
              <a href={location.mapUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                <span>{t.sos.openMap}</span>
              </a>
            </div>
          )}

          <Button type="button" variant="secondary" fullWidth onClick={close}>
            {t.common.close}
          </Button>
        </div>
      </Dialog>
    </>
  );
};
