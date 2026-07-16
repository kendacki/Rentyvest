'use client';

import Link from 'next/link';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';
import { useCantonWallet } from '../../providers/CantonWalletProvider';

export function ConnectWalletFallback() {
  const { isMounted, isReady, isConnecting } = useCantonWallet();

  return (
    <section className="card-surface mx-auto max-w-lg p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-brand-black">
        Connect wallet to view portfolio
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        Connect Loop or another Canton wallet to see your PropertyNFT slots and
        pending yield.
      </p>

      <div className="mt-8">
        {!isMounted || !isReady || isConnecting ? (
          <p className="text-sm text-neutral-500">Preparing wallet session…</p>
        ) : (
          <ConnectWalletButton className="btn-primary h-11 px-8 text-sm" />
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        Need test funds first?{' '}
        <Link
          href="/wallet"
          className="font-semibold text-brand-orange hover:underline"
        >
          Get tUSDC
        </Link>
      </p>
    </section>
  );
}
