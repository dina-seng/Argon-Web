import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Glass morphism style variant */
  glass?: boolean;
}

/**
 * Card – surface container styled for Argon dark theme.
 */
export function Card({ children, className = '', glass }: CardProps) {
  return (
    <div
      className={[
        glass ? 'glass' : 'bg-surface-card',
        'border border-white/10 rounded-2xl p-6 shadow-sm',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
