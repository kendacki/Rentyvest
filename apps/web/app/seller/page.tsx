'use client';

import { usePrivy } from '@privy-io/react-auth';
import { PageShell } from '../../components/layout/PageShell';
import { Reveal } from '../../components/motion/Reveal';
import { PropertyListingForm } from '../../components/seller/PropertyListingForm';
import { SignInRequired } from '../../components/seller/SignInRequired';
import { truncatePartyId } from '../../lib/format';
import { useCantonWallet } from '../../providers/CantonWalletProvider';

const HAS_PRIVY = Boolean(
  (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '').trim(),
);

export default function SellerPage() {
  const { ready, authenticated } = usePrivy();
  const { partyId } = useCantonWallet();

  if (!HAS_PRIVY) {
    return (
      <PageShell>
        <main className="page-canvas">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
            <p className="text-sm text-neutral-600">
              Property listing requires sign-in. Configure NEXT_PUBLIC_PRIVY_APP_ID to
              enable this feature.
            </p>
          </div>
        </main>
      </PageShell>
    );
  }

  if (!ready) {
    return (
      <PageShell>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-neutral-500">Loading…</p>
        </main>
      </PageShell>
    );
  }

  if (!authenticated) {
    return (
      <PageShell>
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center page-canvas px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <SignInRequired
            title="Sign in to list your property"
            description="Property owners must sign in with their connected wallet before submitting a fractional listing request."
            redirectPath="/seller"
          />
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="page-canvas">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Reveal as="header" className="mb-8 text-center">
            <h1 className="heading-section text-brand-black">List your property</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
              Submit your asset for fractional listing on RentyVest. We review each
              request, deploy a Canton PropertyPool, and publish live slots on the
              marketplace.
            </p>
            {partyId ? (
              <p className="mt-2 text-sm text-neutral-500">
                Signed in · Canton party{' '}
                <span className="font-mono text-xs text-brand-black">
                  {truncatePartyId(partyId)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">
                Signed in · Connect a Canton wallet to link your party to this listing.
              </p>
            )}
          </Reveal>

          <Reveal className="space-y-6" delay={0.08}>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="card-surface p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                  Step 1
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-black">
                  Submit details
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Share property, location, and slot economics for our review team.
                </p>
              </div>
              <div className="card-surface p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                  Step 2
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-black">
                  On-chain pool
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  We configure your PropertyPool on Canton DevNet with verified metadata.
                </p>
              </div>
              <div className="card-surface p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                  Step 3
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-black">
                  Go live
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Investors pledge tUSDC per slot and receive equity NFTs in their wallets.
                </p>
              </div>
            </section>

            <PropertyListingForm />
          </Reveal>
        </div>
      </main>
    </PageShell>
  );
}
