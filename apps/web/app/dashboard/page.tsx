'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageShell } from '../../components/layout/PageShell';
import { TransferModal } from '../../components/nft/TransferModal';
import { ConnectWalletFallback } from '../../components/portfolio/ConnectWalletFallback';
import { PortfolioGrid } from '../../components/portfolio/PortfolioGrid';
import { PortfolioPledgeModal } from '../../components/portfolio/PledgeModal';
import { useCantonWallet } from '../../providers/WalletConnectProvider';
import { useLedgerPortfolio } from '../../hooks/useLedgerPortfolio';
import { formatTokenBalance, truncatePartyId } from '../../lib/format';
import type { UserEquityToken } from '@rentyvest/ledger-client';
import type { TransferableNFT } from '../../types/nft';

function toTransferableNFT(token: UserEquityToken): TransferableNFT {
  return {
    id: token.contract_id,
    contractId: token.contract_id,
    propertyName: token.property_id,
    slotNumber: token.slot_index,
    tokenId: token.slot_id,
    pendingYield: Number.parseFloat(token.pending_yield) || 0,
  };
}

export default function DashboardPage() {
  const { isMounted, isReady, isConnected, partyId } = useCantonWallet();
  const {
    tokens,
    count,
    totalPendingYield,
    currency,
    isLoading,
    isSigning,
    error,
    refetch,
    executePledge,
  } = useLedgerPortfolio({ enabled: isConnected });

  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferNft, setTransferNft] = useState<TransferableNFT | null>(null);

  if (!isMounted || !isReady) {
    return (
      <PageShell>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-neutral-500">
            Loading portfolio…
          </p>
        </main>
      </PageShell>
    );
  }

  if (!isConnected || !partyId) {
    return (
      <PageShell>
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <ConnectWalletFallback />
        </main>
      </PageShell>
    );
  }

  const pendingYieldValue = Number.parseFloat(totalPendingYield) || 0;

  return (
    <PageShell>
      <main className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label">Portfolio</p>
              <h1 className="heading-section mt-2 text-brand-black">
                Your holdings
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Canton party{' '}
                <span className="font-mono text-xs text-brand-black">
                  {truncatePartyId(partyId)}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/marketplace" className="btn-secondary h-11">
                Browse pools
              </Link>
              <button
                type="button"
                onClick={() => setPledgeOpen(true)}
                className="btn-primary h-11"
              >
                Pledge tUSDC
              </button>
            </div>
          </header>

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Equity slots
              </p>
              <p className="mt-2 text-3xl font-bold text-brand-black">{count}</p>
            </div>
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Pending yield
              </p>
              <p className="mt-2 text-3xl font-bold text-brand-black">
                {formatTokenBalance(pendingYieldValue, currency)}
              </p>
            </div>
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Network
              </p>
              <p className="mt-2 text-lg font-semibold text-brand-black">
                Canton Dev Net
              </p>
              <p className="text-xs text-neutral-500">
                Signed via WalletConnect
              </p>
            </div>
          </section>

          <PortfolioGrid
            tokens={tokens}
            isLoading={isLoading}
            error={error}
            currency={currency}
            onRetry={() => void refetch()}
            onTransferToken={(token) => {
              setTransferNft(toTransferableNFT(token));
              setTransferOpen(true);
            }}
          />

          <PortfolioPledgeModal
            open={pledgeOpen}
            onOpenChange={setPledgeOpen}
            partyId={partyId}
            isSigning={isSigning}
            onExecutePledge={async (params) => {
              await executePledge(params);
            }}
          />

          {transferNft ? (
            <TransferModal
              open={transferOpen}
              onOpenChange={setTransferOpen}
              nft={transferNft}
              userPartyId={partyId}
              onTransferSuccess={() => {
                void refetch();
              }}
            />
          ) : null}
        </div>
      </main>
    </PageShell>
  );
}
