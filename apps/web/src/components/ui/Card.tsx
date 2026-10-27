import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Glass morphism style variant */
  glass?: boolean;
}

/**
 * Card – surface container.
 * TODO: Implement glass variant with glassmorphism styles.
 */
export function Card({ children, className, glass }: CardProps) {
  // TODO: implement
  return (
    <div className={[glass ? 'glass' : 'bg-surface-card', 'rounded-2xl p-6', className].join(' ')}>
      {children}
    </div>
  );
}
