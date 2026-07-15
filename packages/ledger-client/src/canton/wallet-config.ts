const DEFAULT_WC_CHAIN_ID = 'canton:sandbox';

export function getWalletConnectProjectId(): string {
  return (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '').trim();
}

/** CAIP-2 chain id for Canton WalletConnect sessions (e.g. canton:sandbox). */
export function getCantonWalletChainId(): string {
  const configured = (
    process.env.NEXT_PUBLIC_CANTON_WC_CHAIN_ID ??
    process.env.NEXT_PUBLIC_CANTON_NETWORK_ID ??
    ''
  ).trim();

  return configured || DEFAULT_WC_CHAIN_ID;
}

export function getWalletConnectMetadata() {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://rentyvest.com';

  return {
    name: 'RentyVest',
    description: 'Fractional real estate on Canton Network',
    url: origin,
    icons: [`${origin}/favicon.ico`],
  };
}

/** Decode party id from CAIP-10 (`canton:sandbox:party%3A%3A1220...`). */
export function partyIdFromCaip10Account(account: string): string | null {
  const trimmed = account.trim();
  if (!trimmed) {
    return null;
  }

  const segments = trimmed.split(':');
  if (segments.length < 3 || segments[0] !== 'canton') {
    return trimmed.includes('::') ? trimmed : null;
  }

  const encodedParty = segments.slice(2).join(':');
  try {
    return decodeURIComponent(encodedParty);
  } catch {
    return encodedParty;
  }
}
