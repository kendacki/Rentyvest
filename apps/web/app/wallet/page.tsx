'use client';

import { FaucetCard } from '../../components/faucet/FaucetCard';
import { WalletConnectSignIn } from '../../components/wallet/WalletConnectSignIn';
import { useCantonWallet } from '../../providers/WalletConnectProvider';

export default function WalletPage() {
  const { isMounted, isConnected } = useCantonWallet();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Wallet
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Canton wallet &amp; test USDC
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Connect your Canton wallet via WalletConnect on the sandbox network.
            Claim test USDC minted directly to your connected party.
          </p>
        </header>

        <div className="space-y-6">
          <WalletConnectSignIn />

          {isMounted && isConnected ? (
            <FaucetCard />
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm text-slate-600">
                Connect your Canton wallet above to unlock the test USDC faucet.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
