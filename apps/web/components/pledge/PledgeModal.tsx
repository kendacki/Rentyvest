'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { executeBackendPledge } from '@rentyvest/ledger-client';
import { fetchFaucetAssets } from '../../lib/api/faucetAssets';
import {
  formatCurrency,
  formatTokenBalance,
  truncatePartyId,
} from '../../lib/format';
import { useCantonWallet } from '../../providers/CantonWalletProvider';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';
import {
  getSlotsRemaining,
  type Property,
} from '../../types/property';
import {
  parseAssetBalance,
  type UserTokenAsset,
} from '../../types/asset';

type PledgeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onPledgeConfirmed?: () => void;
};

type PledgeSuccess = {
  slotCount: number;
  totalCost: number;
  mintedNftCount: number;
};

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function canAffordAsset(asset: UserTokenAsset, totalCost: number): boolean {
  return parseAssetBalance(asset.balance) >= totalCost;
}

/** Prefer the largest UTXO that covers the pledge; otherwise the largest holding. */
function pickBestPaymentAsset(
  assets: UserTokenAsset[],
  totalCost: number,
): UserTokenAsset | null {
  if (assets.length === 0) {
    return null;
  }

  const sorted = [...assets].sort(
    (left, right) =>
      parseAssetBalance(right.balance) - parseAssetBalance(left.balance),
  );

  return (
    sorted.find((asset) => canAffordAsset(asset, totalCost)) ?? sorted[0] ?? null
  );
}

function CheckBadge() {
  return (
    <span className="animate-check-pop relative inline-flex h-16 w-16 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/20 [animation-iteration-count:2]" />
      <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-brand-orange/30 bg-gradient-to-br from-brand-orange/15 to-brand-orange/30 shadow-[0_8px_24px_rgba(234,88,12,0.3)] backdrop-blur-md">
        <svg
          className="h-8 w-8 text-brand-orange"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path className="animate-check-draw" d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </span>
  );
}

