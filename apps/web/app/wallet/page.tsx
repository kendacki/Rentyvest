'use client';

import { Suspense } from 'react';
import { FaucetCard } from '../../components/faucet/FaucetCard';
import { PageShell } from '../../components/layout/PageShell';
import { Reveal } from '../../components/motion/Reveal';
import { AccountSetupBanner } from '../../components/wallet/AccountSetupBanner';

const HAS_PRIVY = Boolean(
  (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '').trim(),
);

export default function WalletPage() {
  return (
    <PageShell>
      <main className="page-canvas">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Reveal as="header" className="mb-8 text-center">
            <h1 className="heading-section text-brand-black">
              tUSDC on Canton DevNet
            </h1>
          </Reveal>

          {HAS_PRIVY ? (
            <Suspense fallback={null}>
              <AccountSetupBanner variant="card" />
            </Suspense>
          ) : null}

          <Reveal className="space-y-6" delay={0.08}>
            <FaucetCard />
          </Reveal>
        </div>
      </main>
    </PageShell>
  );
}
