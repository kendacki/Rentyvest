import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: { w: 28, h: 28, text: 'text-base' },
  md: { w: 36, h: 36, text: 'text-lg' },
  lg: { w: 44, h: 44, text: 'text-xl' },
};

export function BrandLogo({ className = '', size = 'md' }: BrandLogoProps) {
  const s = sizes[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="RentyVest home"
    >
      <Image
        src="/rentyvest-logo.png"
        alt="RentyVest"
        width={s.w}
        height={s.h}
        className="rounded-sm"
        priority
      />
      <span className={`font-semibold tracking-tight text-white ${s.text}`}>
        RentyVest
      </span>
    </Link>
  );
}
