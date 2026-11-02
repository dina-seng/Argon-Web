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
  success:
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
  green:
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
  warning:
    'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
  error:
    'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60',
  info:
    'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/60',
  blue:
    'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/60',
  price:
    'bg-orange-50 dark:bg-orange-950/40 text-[#FF5B22] border-orange-200/80 dark:border-orange-800/60 font-bold',
  default:
    'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80',
};

/**
 * Badge – Understated flat typographic tag (subtle 4px radius, clean borders, no pill capsules).
 */
export function Badge({ label, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-normal border ${variantStyles[variant]} ${className}`}
    >
      {label}
    </span>
  );
}

export default Badge;
