import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-ink text-white hover:bg-ink-hover shadow-subtle',
    secondary: 'bg-surface-1 text-ink border-[1.5px] border-ink hover:bg-surface-2',
    accent: 'bg-marigold text-ink font-bold hover:bg-marigold-hover',
    danger: 'bg-semantic-error text-white hover:opacity-90 shadow-subtle',
    ghost: 'text-ink hover:bg-surface-2 border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-lg min-h-[40px]',
    md: 'text-sm px-4 py-2.5 rounded-xl min-h-[44px]',
    lg: 'text-base px-6 py-3.5 rounded-xl min-h-[50px] font-semibold',
  };

  const width = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="motion-safe:animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
