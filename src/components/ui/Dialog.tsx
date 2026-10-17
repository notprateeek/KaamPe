import React, { useEffect, useId, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Hide the visible title while keeping it as the accessible name. */
  hideTitle?: boolean;
  /** Set false for flows that must not be dismissed with Escape/backdrop (e.g. onboarding). */
  dismissible?: boolean;
  className?: string;
}

/**
 * Accessible modal built on the native <dialog> element: showModal() makes the
 * rest of the page inert, traps focus, and the browser restores focus to the
 * opener on close. Escape and backdrop clicks call onClose when dismissible.
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  hideTitle = false,
  dismissible = true,
  className = '',
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    if (dismissible) onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (dismissible && e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={`w-[calc(100%-2rem)] max-w-sm rounded-card border border-hairline bg-surface-1 p-0 text-ink shadow-float backdrop:bg-black/40 ${className}`}
    >
      {open && (
        <div className="p-5">
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'mb-4 text-lg font-bold text-ink'}>
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
};
