'use client';

import { FaucetCard } from '../../components/faucet/FaucetCard';
import { PageShell } from '../../components/layout/PageShell';
import { Reveal } from '../../components/motion/Reveal';
import { WalletConnectSignIn } from '../../components/wallet/WalletConnectSignIn';
import { useCantonWallet } from '../../providers/WalletConnectProvider';

export default function WalletPage() {
  const { isMounted, isConnected } = useCantonWallet();

  return (
    <PageShell>
      <main className="page-canvas">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Reveal as="header" className="mb-8 text-center">
            <p className="section-label">Faucet</p>
            <h1 className="heading-section mt-2 text-brand-black">
              Test USDC on Canton Dev Net
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
              Connect via WalletConnect on the sandbox network, then claim test
              USDC minted directly to your connected party.
            </p>
          </Reveal>

          <Reveal className="space-y-6" delay={0.08}>
            <WalletConnectSignIn />

            {isMounted && isConnected ? (
              <FaucetCard />
            ) : (
              <section className="card-surface border-dashed p-8 text-center">
                <p className="text-sm text-neutral-600">
                  Connect via WalletConnect above to unlock the test USDC
                  faucet.
                </p>
              </section>
            )}
          </Reveal>
        </div>
      </main>
    </PageShell>
  );
}
