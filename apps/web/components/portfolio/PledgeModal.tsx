'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchLedgerProperties,
  getLedgerApiUrl,
  type ExecutePledgeParams,
  type LedgerPropertyPool,
} from '@rentyvest/ledger-client';
import { formatTokenBalance } from '../../lib/format';
import type { UserTokenAsset } from '../../types/asset';
import { parseAssetBalance } from '../../types/asset';

const PRIMARY_EMERALD = '#059669';

type PortfolioPledgeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyId: string;
  isSigning: boolean;
  onExecutePledge: (params: ExecutePledgeParams) => Promise<void>;
};

type FaucetAssetsResponse = {
  assets: UserTokenAsset[];
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

async function fetchPartyAssets(partyId: string): Promise<UserTokenAsset[]> {
  const apiUrl = getLedgerApiUrl();
  const response = await fetch(
    `${apiUrl}/faucet/assets?canton_party_id=${encodeURIComponent(partyId)}`,
  );

  if (!response.ok) {
    throw new Error(`Unable to load tUSDC balance (${response.status})`);
  }

  const data = (await response.json()) as FaucetAssetsResponse;
  return data.assets ?? [];
}

export function PortfolioPledgeModal({
  open,
  onOpenChange,
  partyId,
  isSigning,
  onExecutePledge,
}: PortfolioPledgeModalProps) {
  const [pools, setPools] = useState<LedgerPropertyPool[]>([]);
  const [assets, setAssets] = useState<UserTokenAsset[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPool = pools.find((pool) => pool.contract_id === selectedPoolId);
  const slotPrice = selectedPool
    ? Number.parseFloat(selectedPool.payload.slot_price) || 0
    : 0;
  const pledgeAmount = Number.parseFloat(usdcAmount) || 0;
  const slotCount =
    slotPrice > 0 ? Math.max(1, Math.floor(pledgeAmount / slotPrice)) : 0;
  const totalCost = slotCount * slotPrice;

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.canton_contract_id === selectedAssetId),
    [assets, selectedAssetId],
  );

  const slotsRemaining = selectedPool
    ? Math.max(
        selectedPool.payload.total_slots - selectedPool.payload.next_slot_index,
        0,
      )
    : 0;

  const isBusy = isLoadingData || isSigning || isSubmitting;

  const resetForm = useCallback(() => {
    setUsdcAmount('');
    setSelectedAssetId('');
    setSubmitError(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    let cancelled = false;

    async function loadModalData() {
      setIsLoadingData(true);
      setSubmitError(null);

      try {
        const [poolResponse, partyAssets] = await Promise.all([
          fetchLedgerProperties(),
          fetchPartyAssets(partyId),
        ]);

        if (cancelled) {
          return;
        }

        const pendingPools = (poolResponse.properties ?? []).filter(
          (pool) => pool.payload.status === 'Pending',
        );

        setPools(pendingPools);
        setAssets(partyAssets);

        if (pendingPools.length > 0) {
          setSelectedPoolId(pendingPools[0].contract_id);
        }

        const affordable = partyAssets.find(
          (asset) => parseAssetBalance(asset.balance) > 0,
        );
        if (affordable) {
          setSelectedAssetId(affordable.canton_contract_id);
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error ? error.message : 'Unable to load pledge data',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      }
    }

    void loadModalData();

    return () => {
      cancelled = true;
    };
  }, [open, partyId, resetForm]);

  const handleSubmit = async () => {
    if (!selectedPool) {
      setSubmitError('Select a property pool');
      return;
    }

    if (!selectedAsset) {
      setSubmitError('Select a tUSDC holding to fund the pledge');
      return;
    }

    if (slotCount <= 0 || slotPrice <= 0) {
      setSubmitError('Enter a valid tUSDC amount');
      return;
    }

    if (slotCount > slotsRemaining) {
      setSubmitError(`Only ${slotsRemaining} slot(s) remain in this pool`);
      return;
    }

    if (parseAssetBalance(selectedAsset.balance) < totalCost) {
      setSubmitError('Insufficient tUSDC balance for this pledge');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onExecutePledge({
        buyerPartyId: partyId,
        propertyId: selectedPool.payload.property_id,
        amount: totalCost.toFixed(2),
        paymentAssetContractId: selectedAsset.canton_contract_id,
      });

      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Pledge submission failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!isBusy) {
      onOpenChange(nextOpen);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
        <Dialog.Content className="glass-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl focus:outline-none sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

          <div className="border-b border-slate-200 px-5 pb-4 pt-3 sm:px-6">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Pledge tUSDC to a pool
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-600">
              Pledge requires platform cosigning. Core api executes on Canton
              with your buyer party and admin M2M authorization.
            </Dialog.Description>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {(isBusy || isSubmitting) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center backdrop-blur-[1px]">
                <Spinner />
                <p className="text-sm font-medium text-slate-800">
                  {isLoadingData
                    ? 'Loading pools and balances…'
                    : 'Submitting pledge to Canton…'}
                </p>
                {isSubmitting && (
                  <p className="text-xs text-slate-500">
                    Backend is cosigning with the platform admin party.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-5">
              <section className="space-y-2">
                <label
                  htmlFor="pledge-pool"
                  className="text-sm font-semibold text-slate-900"
                >
                  Property pool
                </label>
                <select
                  id="pledge-pool"
                  value={selectedPoolId}
                  disabled={isBusy || pools.length === 0}
                  onChange={(event) => setSelectedPoolId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  {pools.length === 0 ? (
                    <option value="">No pending pools on ledger</option>
                  ) : (
                    pools.map((pool) => (
                      <option key={pool.contract_id} value={pool.contract_id}>
                        {pool.payload.property_title},{' '}
                        {formatTokenBalance(
                          Number.parseFloat(pool.payload.slot_price) || 0,
                          pool.payload.currency,
                        )}{' '}
                        / slot
                      </option>
                    ))
                  )}
                </select>
              </section>

              <section className="space-y-2">
                <label
                  htmlFor="pledge-amount"
                  className="text-sm font-semibold text-slate-900"
                >
                  tUSDC amount
                </label>
                <input
                  id="pledge-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={usdcAmount}
                  disabled={isBusy || !selectedPool}
                  onChange={(event) => setUsdcAmount(event.target.value)}
                  placeholder="e.g. 1000"
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900"
                />
                {selectedPool && slotCount > 0 && (
                  <p className="text-xs text-slate-500">
                    ≈ {slotCount} slot{slotCount === 1 ? '' : 's'}, total{' '}
                    {formatTokenBalance(totalCost, selectedPool.payload.currency)}
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  Payment holding
                </p>
                {assets.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No tUSDC holdings found. Claim from the faucet first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assets.map((asset) => {
                      const balance = parseAssetBalance(asset.balance);
                      const isSelected = selectedAssetId === asset.canton_contract_id;

                      return (
                        <label
                          key={asset.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="pledge_asset"
                            checked={isSelected}
                            disabled={isBusy}
                            onChange={() =>
                              setSelectedAssetId(asset.canton_contract_id)
                            }
                          />
                          <span className="text-sm font-medium text-slate-900">
                            {formatTokenBalance(balance, asset.symbol)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

              {submitError && (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
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
                !selectedPool ||
                !selectedAsset ||
                slotCount <= 0 ||
                pools.length === 0
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_EMERALD }}
            >
              {isBusy ? (
                <>
                  <Spinner />
                  {isSubmitting ? 'Submitting pledge…' : 'Processing'}
                </>
              ) : (
                `Pledge ${slotCount || '0'} slot${slotCount === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
