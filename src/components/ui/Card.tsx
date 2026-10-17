import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'muted' | 'accent';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-surface-1 border border-hairline',
    muted: 'bg-surface-2 border border-hairline-soft',
    accent: 'bg-accent-light border border-accent-subtle',
  };

  return (
    <div
      className={`rounded-card p-4 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
