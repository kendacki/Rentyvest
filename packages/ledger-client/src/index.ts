export * from './types';
export * from './api/ledger';
export * from './canton/prepare-execute';
export * from './canton/wallet-config';

import {
  executeBackendPledge,
  fetchLedgerProperties,
  fetchUserNFTs,
  getLedgerApiUrl,
  preparePledge,
  prepareTransferNFT,
} from './api/ledger';

/** Namespaced API surface for core-api ledger routes. */
export const ledgerApi = {
  getLedgerApiUrl,
  fetchUserNFTs,
  fetchLedgerProperties,
  executeBackendPledge,
  prepareTransferNFT,
  preparePledge,
};
