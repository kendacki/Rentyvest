'use client';

import { PageShell } from '../../components/layout/PageShell';
import { Reveal } from '../../components/motion/Reveal';
import { PropertyListingForm } from '../../components/seller/PropertyListingForm';
import { SignInRequired } from '../../components/seller/SignInRequired';
import { useCantonWallet } from '../../providers/CantonWalletProvider';

const LISTING_STEPS = [
  {
    step: 'Step 1',
    title: 'Submit details',
    description:
      'Share property, location, and slot economics for our review team.',
  },
  {
    step: 'Step 2',
    title: 'On-chain pool',
    description:
      'We configure your PropertyPool on Canton DevNet with verified metadata.',
  },
  {
    step: 'Step 3',
    title: 'Go live',
    description:
      'Investors pledge tUSDC per slot and receive equity NFTs in their wallets.',
  },
] as const;

export default function SellerPage() {
  const { isMounted, isReady, isConnected, partyId } = useCantonWallet();

  if (!isMounted || !isReady) {
    return (
      <PageShell>
        <main className="page-canvas">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
            <p className="text-sm text-neutral-500">Loading…</p>
          </div>
        </main>
      </PageShell>
    );
  }

  if (!isConnected || !partyId) {
    return (
      <PageShell>
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center page-canvas px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <SignInRequired
            title="Connect wallet to list your property"
            description="Connect your wallet to submit a fractional listing request for review."
            redirectPath="/seller"
          />
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="page-canvas font-sans">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Reveal as="header" className="mb-8 text-center" immediate>
            <h1 className="heading-section text-brand-black">List your property</h1>
            <p className="body-lead mx-auto mt-3 max-w-2xl text-neutral-600">
              Submit your asset for fractional listing on RentyVest. We review each
              request, deploy a PropertyPool, and publish live slots on the marketplace.
            </p>
          </Reveal>

          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-3">
              {LISTING_STEPS.map((item) => (
                <article key={item.step} className="glass-inset p-4 text-left">
                  <p className="section-label">{item.step}</p>
                  <p className="mt-2 text-sm font-semibold text-brand-black">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </section>

            <PropertyListingForm />
          </div>
        </div>
      </main>
    </PageShell>
  );
}
