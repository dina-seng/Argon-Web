export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default'
  | 'green'
  | 'blue'
  | 'price';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  blue: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  price: 'bg-price text-surface border-transparent font-bold',
  default: 'bg-slate-700/40 text-slate-300 border-slate-600/30',
};

/**
 * Badge – status pill for statuses, roles, and tags.
 */
export function Badge({ label, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${variantStyles[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
