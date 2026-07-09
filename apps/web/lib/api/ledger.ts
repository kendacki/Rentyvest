import type {
  BackendExecutePledgeRequest,
  BackendExecutePledgeResponse,
  LedgerPropertiesResponse,
  LedgerUserNFTsResponse,
  PreparePledgeRequest,
  PreparePledgeResponse,
  PrepareTransferNFTRequest,
  PrepareTransferNFTResponse,
} from '../../types/ledger';

type ProblemDetails = {
  title?: string;
  detail?: string;
  code?: string;
};

/**
 * Same-origin in the browser (proxied via next.config rewrites); direct URL on SSR.
 */
export function getLedgerApiUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }

  const base =
    process.env.NEXT_PUBLIC_CORE_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8080';

  return base.replace(/\/$/, '');
}

async function readProblem(response: Response, fallback: string): Promise<string> {
  try {
    const problem = (await response.json()) as ProblemDetails;
    if (problem.detail) {
      return problem.detail;
    }
    if (problem.title) {
      return problem.title;
    }
  } catch {
    // Response was not JSON.
  }

  return fallback;
}

function formatFetchError(error: unknown, action: string): Error {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return new Error(
      `Cannot reach core-api for ${action}. Ensure core-api is running and Next.js /api rewrites are configured.`,
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`Unable to ${action}`);
}

function encodePartyPathSegment(partyId: string): string {
  return encodeURIComponent(partyId);
}

/**
 * GET /api/nfts/{partyId}
 * (User spec: /api/ledger/nfts/:partyId — same handler on core-api.)
 */
export async function fetchUserNFTs(partyId: string): Promise<LedgerUserNFTsResponse> {
  const apiUrl = getLedgerApiUrl();
  const path = `${apiUrl}/api/nfts/${encodePartyPathSegment(partyId)}`;

  try {
    const response = await fetch(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const fallback = `Unable to load equity tokens (${response.status})`;
      throw new Error(await readProblem(response, fallback));
    }

    return (await response.json()) as LedgerUserNFTsResponse;
  } catch (error) {
    throw formatFetchError(error, 'load your on-ledger portfolio');
  }
}

/** GET /api/properties — active PropertyPool contracts on Canton. */
export async function fetchLedgerProperties(): Promise<LedgerPropertiesResponse> {
  const apiUrl = getLedgerApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/properties`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const fallback = `Unable to load property pools (${response.status})`;
      throw new Error(await readProblem(response, fallback));
    }

    return (await response.json()) as LedgerPropertiesResponse;
  } catch (error) {
    throw formatFetchError(error, 'load property pools');
  }
}

/**
 * POST /api/v2/backend-execute/pledge
 * Platform admin + buyer co-sign via backend M2M (WalletConnect cannot co-sign Pledge).
 */
export async function executeBackendPledge(
  request: BackendExecutePledgeRequest,
): Promise<BackendExecutePledgeResponse> {
  const apiUrl = getLedgerApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/v2/backend-execute/pledge`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const fallback = `Unable to execute pledge (${response.status})`;
      throw new Error(await readProblem(response, fallback));
    }

    return (await response.json()) as BackendExecutePledgeResponse;
  } catch (error) {
    throw formatFetchError(error, 'execute pledge on Canton');
  }
}

/**
 * POST /api/ledger/prepare/transfer-nft
 * Prepare-only TransferNFT payload for WalletConnect signing.
 */
export async function prepareTransferNFT(
  request: PrepareTransferNFTRequest,
): Promise<PrepareTransferNFTResponse> {
  const apiUrl = getLedgerApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/ledger/prepare/transfer-nft`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const fallback = `Unable to prepare NFT transfer (${response.status})`;
      throw new Error(await readProblem(response, fallback));
    }

    return (await response.json()) as PrepareTransferNFTResponse;
  } catch (error) {
    throw formatFetchError(error, 'prepare NFT transfer');
  }
}

/**
 * POST /api/ledger/prepare/pledge
 * (Legacy prepare-only path — prefer executeBackendPledge for Pledge.)
 */
export async function preparePledge(
  request: PreparePledgeRequest,
): Promise<PreparePledgeResponse> {
  const apiUrl = getLedgerApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/ledger/prepare/pledge`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const fallback = `Unable to prepare pledge (${response.status})`;
      throw new Error(await readProblem(response, fallback));
    }

    return (await response.json()) as PreparePledgeResponse;
  } catch (error) {
    throw formatFetchError(error, 'prepare pledge transaction');
  }
}
