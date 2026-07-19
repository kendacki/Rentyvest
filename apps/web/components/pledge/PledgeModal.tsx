'use client';

import * as Dialog from '@radix-ui/react-dialog';
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

const PRIMARY_EMERALD = '#059669';

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
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
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

  const selectedAsset = assets.find(
    (asset) => asset.canton_contract_id === selectedAssetId,
  );

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
    setSelectedAssetId(null);
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

    if (!selectedAsset) {
      setSubmitError('Select a tUSDC holding with sufficient balance');
      return;
    }

    if (!property.canton_pool_contract_id) {
      setSubmitError(
        'The on-chain pool for this property is still being set up. Try again in a minute.',
      );
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await executeBackendPledge({
        buyerPartyId: partyId,
        propertyId: property.id,
        amount: totalCost.toFixed(2),
        paymentAssetContractId: selectedAsset.canton_contract_id,
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

  return (
    <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="glass-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl focus:outline-none sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

          <div className="border-b border-slate-200 px-5 pb-4 pt-3 sm:px-6">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              {success ? 'Pledge confirmed' : 'Pledge with tUSDC'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-600">
              {property.title}, {formatCurrency(property.unit_price)} per slot
            </Dialog.Description>
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

            {success ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <svg
                    className="h-7 w-7 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {success.slotCount} slot{success.slotCount === 1 ? '' : 's'}{' '}
                    secured in {property.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatTokenBalance(success.totalCost)} settled on Canton and{' '}
                    {success.mintedNftCount} property NFT
                    {success.mintedNftCount === 1 ? '' : 's'} minted to your
                    wallet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl px-8 text-sm font-semibold text-white"
                  style={{ backgroundColor: PRIMARY_EMERALD }}
                >
                  Done
                </button>
              </div>
            ) : (
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
                          Select payment asset
                        </h3>
                        <button
                          type="button"
                          onClick={() => void loadAssets()}
                          disabled={isBusy}
                          className="text-xs font-semibold text-emerald-700 disabled:opacity-50"
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
                                      {formatTokenBalance(
                                        parseAssetBalance(asset.balance),
                                        asset.symbol,
                                      )}
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

                      {!hasSufficientTotalBalance && assets.length > 0 && (
                        <p className="text-xs text-slate-500">
                          Combined balance {formatTokenBalance(totalBalance)} is
                          below the required {formatTokenBalance(totalCost)}.
                          Claim more tUSDC from the faucet.
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
                  </>
                )}
              </div>
            )}
          </div>

          {!success && (
            <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={
                  isBusy ||
                  !isConnected ||
                  !partyId ||
                  !selectedAsset ||
                  !canAffordAsset(selectedAsset, totalCost) ||
                  slotsRemaining <= 0
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: PRIMARY_EMERALD }}
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
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
