import type { UserTokenAsset } from '../../types/asset';
import { getCoreApiUrl } from './coreApiUrl';

type FaucetAssetsResponse = {
  assets?: UserTokenAsset[];
};

function getBrowserCoreApiUrl(): string | null {
  const base =
    process.env.NEXT_PUBLIC_CORE_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    '';

  const trimmed = base.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

  return withProtocol.replace(/\/$/, '');
}

function buildAssetsUrl(base: string, partyId: string): string {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${prefix}/faucet/assets?canton_party_id=${encodeURIComponent(partyId)}`;
}

export async function fetchFaucetAssets(
  partyId: string,
): Promise<UserTokenAsset[]> {
  const candidates = [''];

  if (typeof window !== 'undefined') {
    const browserCoreApi = getBrowserCoreApiUrl();
    if (browserCoreApi) {
      candidates.push(browserCoreApi);
    }
  }

  for (const base of candidates) {
    try {
      const response = await fetch(buildAssetsUrl(base, partyId), {
        cache: 'no-store',
      });

      if (response.status === 404 || response.status === 502) {
        continue;
      }

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as FaucetAssetsResponse;
      return data.assets ?? [];
    } catch {
      continue;
    }
  }

  return [];
}

export { getCoreApiUrl };
