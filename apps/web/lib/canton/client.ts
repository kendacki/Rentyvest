import {
  Ledger,
  exerciseCmd,
  type CreateEvent,
  type SortedEvents,
} from '@c7/ledger';
import type { Party } from '@daml/types';

import {
  PropertyPool,
  asPropertyPoolContractId,
  type PledgeChoiceArgument,
} from './templates';

import {
  getCantonLedgerUrl,
  getPledgeMetaUriBase,
} from './config';

export type CantonLedgerClient = Ledger;

export type SubmitPledgeTxParams = {
  /** Active `PropertyPool` contract on Canton. */
  poolContractId: string;
  /** Buyer's ledger party ID (from token exchange or Privy-linked profile). */
  buyerPartyId: string;
  /** Buyer's unlocked Test USDC `Asset` contract ID. */
  paymentAssetCid: string;
  /** Number of fractional slots to pledge. */
  slotCount: number;
  /**
   * Off-ledger metadata URI stamped on minted NFTs.
   * Defaults to `{PLEDGE_META_URI_BASE}/{commandId}` when omitted.
   */
  metaUri?: string;
  /**
   * Platform admin party that co-controls `Pledge`.
   * Defaults to `NEXT_PUBLIC_CANTON_ADMIN_PARTY_ID`.
   */
  platformAdminPartyId?: string;
  /** Optional Canton command id; generated when omitted. */
  commandId?: string;
};

export type SubmitPledgeTxResult = {
  commandId: string;
  updateId?: string;
  poolContractId?: string;
  paymentAssetContractId?: string;
  buyerChangeContractId?: string;
  mintedNftContractIds: string[];
  events: SortedEvents<object, unknown>;
};

let cachedClient: Ledger | null = null;
let cachedToken: string | null = null;

function getPlatformAdminPartyId(): string {
  return (process.env.NEXT_PUBLIC_CANTON_ADMIN_PARTY_ID ?? '').trim();
}

function createCommandId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `pledge-${crypto.randomUUID()}`;
  }

  return `pledge-${Date.now()}`;
}

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }

  return trimmed;
}

function templateIdMatchesSuffix(templateId: string, suffix: string): boolean {
  return templateId === suffix || templateId.endsWith(suffix);
}

function collectCreatedContractIds(
  events: SortedEvents<object, unknown>,
  templateSuffix: string,
): string[] {
  const contractIds: string[] = [];

  for (const event of events) {
    if (event.type !== 'create') {
      continue;
    }

    const createEvent = event as CreateEvent<object, unknown>;
    if (templateIdMatchesSuffix(createEvent.templateId, templateSuffix)) {
      contractIds.push(String(createEvent.contractId));
    }
  }

  return contractIds;
}

function findCreatedContractId(
  events: SortedEvents<object, unknown>,
  templateSuffix: string,
): string | undefined {
  return collectCreatedContractIds(events, templateSuffix)[0];
}

/**
 * Initialize (or reuse) a Canton JSON Ledger API v2 client for browser use.
 * The JWT is sent on every request via the `Authorization` header inside `@c7/ledger`.
 */
export function getCantonClient(userToken: string): CantonLedgerClient {
  const token = assertNonEmpty(userToken, 'userToken');
  const httpBaseUrl = getCantonLedgerUrl();

  if (!httpBaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_CANTON_LEDGER_URL is required to connect to Canton DevNet',
    );
  }

  if (cachedClient && cachedToken === token) {
    return cachedClient;
  }

  cachedToken = token;
  cachedClient = new Ledger({
    token,
    httpBaseUrl,
    validation: 'logErrors',
  });

  return cachedClient;
}

/** Drop the cached client after logout or token rotation. */
export function resetCantonClient(): void {
  cachedClient = null;
  cachedToken = null;
}

/**
 * Exercise `PropertyPool.Pledge` against the Seaport DevNet participant.
 * Requires a user JWT with `actAs` rights for both platform admin and buyer.
 */
export async function submitPledgeTx(
  userToken: string,
  params: SubmitPledgeTxParams,
): Promise<SubmitPledgeTxResult> {
  const poolContractId = assertNonEmpty(params.poolContractId, 'poolContractId');
  const buyerPartyId = assertNonEmpty(params.buyerPartyId, 'buyerPartyId');
  const paymentAssetCid = assertNonEmpty(
    params.paymentAssetCid,
    'paymentAssetCid',
  );

  if (!Number.isInteger(params.slotCount) || params.slotCount <= 0) {
    throw new Error('slotCount must be a positive integer');
  }

  const platformAdminPartyId = assertNonEmpty(
    params.platformAdminPartyId ?? getPlatformAdminPartyId(),
    'platformAdminPartyId (set NEXT_PUBLIC_CANTON_ADMIN_PARTY_ID)',
  );

  const commandId = params.commandId?.trim() || createCommandId();
  const metaUri =
    params.metaUri?.trim() ||
    `${getPledgeMetaUriBase()}/${commandId.replace(/^pledge-/, '')}`;

  const pledgeArgument: PledgeChoiceArgument = {
    buyer: buyerPartyId,
    slot_count: params.slotCount,
    meta_uri: metaUri,
    paymentAssetCid,
  };

  const actAs: Party[] = [platformAdminPartyId, buyerPartyId];
  const ledger = getCantonClient(userToken);
  const events = await ledger.submit(
    [
      exerciseCmd(
        asPropertyPoolContractId(poolContractId),
        PropertyPool.Pledge,
        pledgeArgument,
      ),
    ],
    actAs,
    commandId,
  );

  const assetContractIds = collectCreatedContractIds(events, ':Asset');

  return {
    commandId,
    poolContractId: findCreatedContractId(events, ':PropertyPool'),
    paymentAssetContractId: assetContractIds[0],
    buyerChangeContractId: assetContractIds[1],
    mintedNftContractIds: collectCreatedContractIds(events, ':PropertyNFT'),
    events,
  };
}
