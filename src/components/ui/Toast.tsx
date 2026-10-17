import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

interface ToastAction {
  label: string;
  onAction: () => void;
}

interface ToastState {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastContextType {
  /** Shows a short confirmation; an optional action (e.g. Undo) keeps it up a little longer. */
  showToast: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * One toast at a time, pinned above the bottom nav on phones and bottom-centre
 * on desktop. Announced politely to screen readers.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string, action?: ToastAction) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action });
    timer.current = window.setTimeout(() => setToast(null), action ? 6000 : 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none">
        {toast && (
          <div
            key={toast.id}
            className="animate-rise pointer-events-auto fixed left-1/2 -translate-x-1/2 z-50 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-8 w-[calc(100%-2rem)] max-w-sm flex items-center gap-3 rounded-subtle bg-ink text-inverse pl-4 pr-1.5 py-1.5 min-h-[52px] shadow-float"
          >
            <Check className="w-4 h-4 shrink-0 text-inverse-accent" aria-hidden="true" />
            <span className="flex-1 min-w-0 text-sm font-medium">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onAction();
                  setToast(null);
                }}
                className="shrink-0 min-h-[44px] px-3 rounded-[10px] text-sm font-bold text-inverse-accent hover:bg-inverse/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
