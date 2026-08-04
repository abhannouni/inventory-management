interface BourchaninLogoProps {
  variant?: 'color' | 'white';
  className?: string;
}

export default function BourchaninLogo({ variant = 'color', className }: BourchaninLogoProps) {
  const src = variant === 'white' ? '/bourchanin-white.svg' : '/Bourchanin.svg';
  return <img src={src} alt="Bourchanin" className={className} draggable={false} />;
}
