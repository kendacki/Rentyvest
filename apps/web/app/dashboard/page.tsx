'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TransferModal } from '../../components/nft/TransferModal';
import { ConnectWalletFallback } from '../../components/portfolio/ConnectWalletFallback';
import { PortfolioGrid } from '../../components/portfolio/PortfolioGrid';
import { PortfolioPledgeModal } from '../../components/portfolio/PledgeModal';
import { useCantonWallet } from '../../providers/WalletConnectProvider';
import { useLedgerPortfolio } from '../../hooks/useLedgerPortfolio';
import { formatTokenBalance, truncatePartyId } from '../../lib/format';
import type { UserEquityToken } from '../../types/ledger';
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
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-slate-500">Loading dashboard…</p>
      </main>
    );
  }

  if (!isConnected || !partyId) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <ConnectWalletFallback />
      </main>
    );
  }

  const pendingYieldValue = Number.parseFloat(totalPendingYield) || 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your portfolio
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Canton party{' '}
            <span className="font-mono text-xs text-slate-800">
              {truncatePartyId(partyId)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Browse pools
          </Link>
          <button
            type="button"
            onClick={() => setPledgeOpen(true)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Pledge tUSDC
          </button>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Equity slots
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{count}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pending yield
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatTokenBalance(pendingYieldValue, currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Network
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Canton DevNet</p>
          <p className="text-xs text-slate-500">Signed via WalletConnect (Canton sandbox)</p>
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

      {transferNft && (
        <TransferModal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          nft={transferNft}
          userPartyId={partyId}
          onTransferSuccess={() => {
            void refetch();
          }}
        />
      )}
    </main>
  );
}
