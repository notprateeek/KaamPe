import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** Thin strip at the top while the phone has no connection. */
export const OfflineBanner: React.FC = () => {
  const { t } = useApp();
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="flex items-center justify-center gap-2 bg-ink text-white text-sm font-medium px-4 py-2">
          <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          {t.common.offline}
        </p>
      )}
    </div>
  );
};
