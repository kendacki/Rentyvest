import { MarketplaceGrid } from '../../components/marketplace/MarketplaceGrid';

export const metadata = {
  title: 'Marketplace | RentyVest',
  description: 'Browse active fractional real estate opportunities.',
};

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Marketplace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Fractional real estate opportunities
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Invest per-slot in vetted properties. Slot availability updates in
            real time as investors pledge.
          </p>
        </header>

        <MarketplaceGrid />
      </div>
    </main>
  );
}
