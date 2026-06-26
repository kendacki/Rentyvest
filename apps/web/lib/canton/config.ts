const DEFAULT_PROPERTY_POOL_TEMPLATE = 'RentyVest.PropertyPool:PropertyPool';
const DEFAULT_USDC_ASSET_TEMPLATE = 'RentyVest.TestUSDC:Asset';
const DEFAULT_USDC_ISSUER_TEMPLATE = 'RentyVest.TestUSDC:USDCIssuer';
const DEFAULT_TOKEN_SYMBOL = 'tUSDC';

export function getCantonLedgerUrl(): string {
  return (process.env.NEXT_PUBLIC_CANTON_LEDGER_URL ?? '').replace(/\/$/, '');
}

export function getDamlPackageId(): string {
  return (process.env.NEXT_PUBLIC_CANTON_DAML_PACKAGE_ID ?? '').trim();
}

export function getUsdcIssuerContractId(): string {
  return (process.env.NEXT_PUBLIC_USDC_CONTRACT_ID ?? '').trim();
}

export function getPropertyPoolTemplateId(): string {
  return qualifyTemplateId(
    process.env.NEXT_PUBLIC_CANTON_TEMPLATE_PROPERTY_POOL ??
      DEFAULT_PROPERTY_POOL_TEMPLATE,
  );
}

export function getUsdcAssetTemplateId(): string {
  return qualifyTemplateId(
    process.env.NEXT_PUBLIC_CANTON_TEMPLATE_USDC_ASSET ??
      DEFAULT_USDC_ASSET_TEMPLATE,
  );
}

export function getUsdcIssuerTemplateId(): string {
  return qualifyTemplateId(
    process.env.NEXT_PUBLIC_CANTON_TEMPLATE_USDC_ISSUER ??
      DEFAULT_USDC_ISSUER_TEMPLATE,
  );
}

export function getDefaultTokenSymbol(): string {
  return DEFAULT_TOKEN_SYMBOL;
}

const DEFAULT_PLEDGE_META_URI_BASE = 'https://api.rentyvest.com/metadata/pledges';

export function getPledgeMetaUriBase(): string {
  return (
    process.env.NEXT_PUBLIC_PLEDGE_META_URI_BASE ?? DEFAULT_PLEDGE_META_URI_BASE
  ).replace(/\/$/, '');
}

/** Prefix Seaport package id when template id is module-local (Module:Entity). */
export function qualifyTemplateId(templateId: string): string {
  const trimmed = templateId.trim();
  const packageId = getDamlPackageId();

  if (!packageId || trimmed.includes(`${packageId}:`)) {
    return trimmed;
  }

  const segments = trimmed.split(':');
  if (segments.length >= 3) {
    return trimmed;
  }

  return `${packageId}:${trimmed}`;
}
