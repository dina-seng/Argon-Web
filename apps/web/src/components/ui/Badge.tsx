type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

/**
 * Badge – status pill.
 * TODO: Implement variant colour mapping.
 */
export function Badge({ label, variant = 'default' }: BadgeProps) {
  // TODO: implement
  return <span data-variant={variant}>{label}</span>;
}
