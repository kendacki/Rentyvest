import Link from 'next/link';
import { MarketplaceGrid } from '../../components/marketplace/MarketplaceGrid';
import { PageShell } from '../../components/layout/PageShell';
import { Reveal } from '../../components/motion/Reveal';

export const metadata = {
  title: 'Marketplace | RentyVest',
  description: 'Browse active fractional real estate opportunities.',
};

export default function MarketplacePage() {
  return (
    <PageShell>
      <main className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Reveal as="header" className="mb-8 text-center">
            <p className="section-label">Marketplace</p>
            <h1 className="heading-section mt-2 text-brand-black">
              Fractional real estate opportunities
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-600">
              Invest per slot in vetted properties. Slot availability updates
              in real time as investors pledge on Canton.
            </p>
            <div className="mt-6 flex justify-center">
              <Link href="/wallet" className="btn-secondary shrink-0">
                Wallet &amp; faucet
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <MarketplaceGrid />
          </Reveal>
        </div>
      </main>
    </PageShell>
  );
}
