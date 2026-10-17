import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /**
   * Element rendered inside the field on the right, e.g.
   * `<VoiceInputButton value={v} onChange={setV} />`.
   */
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, endAdornment, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const describedBy =
      [error ? `${inputId}-error` : null, helperText && !error ? `${inputId}-helper` : null]
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink mb-1.5">
            {label}
          </label>
        )}
        <div className={endAdornment ? 'relative flex items-center' : undefined}>
          <input
            id={inputId}
            ref={ref}
            className={`w-full min-h-[44px] bg-surface-1 text-ink placeholder:text-ink-tertiary border-[1.5px] border-hairline rounded-subtle px-3.5 py-2.5 text-base sm:text-sm transition-all focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink disabled:opacity-50 disabled:bg-surface-2 ${
              error ? 'border-semantic-error focus:border-semantic-error focus:ring-semantic-error' : ''
            } ${endAdornment ? 'pr-14' : ''} ${className}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...props}
          />
          {endAdornment && <div className="absolute right-1 top-1/2 -translate-y-1/2">{endAdornment}</div>}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-semantic-error font-medium" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-ink-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
