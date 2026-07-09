/** Frontend-friendly equity token projection from core-api. */
export type UserEquityToken = {
  contract_id: string;
  template_id: string;
  owner: string;
  property_id: string;
  pool_id: string;
  slot_index: number;
  slot_id: string;
  pending_yield: string;
  currency: string;
  transfer_locked: boolean;
  equity_share: string;
};

export type PropertyNFTPayload = {
  platform_admin: string;
  original_holder: string;
  current_holder: string;
  pool_id: string;
  property_id: string;
  slot_index: number;
  pending_yield: string;
  currency: string;
  transfer_locked: boolean;
};

export type PropertyNFTContract = {
  contract_id: string;
  template_id: string;
  payload: PropertyNFTPayload;
};

export type LedgerUserNFTsResponse = {
  party_id: string;
  tokens: UserEquityToken[];
  nfts: PropertyNFTContract[];
  count: number;
  total_pending_yield: string;
  currency?: string;
};

export type LoopWalletSubmitPayload = {
  actAs: string[];
  readAs: string[];
  commandId?: string;
  disclosedContracts: unknown[];
  commands: unknown[];
};

export type PreparedLedgerCommand = {
  command_id: string;
  template_id: string;
  contract_id: string;
  choice: string;
  choice_argument: Record<string, unknown>;
  controller_note?: string;
  loop_submit: LoopWalletSubmitPayload;
};

export type PreparePledgeRequest = {
  pool_contract_id: string;
  buyer_party_id: string;
  slot_count: number;
  meta_uri: string;
  payment_asset_contract_id: string;
};

export type PreparePledgeResponse = {
  prepared: PreparedLedgerCommand;
};

/** Canton dApp SDK prepareExecute shape returned by prepare/transfer-nft. */
export type PrepareExecutePayload = {
  commandId: string;
  commands: unknown[];
  actAs: string[];
  readAs: string[];
  disclosedContracts: unknown[];
};

export type PrepareTransferNFTRequest = {
  ownerPartyId: string;
  contractId: string;
  newOwnerPartyId: string;
  transferId?: string;
};

export type PrepareTransferNFTResponse = {
  prepared: PreparedLedgerCommand;
  prepare_execute: PrepareExecutePayload;
};

export type BackendExecutePledgeRequest = {
  buyerPartyId: string;
  propertyId: string;
  amount: string;
  paymentAssetContractId?: string;
};

export type BackendExecutePledgeResponse = {
  commandId: string;
  updateId?: string;
  poolContractId?: string;
  paymentAssetContractId: string;
  slotCount: number;
  mintedNftContractIds?: string[];
};

export type LedgerPropertyPoolPayload = {
  pool_id: string;
  property_id: string;
  property_title: string;
  total_slots: number;
  next_slot_index: number;
  slot_price: string;
  currency: string;
  status: string;
};

export type LedgerPropertyPool = {
  contract_id: string;
  template_id: string;
  payload: LedgerPropertyPoolPayload;
};

export type LedgerPropertiesResponse = {
  properties: LedgerPropertyPool[];
  count: number;
};

export type PledgeExecutionResult = {
  commandId: string;
  updateId?: string;
  slotCount?: number;
  mintedNftContractIds?: string[];
};

/** Backend M2M co-sign path — not WalletConnect. */
export type ExecutePledgeParams = BackendExecutePledgeRequest;
