'use client';

import { formatTokenBalance } from '../../lib/format';
import type { UserEquityToken } from '@rentyvest/ledger-client';

type PortfolioGridProps = {
  tokens: UserEquityToken[];
  isLoading: boolean;
  error: string | null;
  currency: string;
  onRetry?: () => void;
  onTransferToken?: (token: UserEquityToken) => void;
};

function PortfolioCardSkeleton() {
  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-hidden="true"
    >
      <div className="h-2 w-full bg-brand-orange-light animate-pulse" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="h-6 w-[70%] rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        </div>
        <div className="h-10 w-full rounded-xl bg-slate-200 animate-pulse" />
      </div>
    </article>
  );
}

function PortfolioGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading portfolio"
    >
      {Array.from({ length: count }, (_, index) => (
        <PortfolioCardSkeleton key={`portfolio-skeleton-${index}`} />
      ))}
    </div>
  );
}

type EquityCardProps = {
  token: UserEquityToken;
  currency: string;
  onTransfer?: () => void;
};

function EquityCard({ token, currency, onTransfer }: EquityCardProps) {
  const pendingYield = Number.parseFloat(token.pending_yield) || 0;
  const symbol = token.currency || currency;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="h-1.5 bg-brand-orange" aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
            Equity slot
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {token.property_id}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{token.slot_id}</p>
        </header>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Equity share
            </dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">
              {token.equity_share}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Pending yield
            </dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">
              {formatTokenBalance(pendingYield, symbol)}
            </dd>
          </div>
        </dl>

        {token.transfer_locked && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Transfers locked by compliance hold
          </p>
        )}

        {!token.transfer_locked && onTransfer && (
          <button
            type="button"
            onClick={onTransfer}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Transfer NFT
          </button>
        )}

        <p className="mt-auto truncate text-xs text-slate-400" title={token.contract_id}>
          NFT {token.contract_id.slice(0, 18)}…
        </p>
      </div>
    </article>
  );
}

export function PortfolioGrid({
  tokens,
  isLoading,
  error,
  currency,
  onRetry,
  onTransferToken,
}: PortfolioGridProps) {
  if (isLoading) {
    return <PortfolioGridSkeleton count={Math.max(tokens.length, 3)} />;
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-900">
          Unable to load portfolio
        </h2>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={() => void onRetry()}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-red-900 px-4 text-sm font-semibold text-white hover:bg-red-800"
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  if (tokens.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No equity tokens yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pledge tUSDC into an active property pool to mint your first on-chain
          equity slot NFT.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Portfolio equity tokens">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tokens.map((token) => (
          <EquityCard
            key={token.contract_id}
            token={token}
            currency={currency}
            onTransfer={
              onTransferToken && !token.transfer_locked
                ? () => onTransferToken(token)
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
