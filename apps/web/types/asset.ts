export type UserTokenAsset = {
  id: string;
  user_id: string;
  canton_contract_id: string;
  owner_party_id: string;
  balance: string;
  symbol: string;
  instrument_id: string;
  locked: boolean;
  created_at: string;
  updated_at: string;
};

export type ListAssetsResponse = {
  assets: UserTokenAsset[];
};

export type MergeAssetsResponse = {
  merged_contract_id: string;
  archived_contract_ids: string[];
  canton_command_id?: string;
};

export function parseAssetBalance(balance: string): number {
  const value = Number.parseFloat(balance);
  return Number.isFinite(value) ? value : 0;
}

export function sumAssetBalances(assets: UserTokenAsset[]): number {
  return assets.reduce((total, asset) => total + parseAssetBalance(asset.balance), 0);
}
