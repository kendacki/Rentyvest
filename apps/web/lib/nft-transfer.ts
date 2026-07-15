import type {
  PrepareExecuteAndWaitResult,
  PrepareExecuteParams,
} from '@canton-network/dapp-sdk';

import {
  prepareTransferNFT,
  resolvePrepareExecuteParams,
} from '@rentyvest/ledger-client';
import type { TransferNFTResponse } from '../types/nft';

export type TransferNFTWithWalletInput = {
  ownerPartyId: string;
  contractId: string;
  recipientPartyId: string;
  transferId?: string;
};

/**
 * Prepare TransferNFT via core-api, then sign and submit with WalletConnect.
 */
export async function transferNFTWithWallet(
  input: TransferNFTWithWalletInput,
  prepareSignExecute: (
    params: PrepareExecuteParams,
  ) => Promise<PrepareExecuteAndWaitResult>,
): Promise<TransferNFTResponse> {
  const transferId =
    input.transferId ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `transfer-${Date.now()}`);

  const { prepared, prepare_execute } = await prepareTransferNFT({
    ownerPartyId: input.ownerPartyId,
    contractId: input.contractId,
    newOwnerPartyId: input.recipientPartyId,
    transferId,
  });

  const wcParams = resolvePrepareExecuteParams(prepared, prepare_execute);
  await prepareSignExecute(wcParams);

  const resolvedTransferId = String(
    prepared.choice_argument?.transfer_id ?? transferId,
  );

  return {
    transfer_id: resolvedTransferId,
    nft_id: input.contractId,
    recipient_party_id: input.recipientPartyId,
  };
}
