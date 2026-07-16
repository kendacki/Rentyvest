'use client';

import { FaucetCard } from '../../components/faucet/FaucetCard';
import { PageShell } from '../../components/layout/PageShell';
import { WalletConnectSignIn } from '../../components/wallet/WalletConnectSignIn';
import { useCantonWallet } from '../../providers/WalletConnectProvider';

export default function WalletPage() {
  const { isMounted, isConnected } = useCantonWallet();

  return (
    <PageShell>
      <main className="bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <header className="mb-8">
            <p className="section-label">Wallet</p>
            <h1 className="heading-section mt-2 text-brand-black">
              Canton wallet &amp; test USDC
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
              Connect your Canton wallet via WalletConnect on the sandbox
              network. Claim test USDC minted directly to your connected party.
            </p>
          </header>

          <div className="space-y-6">
            <WalletConnectSignIn />

            {isMounted && isConnected ? (
              <FaucetCard />
            ) : (
              <section className="card-surface border-dashed p-8 text-center">
                <p className="text-sm text-neutral-600">
                  Connect your Canton wallet above to unlock the test USDC
                  faucet.
                </p>
              </section>
            )}
          </div>
        </div>
      </main>
    </PageShell>
  );
}
