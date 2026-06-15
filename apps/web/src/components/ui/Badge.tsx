type BadgeVariant = 'success' | 'warning' | 'danger' | 'primary' | 'gray';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const variantClass: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  primary: 'badge-primary',
  gray: 'badge-gray',
};

export default function Badge({ variant = 'gray', children, dot = false }: BadgeProps) {
  return (
    <span className={`badge ${variantClass[variant]}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
