'use client';

import Image from 'next/image';
import { Reveal } from '../motion/Reveal';

type BrandItem = {
  name: string;
  src: string;
  width: number;
  height: number;
  invert?: boolean;
};

const BRANDS: BrandItem[] = [
  {
    name: 'Canton Network',
    src: '/brands/canton.png',
    width: 128,
    height: 24,
    invert: false,
  },
  {
    name: 'Daml',
    src: '/brands/daml.svg',
    width: 72,
    height: 28,
  },
  {
    name: 'Supabase',
    src: '/brands/supabase.svg',
    width: 110,
    height: 28,
  },
  {
    name: 'WalletConnect',
    src: '/brands/walletconnect.svg',
    width: 132,
    height: 28,
  },
  {
    name: 'Privy',
    src: '/brands/privy.svg',
    width: 88,
    height: 28,
  },
  {
    name: 'Next.js',
    src: '/brands/nextjs.svg',
    width: 92,
    height: 28,
  },
];

function BrandLogoItem({ name, src, width, height, invert = true }: BrandItem) {
  return (
    <div
      className="mx-12 flex shrink-0 items-center justify-center opacity-50 transition-opacity duration-300 hover:opacity-100"
      title={name}
    >
      <Image
        src={src}
        alt={`${name} logo`}
        width={width}
        height={height}
        className={`h-7 w-auto object-contain ${invert ? 'brightness-0 invert' : ''}`}
      />
    </div>
  );
}

export function BrandMarquee() {
  const items = [...BRANDS, ...BRANDS];

  return (
    <Reveal as="section" className="overflow-hidden border-y border-neutral-900 bg-black py-10">
      <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-600">
        Built with
      </p>
      <div className="flex animate-marquee items-center">
        {items.map((brand, index) => (
          <BrandLogoItem key={`${brand.name}-${index}`} {...brand} />
        ))}
      </div>
    </Reveal>
  );
}
