'use client';

import Link from 'next/link';
import { FaucetCard } from '../../components/faucet/FaucetCard';
import { useLoopWallet } from '../../components/providers/LoopWalletProvider';
import { LoopWalletSignIn } from '../../components/wallet/LoopWalletSignIn';

export default function WalletPage() {
  const { isConnected } = useLoopWallet();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <Link
            href="/marketplace"
            className="inline-flex text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to marketplace
          </Link>
          <p className="mt-4 text-sm font-medium uppercase tracking-wide text-emerald-700">
            Wallet
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            DevNet wallet & faucet
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Connect your Loop wallet to claim test USDC on Canton DevNet. Tokens
            are minted directly to the connected Loop party.
          </p>
        </header>

        <div className="space-y-5">
          <LoopWalletSignIn />

          {isConnected ? (
            <FaucetCard />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-5 py-6 text-center text-sm text-slate-500">
              Connect your Loop wallet above to unlock the test USDC faucet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