export function PledgeModal({
  open,
  onOpenChange,
  property,
  onPledgeConfirmed,
}: PledgeModalProps) {
  const { isConnected, partyId, walletLabel } = useCantonWallet();

  const [assets, setAssets] = useState<UserTokenAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [slotCount, setSlotCount] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<PledgeSuccess | null>(null);

  const slotsRemaining = getSlotsRemaining(property);
  const totalCost = slotCount * property.unit_price;
  const totalBalance = useMemo(
    () => assets.reduce((sum, asset) => sum + parseAssetBalance(asset.balance), 0),
    [assets],
  );
  const hasSufficientTotalBalance = totalBalance >= totalCost;
  const paymentAsset = useMemo(
    () => pickBestPaymentAsset(assets, totalCost),
    [assets, totalCost],
  );
  const canPayFromSingleHolding = Boolean(
    paymentAsset && canAffordAsset(paymentAsset, totalCost),
  );
  const needsConsolidation =
    assets.length > 1 && hasSufficientTotalBalance && !canPayFromSingleHolding;

  const isBusy = isSubmitting || isLoadingAssets;

  const loadAssets = useCallback(async () => {
    if (!partyId) {
      setAssets([]);
      return;
    }

    setIsLoadingAssets(true);
    try {
      const partyAssets = await fetchFaucetAssets(partyId);
      setAssets(partyAssets);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [partyId]);

  const resetFlow = useCallback(() => {
    setSlotCount(1);
    setSubmitError(null);
    setIsSubmitting(false);
    setSuccess(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetFlow();
      return;
    }
    void loadAssets();
  }, [open, loadAssets, resetFlow]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async () => {
    if (!partyId) {
      setSubmitError('Connect your Canton wallet to pledge');
      return;
    }

    if (!paymentAsset) {
      setSubmitError('No tUSDC holdings found. Claim from the faucet first.');
      return;
    }

    if (!canAffordAsset(paymentAsset, totalCost)) {
      if (needsConsolidation) {
        setSubmitError(
          'Your full wallet balance is ready to use. Choose a slot count your available balance can cover in one go.',
        );
        return;
      }
      setSubmitError('Insufficient tUSDC balance for this pledge');
      return;
    }

    // No canton_pool_contract_id check here: the backend provisions the
    // on-chain pool on demand if the background worker has not yet.

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await executeBackendPledge({
        buyerPartyId: partyId,
        propertyId: property.id,
        amount: totalCost.toFixed(2),
        paymentAssetContractId: paymentAsset.canton_contract_id,
      });

      setSuccess({
        slotCount: result.slotCount ?? slotCount,
        totalCost,
        mintedNftCount:
          result.mintedNftContractIds?.length ?? result.slotCount ?? slotCount,
      });
      onPledgeConfirmed?.();
      void loadAssets();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Pledge submission failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const incrementSlots = () => {
    setSlotCount((current) => Math.min(current + 1, slotsRemaining));
  };

  const decrementSlots = () => {
    setSlotCount((current) => Math.max(current - 1, 1));
  };

  if (success) {
    return (
      <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
          <Dialog.Content className="glass-panel animate-modal-pop fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl font-sans focus:outline-none">
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/50 text-neutral-500 backdrop-blur-md transition-colors hover:bg-white/80 hover:text-brand-black"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="px-6 pb-4 pt-8 text-center sm:px-8">
              <CheckBadge />
              <Dialog.Title asChild>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-brand-black">
                  Pledge confirmed
                </h2>
              </Dialog.Title>
              <p className="section-label mt-2 text-brand-orange">
                Settled on Canton
              </p>
              <Dialog.Description asChild>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">
                  Your pledge for{' '}
                  <span className="font-semibold text-brand-black">
                    {property.title}
                  </span>{' '}
                  is confirmed and your property NFT
                  {success.mintedNftCount === 1 ? ' has' : 's have'} been minted
                  to your wallet.
                </p>
              </Dialog.Description>
            </div>

            <div className="px-6 pb-4 sm:px-8">
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-inset px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    Slots secured
                  </p>
                  <p className="mt-0.5 text-base font-bold text-brand-black">
                    {success.slotCount}
                  </p>
                </div>
                <div className="glass-inset px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    Settled
                  </p>
                  <p className="mt-0.5 text-base font-bold text-brand-black">
                    {formatTokenBalance(success.totalCost)}
                  </p>
                </div>
                <div className="glass-accent px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    NFTs minted
                  </p>
                  <p className="mt-0.5 text-base font-bold text-brand-orange">
                    {success.mintedNftCount}
                  </p>
                </div>
              </div>

              {partyId ? (
                <div className="glass-inset mt-3 flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-xs font-semibold text-neutral-500">
                    Minted to {walletLabel ?? 'Canton wallet'}
                  </p>
                  <p className="text-xs font-semibold text-brand-black">
                    {truncatePartyId(partyId, 8, 8)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 px-6 pb-8 sm:px-8">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="btn-primary h-12 w-full text-sm"
              >
                Browse more properties
              </button>
              <Link href="/dashboard" className="btn-secondary h-12 w-full text-sm">
                View my portfolio
              </Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="glass-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl focus:outline-none sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

          <div className="relative border-b border-slate-200 px-5 pb-4 pt-3 sm:px-6">
            <Dialog.Title className="pr-10 text-lg font-semibold text-slate-900">
              Pledge with tUSDC
            </Dialog.Title>
            <Dialog.Description className="mt-1 pr-10 text-sm text-slate-600">
              {property.title}, {formatCurrency(property.unit_price)} per slot
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                disabled={isSubmitting}
                className="absolute right-4 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/50 text-neutral-500 backdrop-blur-md transition-colors hover:bg-white/80 hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {isSubmitting && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center backdrop-blur-[1px]">
                <Spinner />
                <p className="text-sm font-medium text-slate-800">
                  Submitting transaction to Canton...
                </p>
                <p className="text-xs text-slate-500">
                  The platform co-signs your pledge, this can take up to a
                  minute.
                </p>
              </div>
            )}

            <div className="space-y-6">
                {!isConnected || !partyId ? (
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      Connect your Canton wallet
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Connect Loop or a Canton wallet to load your tUSDC and
                      pledge for slots in this property.
                    </p>
                    <div className="mt-4 flex justify-center">
                      <ConnectWalletButton className="btn-primary h-11 px-6 text-sm" />
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="glass-inset p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Slots
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {slotsRemaining} remaining
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={decrementSlots}
                            disabled={isBusy || slotCount <= 1}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Decrease slot count"
                          >
                            −
                          </button>
                          <span className="min-w-8 text-center text-lg font-semibold text-slate-900">
                            {slotCount}
                          </span>
                          <button
                            type="button"
                            onClick={incrementSlots}
                            disabled={isBusy || slotCount >= slotsRemaining}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Increase slot count"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                        <span className="text-sm font-medium text-slate-600">
                          Total settlement
                        </span>
                        <span className="text-lg font-bold text-slate-900">
                          {formatTokenBalance(totalCost)}
                        </span>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Available tUSDC
                        </h3>
                        <button
                          type="button"
                          onClick={() => void loadAssets()}
                          disabled={isBusy}
                          className="text-xs font-semibold text-brand-orange disabled:opacity-50"
                        >
                          Refresh
                        </button>
                      </div>

                      <p className="text-xs text-slate-500">
                        Connected via {walletLabel ?? 'Canton wallet'},{' '}
                        {truncatePartyId(partyId, 10, 8)}
                      </p>

                      {isLoadingAssets ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          Loading tUSDC holdings...
                        </div>
                      ) : assets.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          No tUSDC holdings found for this wallet. Claim tUSDC
                          from the faucet first, then hit Refresh.
                        </div>
                      ) : (
                        <div
                          className={`glass-inset px-4 py-4 ${
                            hasSufficientTotalBalance
                              ? 'border-brand-orange/30'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                                Wallet balance
                              </p>
                              <p className="mt-1 text-xl font-bold tracking-[-0.02em] text-brand-black">
                                {formatTokenBalance(totalBalance, 'tUSDC')}
                              </p>
                            </div>
                            {hasSufficientTotalBalance ? (
                              <span className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-orange">
                                Ready
                              </span>
                            ) : (
                              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                                Low balance
                              </span>
                            )}
                          </div>
                          {assets.length > 1 ? (
                            <p className="mt-2 text-xs text-neutral-500">
                              All your tUSDC is shown here as one wallet
                              balance, ready for this pledge.
                            </p>
                          ) : null}
                        </div>
                      )}

                      {!hasSufficientTotalBalance && assets.length > 0 ? (
                        <p className="text-xs text-slate-500">
                          You need {formatTokenBalance(totalCost)} for this
                          pledge. Claim more tUSDC from the faucet.
                        </p>
                      ) : null}

                      {needsConsolidation ? (
                        <p className="text-xs text-amber-700">
                          Your wallet balance is ready. Pick a slot count that
                          fits what you can spend in one confirmation.
                        </p>
                      ) : null}
                    </section>

                    {submitError && (
                      <div
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        role="alert"
                      >
                        {submitError}
                      </div>
                    )}
                  </>
                )}
              </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                isBusy ||
                !isConnected ||
                !partyId ||
                !paymentAsset ||
                !canPayFromSingleHolding ||
                slotsRemaining <= 0
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Processing pledge
                </>
              ) : (
                `Pledge ${slotCount} slot${slotCount === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
