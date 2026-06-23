export type TransferableNFT = {
  id: string;
  propertyName: string;
  slotNumber: number;
  tokenId: string | null;
  pendingYield: number;
};

export type TransferNFTRequest = {
  recipient_party_id: string;
  yield_transfer_acknowledged: boolean;
};

export type TransferNFTResponse = {
  transfer_id: string;
  nft_id: string;
  recipient_party_id: string;
};
