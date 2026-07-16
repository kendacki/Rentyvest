import Link from 'next/link';
import { MarketplaceGrid } from '../../components/marketplace/MarketplaceGrid';
import { PageShell } from '../../components/layout/PageShell';

export const metadata = {
  title: 'Marketplace | RentyVest',
  description: 'Browse active fractional real estate opportunities.',
};

export default function MarketplacePage() {
  return (
    <PageShell>
      <main className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <header className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-label">Marketplace</p>
                <h1 className="heading-section mt-2 text-brand-black">
                  Fractional real estate opportunities
                </h1>
                <p className="mt-3 max-w-2xl text-base text-neutral-600">
                  Invest per slot in vetted properties. Slot availability updates
                  in real time as investors pledge on Canton.
                </p>
              </div>
              <Link href="/wallet" className="btn-secondary shrink-0">
                Wallet &amp; faucet
              </Link>
            </div>
          </header>

          <MarketplaceGrid />
        </div>
      </main>
    </PageShell>
  );
}
