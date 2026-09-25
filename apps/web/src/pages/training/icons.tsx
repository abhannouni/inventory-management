interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function ClockIcon({ size = 14 }: IconProps) {
  return <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

export function CalendarIcon({ size = 14 }: IconProps) {
  return <svg {...base(size)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
}

export function ListIcon({ size = 14 }: IconProps) {
  return <svg {...base(size)}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>;
}

export function CheckCircleIcon({ size = 14 }: IconProps) {
  return <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>;
}

export function EyeOffIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
    </svg>
  );
}

export function PlusIcon({ size = 16 }: IconProps) {
  return <svg {...base(size)} strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>;
}

export function ArrowLeftIcon({ size = 16 }: IconProps) {
  return <svg {...base(size)}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
}

export function UsersIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function DownloadIcon({ size = 15 }: IconProps) {
  return <svg {...base(size)}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>;
}
