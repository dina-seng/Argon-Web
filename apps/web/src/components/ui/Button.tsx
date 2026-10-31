import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent text-surface hover:bg-accent/90',
  secondary: 'border border-line-strong bg-surface-card text-fg hover:border-fg-muted',
  ghost: 'text-fg-muted hover:bg-surface-card hover:text-fg',
  danger: 'border border-red-400/40 bg-surface-card text-red-300 hover:border-red-300',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

/**
 * Button – Argon design-system button.
 */
export function Button({ variant = 'primary', size = 'md', isLoading, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      data-variant={variant}
      data-size={size}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      disabled={isLoading || props.disabled}
    >
      {isLoading ? 'Loading…' : children}
    </button>
  );
}
