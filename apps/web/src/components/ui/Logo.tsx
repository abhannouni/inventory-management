interface LogoProps {
  size?: number;
}

export default function Logo({ size = 22 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="rgba(255,255,255,0.15)"
        stroke="white"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="9" r="3.5" fill="rgba(255,255,255,0.32)" />
      <path
        d="M9.5,9 L11.3,11.2 L14.8,6.8"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
