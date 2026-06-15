interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  center?: boolean;
}

const sizeMap = { sm: 16, md: 24, lg: 40 };

export default function Spinner({ size = 'md', center = false }: SpinnerProps) {
  const s = sizeMap[size];
  const el = (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="10" stroke="var(--gray-200)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
  if (center) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>{el}</div>;
  return el;
}
