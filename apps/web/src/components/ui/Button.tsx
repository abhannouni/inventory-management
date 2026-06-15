import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  ghost:     'btn-ghost',
  outline:   'btn-outline',
};

const sizeClass: Record<Size, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

const hoverScale: Record<Variant, number> = {
  primary:   1.025,
  secondary: 1.02,
  danger:    1.025,
  ghost:     1.01,
  outline:   1.02,
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      className={`btn ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { scale: hoverScale[variant], transition: { duration: 0.18 } }}
      whileTap={isDisabled ? undefined : { scale: 0.96, transition: { duration: 0.1 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      {...(rest as any)}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : (
        icon && <span className="btn-icon">{icon}</span>
      )}
      {children}
    </motion.button>
  );
}
