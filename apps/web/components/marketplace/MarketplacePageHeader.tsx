'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { Reveal } from '../motion/Reveal';

export function MarketplacePageHeader() {
  const { ready, authenticated } = usePrivy();
  const isSignedIn = ready && authenticated;

  return (
    <Reveal as="header" className="mb-8 text-center">
      {!isSignedIn ? <p className="section-label">Marketplace</p> : null}
      <h1
        className={`heading-section text-brand-black ${isSignedIn ? '' : 'mt-2'}`}
      >
        Fractional real estate opportunities
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-600">
        Invest per slot in vetted properties. Slot availability updates in real
        time as investors pledge on Canton.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/wallet" className="btn-secondary shrink-0">
          Faucet
        </Link>
      </div>
    </Reveal>
  );
}
