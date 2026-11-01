type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'price';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-fg',
  price: 'bg-price text-surface',
  info: 'bg-accent-soft text-accent',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  error: 'bg-red-500/15 text-red-300',
};

/**
 * Badge – 4px-radius status label (12px bold).
 */
export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      className={`inline-flex items-center whitespace-nowrap rounded px-2 py-1 text-xs font-bold leading-4 ${VARIANT_CLASSES[variant]}`}
    >
      {label}
    </span>
  );
}
