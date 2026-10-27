import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Button – Argon design-system button.
 * TODO: Implement full variant and size styles.
 */
export function Button({ variant = 'primary', size = 'md', isLoading, children, className = '', ...props }: ButtonProps) {
  // TODO: implement full variant and size classes
  return (
    <button
      {...props}
      data-variant={variant}
      data-size={size}
      className={`btn ${className}`}
      disabled={isLoading || props.disabled}
    >
      {isLoading ? 'Loading…' : children}
    </button>
  );
}
