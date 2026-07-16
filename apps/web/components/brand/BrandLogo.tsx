import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  className?: string;
};

const SIZES = {
  sm: { icon: 28, wordmark: 'text-base' },
  md: { icon: 36, wordmark: 'text-lg' },
  lg: { icon: 48, wordmark: 'text-xl' },
} as const;

export function BrandLogo({
  showWordmark = true,
  size = 'md',
  variant = 'dark',
  className = '',
}: BrandLogoProps) {
  const config = SIZES[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 ${className}`}
      aria-label="RentyVest home"
    >
      <Image
        src="/logo-transparent.png"
        alt="RentyVest"
        width={config.icon}
        height={config.icon}
        className="h-auto w-auto"
        priority
      />
      {showWordmark ? (
        <span
          className={`${config.wordmark} font-bold tracking-tight ${
            variant === 'light' ? 'text-white' : 'text-brand-black'
          }`}
        >
          RentyVest
        </span>
      ) : null}
    </Link>
  );
}
