'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { formatNaira, truncatePartyId } from '../../lib/format';
import { transferNFT } from '../../lib/nft-transfer';
import type { TransferableNFT } from '../../types/nft';

const PRIMARY_ORANGE = '#F97316';
const ERROR_RED = '#DC2626';

type TransferStep = 'warning' | 'input' | 'confirmation';

type TransferFormValues = {
  recipient_party_id: string;
  yield_transfer_acknowledged: boolean;
};

type TransferModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nft: TransferableNFT;
  userPartyId: string;
  onClaimYield?: () => void;
  onTransferSuccess?: (transferId: string) => void;
};

function createTransferSchema(userPartyId: string) {
  return z.object({
    recipient_party_id: z
      .string()
      .trim()
      .min(1, 'Recipient Party ID is required')
      .regex(/^party::.+$/, 'Party ID must start with party::')
      .refine(
        (value) => value !== userPartyId,
        'Recipient Party ID cannot match your own Party ID',
      ),
    yield_transfer_acknowledged: z.boolean(),
  });
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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

export function TransferModal({
  open,
  onOpenChange,
  nft,
  userPartyId,
  onClaimYield,
  onTransferSuccess,
}: TransferModalProps) {
  const { getAccessToken } = usePrivy();
  const [step, setStep] = useState<TransferStep>(
    nft.pendingYield > 0 ? 'warning' : 'input',
  );
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transferSchema = useMemo(
    () => createTransferSchema(userPartyId),
    [userPartyId],
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    mode: 'onChange',
    defaultValues: {
      recipient_party_id: '',
      yield_transfer_acknowledged: nft.pendingYield <= 0,
    },
  });

  const recipientPartyId = watch('recipient_party_id');
  const yieldAcknowledged = watch('yield_transfer_acknowledged');

  const resetFlow = useCallback(() => {
    setStep(nft.pendingYield > 0 ? 'warning' : 'input');
    setShowAcknowledgement(false);
    setSubmitError(null);
    setIsSubmitting(false);
    reset({
      recipient_party_id: '',
      yield_transfer_acknowledged: nft.pendingYield <= 0,
    });
  }, [nft.pendingYield, reset]);

  useEffect(() => {
    if (!open) {
      resetFlow();
    }
  }, [open, resetFlow]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(nextOpen);
    }
  };

  const proceedFromWarning = () => {
    if (!showAcknowledgement) {
      setShowAcknowledgement(true);
      return;
    }

    if (!yieldAcknowledged) {
      return;
    }

    setStep('input');
  };

  const proceedToConfirmation = async () => {
    const valid = await trigger('recipient_party_id');
    if (!valid) {
      return;
    }

    setStep('confirmation');
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication is required to transfer this NFT');
      }

      const response = await transferNFT(
        nft.id,
        {
          recipient_party_id: values.recipient_party_id.trim(),
          yield_transfer_acknowledged: true,
        },
        accessToken,
      );

      onTransferSuccess?.(response.transfer_id);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'NFT transfer failed';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Transfer NFT
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-600">
              Send slot ownership to another Canton party on the secondary market.
            </Dialog.Description>
          </div>

          {nft.pendingYield > 0 && (
            <div
              className="border-b px-5 py-4 text-sm text-white sm:px-6"
              style={{ backgroundColor: ERROR_RED }}
              role="alert"
            >
              You have {formatNaira(nft.pendingYield)} unclaimed yield. If you
              transfer, the new holder receives this yield. Claim first or proceed
              with transfer.
            </div>
          )}

          <form
            onSubmit={onSubmit}
            className="flex flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-6"
          >
            {step === 'warning' && nft.pendingYield > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-700">
                  Unclaimed yield will transfer with this NFT. You can claim it
                  first or continue and assign the yield to the recipient.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onClaimYield?.()}
                    disabled={isSubmitting}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Claim Yield First
                  </button>
                  <button
                    type="button"
                    onClick={proceedFromWarning}
                    disabled={isSubmitting || (showAcknowledgement && !yieldAcknowledged)}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: PRIMARY_ORANGE }}
                  >
                    {showAcknowledgement ? 'Continue to Transfer' : 'Continue Anyway'}
                  </button>
                </div>

                {showAcknowledgement && (
                  <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={yieldAcknowledged}
                      onChange={(event) =>
                        setValue('yield_transfer_acknowledged', event.target.checked, {
                          shouldValidate: true,
                        })
                      }
                    />
                    <span>
                      I understand that {formatNaira(nft.pendingYield)} in pending
                      yield will be transferred to the recipient with this NFT.
                    </span>
                  </label>
                )}
              </div>
            )}

            {step === 'input' && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="recipient_party_id"
                    className="mb-2 block text-sm font-medium text-slate-800"
                  >
                    Recipient Canton Party ID
                  </label>
                  <input
                    id="recipient_party_id"
                    type="text"
                    autoComplete="off"
                    placeholder="party::1220abcd..."
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#F97316] focus:border-[#F97316] focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                    {...register('recipient_party_id')}
                  />
                  {errors.recipient_party_id && (
                    <p className="mt-2 text-sm" style={{ color: ERROR_RED }}>
                      {errors.recipient_party_id.message}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void proceedToConfirmation()}
                  disabled={isSubmitting || !recipientPartyId.trim()}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: PRIMARY_ORANGE }}
                >
                  Review Transfer
                </button>
              </div>
            )}

            {step === 'confirmation' && (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Property</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {nft.propertyName}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Slot</dt>
                      <dd className="text-right font-medium text-slate-900">
                        #{nft.slotNumber}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">NFT</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {nft.tokenId ?? nft.id}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Yield transferred</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {formatNaira(nft.pendingYield)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-slate-500">Recipient</dt>
                      <dd className="text-right font-mono text-xs font-medium text-slate-900 sm:text-sm">
                        {truncatePartyId(recipientPartyId.trim())}
                      </dd>
                    </div>
                  </dl>
                </div>

                {submitError && (
                  <p
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm"
                    style={{ color: ERROR_RED }}
                    role="alert"
                  >
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: PRIMARY_ORANGE }}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      Submitting transfer…
                    </>
                  ) : (
                    'Confirm Transfer'
                  )}
                </button>
              </div>
            )}
          </form>

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-6">
            {step !== 'warning' && step !== 'input' && (
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back
              </button>
            )}
            {step === 'input' && nft.pendingYield > 0 && (
              <button
                type="button"
                onClick={() => setStep('warning')}
                disabled={isSubmitting}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back
              </button>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="ml-auto text-sm font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
