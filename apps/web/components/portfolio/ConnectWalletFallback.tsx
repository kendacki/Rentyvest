'use client';

import Link from 'next/link';
import { WalletConnectSignIn } from '../wallet/WalletConnectSignIn';
import { useWalletConnect } from '../../providers/WalletConnectProvider';

export function ConnectWalletFallback() {
  const { isMounted, isReady, isConnecting } = useWalletConnect();

  return (
    <section className="card-surface mx-auto max-w-lg p-8 text-center shadow-sm">
      <p className="section-label">Portfolio</p>
      <h1 className="mt-2 text-2xl font-bold text-brand-black">
        Connect wallet to view portfolio
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        Your on chain equity tokens (PropertyNFT slots) and pending yield are
        tied to your Canton party. Connect via WalletConnect to load holdings
        from the ledger.
      </p>

      <div className="mt-8">
        {!isMounted || !isReady || isConnecting ? (
          <p className="text-sm text-neutral-500">Preparing wallet session…</p>
        ) : (
          <WalletConnectSignIn />
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        Need test funds first?{' '}
        <Link
          href="/wallet"
          className="font-semibold text-brand-orange hover:underline"
        >
          Open faucet
        </Link>
      </p>
    </section>
  );
}
