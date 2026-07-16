import { MarketplaceGrid } from '../../components/marketplace/MarketplaceGrid';import { MarketplacePageHeader } from '../../components/marketplace/MarketplacePageHeader';
import { MarketplaceWalletBanner } from '../../components/marketplace/MarketplaceWalletBanner';
import { PageShell } from '../../components/layout/PageShell';
import { Reveal } from '../../components/motion/Reveal';

export const metadata = {
  title: 'Marketplace | RentyVest',
  description: 'Browse active fractional real estate opportunities.',
};

export default function MarketplacePage() {
  return (
    <PageShell>
      <main className="page-canvas">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <MarketplacePageHeader />

          <MarketplaceWalletBanner />

          <Reveal delay={0.1}>
            <MarketplaceGrid />
          </Reveal>
        </div>
      </main>
    </PageShell>
  );
}
