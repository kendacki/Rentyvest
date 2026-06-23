'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatCurrency,
  formatTokenBalance,
  truncatePartyId,
} from '../../lib/format';
import { createPledge, mergeUserAssets } from '../../lib/pledge';
import { useUserAssets } from '../../hooks/useUserAssets';
import {
  getSlotsRemaining,
  type Property,
} from '../../types/property';
import {
  parseAssetBalance,
  sumAssetBalances,
  type UserTokenAsset,
} from '../../types/asset';

const PRIMARY_EMERALD = '#059669';

type PledgeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onPledgeConfirmed?: () => void;
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

export function PledgeModal({
  open,
  onOpenChange,
  property,
  onPledgeConfirmed,
}: PledgeModalProps) {
  const { getAccessToken } = usePrivy();
  const { assets, isLoading, isValidating, error, refetch } = useUserAssets({
    enabled: open,
  });

  const [slotCount, setSlotCount] = useState(1);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingCanton, setIsSubmittingCanton] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [baselineSlotsFilled, setBaselineSlotsFilled] = useState<number | null>(
    null,
  );

  const slotsRemaining = getSlotsRemaining(property);
  const totalCost = slotCount * property.unit_price;
  const totalBalance = useMemo(() => sumAssetBalances(assets), [assets]);
  const hasSufficientTotalBalance = totalBalance >= totalCost;
  const hasSingleAffordableAsset = useMemo(
    () => assets.some((asset) => canAffordAsset(asset, totalCost)),
    [assets, totalCost],
  );
  const showMergeButton =
    assets.length > 1 && hasSufficientTotalBalance && !hasSingleAffordableAsset;

  const selectedAsset = assets.find(
    (asset) => asset.canton_contract_id === selectedAssetId,
  );

  const isBusy = isSubmittingCanton || awaitingConfirmation || isMerging;

  const resetFlow = useCallback(() => {
    setSlotCount(1);
    setSelectedAssetId(null);
    setSubmitError(null);
    setIsSubmittingCanton(false);
    setIsMerging(false);
    setAwaitingConfirmation(false);
    setBaselineSlotsFilled(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetFlow();
    }
  }, [open, resetFlow]);

  useEffect(() => {
    if (!selectedAssetId && assets.length > 0) {
      const affordable = assets.find((asset) => canAffordAsset(asset, totalCost));
      if (affordable) {
        setSelectedAssetId(affordable.canton_contract_id);
      }
    }
  }, [assets, selectedAssetId, totalCost]);

  useEffect(() => {
    if (selectedAsset && !canAffordAsset(selectedAsset, totalCost)) {
      setSelectedAssetId(null);
    }
  }, [selectedAsset, totalCost]);

  useEffect(() => {
    if (
      awaitingConfirmation &&
      baselineSlotsFilled !== null &&
      property.slots_filled >= baselineSlotsFilled + slotCount
    ) {
      onPledgeConfirmed?.();
      onOpenChange(false);
    }
  }, [
    awaitingConfirmation,
    baselineSlotsFilled,
    onOpenChange,
    onPledgeConfirmed,
    property.slots_filled,
    slotCount,
  ]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!isBusy) {
      onOpenChange(nextOpen);
    }
  };

  const handleMergeAssets = async () => {
    setSubmitError(null);
    setIsMerging(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication is required to merge assets');
      }

      const response = await mergeUserAssets(accessToken);
      await refetch();
      setSelectedAssetId(response.merged_contract_id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to merge assets';
      setSubmitError(message);
    } finally {
      setIsMerging(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAsset) {
      setSubmitError('Select a Test USDC holding with sufficient balance');
      return;
    }

    setSubmitError(null);
    setIsSubmittingCanton(true);
    setBaselineSlotsFilled(property.slots_filled);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication is required to submit a pledge');
      }

      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `pledge-${Date.now()}`;

      await createPledge(
        {
          property_id: property.id,
          slot_count: slotCount,
          payment_asset_contract_id: selectedAsset.canton_contract_id,
        },
        accessToken,
        idempotencyKey,
      );

      setAwaitingConfirmation(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Pledge submission failed';
      setSubmitError(message);
      setBaselineSlotsFilled(null);
    } finally {
      setIsSubmittingCanton(false);
    }
  };

  const incrementSlots = () => {
    setSlotCount((current) => Math.min(current + 1, slotsRemaining));
  };

  const decrementSlots = () => {
    setSlotCount((current) => Math.max(current - 1, 1));
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl focus:outline-none sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

          <div className="border-b border-slate-200 px-5 pb-4 pt-3 sm:px-6">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Pledge with Test USDC
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-600">
              {property.title} · {formatCurrency(property.unit_price)} per slot
            </Dialog.Description>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {isBusy && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center backdrop-blur-[1px]">
                <Spinner />
                <p className="text-sm font-medium text-slate-800">
                  {isMerging
                    ? 'Consolidating UTXOs on Canton...'
                    : 'Submitting transaction to Canton...'}
                </p>
                {awaitingConfirmation && (
                  <p className="text-xs text-slate-500">
                    Waiting for slot mint confirmation via realtime updates.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                    Select payment asset
                  </h3>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    disabled={isBusy || isLoading || isValidating}
                    className="text-xs font-semibold text-emerald-700 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {isLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    Loading Test USDC holdings...
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                    {error}
                  </div>
                ) : assets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    No Test USDC holdings found. Claim test tokens from the faucet
                    first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assets.map((asset) => {
                      const affordable = canAffordAsset(asset, totalCost);
                      const isSelected =
                        selectedAssetId === asset.canton_contract_id;

                      return (
                        <label
                          key={asset.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                            affordable
                              ? isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-slate-200 bg-white hover:border-emerald-300'
                              : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_asset"
                            value={asset.canton_contract_id}
                            checked={isSelected}
                            disabled={!affordable || isBusy}
                            onChange={() =>
                              setSelectedAssetId(asset.canton_contract_id)
                            }
                            className="mt-1 h-4 w-4 border-slate-300 text-emerald-600"
                          />
                          <span className="flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatTokenBalance(parseAssetBalance(asset.balance), asset.symbol)}
                              </span>
                              {!affordable && (
                                <span className="text-xs font-medium text-slate-500">
                                  Insufficient
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {truncatePartyId(asset.canton_contract_id, 10, 10)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {showMergeButton && (
                  <button
                    type="button"
                    onClick={() => void handleMergeAssets()}
                    disabled={isBusy}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Merge Assets
                  </button>
                )}

                {!hasSufficientTotalBalance && assets.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Combined balance {formatTokenBalance(totalBalance)} is below the
                    required {formatTokenBalance(totalCost)}.
                  </p>
                )}
              </section>

              {submitError && (
                <div
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {submitError}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                isBusy ||
                !selectedAsset ||
                !canAffordAsset(selectedAsset, totalCost) ||
                slotsRemaining <= 0
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_EMERALD }}
            >
              {isBusy ? (
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
