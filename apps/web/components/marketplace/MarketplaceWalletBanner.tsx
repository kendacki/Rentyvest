'use client';

import Link from 'next/link';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';
import { useWalletConnect } from '../../providers/WalletConnectProvider';

export function MarketplaceWalletBanner() {
  const { isMounted, isReady, isConnected, partyId } = useWalletConnect();

  if (!isMounted || !isReady || (isConnected && partyId)) {
    return null;
  }

  return (
    <section className="card-surface mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-brand-black">
          Connect your Canton wallet to get started
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Link WalletConnect, claim tUSDC from the faucet, then pledge on any
          live property pool.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ConnectWalletButton className="btn-primary h-11 px-6 text-sm" />
        <Link href="/wallet" className="btn-secondary h-11 px-6 text-sm">
          Open faucet
        </Link>
      </div>
    </section>
  );
}
