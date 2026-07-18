import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        padding: 2,
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--primary)' : 'var(--gray-300)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.2s',
      }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}
