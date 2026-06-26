import type { Party } from '@daml/types';

import type { UserTokenAsset } from '../../types/asset';
import { getCantonClient } from './client';
import { getDefaultTokenSymbol } from './config';
import { formatCantonError } from './errors';
import { Asset, type AssetPayload } from './templates';

function isAssetUnlocked(lock: AssetPayload['lock']): boolean {
  return lock === null || lock === undefined;
}

function mapLedgerAsset(
  contractId: string,
  payload: AssetPayload,
): UserTokenAsset | null {
  if (!isAssetUnlocked(payload.lock)) {
    return null;
  }

  const balance = String(payload.amount);
  if (Number.parseFloat(balance) <= 0) {
    return null;
  }

  const symbol = payload.instrumentId?.id ?? getDefaultTokenSymbol();
  if (symbol !== getDefaultTokenSymbol()) {
    return null;
  }
  const now = new Date().toISOString();

  return {
    id: contractId,
    user_id: '',
    canton_contract_id: contractId,
    owner_party_id: payload.owner,
    balance,
    symbol,
    instrument_id: symbol,
    locked: false,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Query Test USDC `Asset` holdings from the Seaport participant via `@c7/ledger`.
 */
export async function fetchLedgerUserAssets(
  userToken: string,
  ownerPartyId?: string,
): Promise<UserTokenAsset[]> {
  const ledger = getCantonClient(userToken);

  let readAsParties: Party[];
  if (ownerPartyId?.trim()) {
    readAsParties = [ownerPartyId.trim()];
  } else {
    readAsParties = await ledger.getTokenActAsParties();
  }

  if (readAsParties.length === 0) {
    throw new Error('Canton token does not grant actAs parties for asset lookup');
  }

  try {
    const contracts = await ledger.query(
      Asset.template,
      undefined,
      false,
      false,
      readAsParties,
    );

    const assets: UserTokenAsset[] = [];

    for (const event of contracts) {
      const mapped = mapLedgerAsset(String(event.contractId), event.payload);
      if (mapped) {
        assets.push(mapped);
      }
    }

    return assets.sort(
      (left, right) =>
        Number.parseFloat(right.balance) - Number.parseFloat(left.balance),
    );
  } catch (error) {
    throw new Error(formatCantonError(error));
  }
}
