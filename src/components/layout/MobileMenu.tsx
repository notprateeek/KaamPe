import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { QuickPrefs, ToolList, UserCard } from './NavPanel';

/**
 * Left drawer with every tool on phones, built on the native <dialog> (focus
 * trap, Escape, inert background). Closes after navigating.
 */
export const MobileMenu: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useApp();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={t.tools.title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mr-auto h-dvh max-h-dvh w-[85vw] max-w-[20rem] bg-surface-1 text-ink p-0 border-r border-hairline shadow-float backdrop:bg-ink/50 backdrop:backdrop-blur-[2px] open:animate-[slide-in_180ms_ease-out]"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-[1.5rem] leading-none font-extrabold font-wide text-ink">
              Kaam<span className="bg-marigold text-marigold-ink px-1 rounded-md ml-0.5">Pe</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.tools.closeMenu}
              className="flex items-center justify-center w-11 h-11 rounded-full text-ink hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            <ToolList onNavigate={onClose} />
          </div>
          <div className="px-2 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-2 border-t border-hairline-soft">
            <QuickPrefs idPrefix="drawer" />
            <UserCard onNavigate={onClose} />
          </div>
        </div>
      )}
    </dialog>
  );
};
