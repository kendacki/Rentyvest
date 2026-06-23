import type {
  ListAssetsResponse,
  MergeAssetsResponse,
} from '../types/asset';
import type { Pledge } from '../types/pledge';

function getCoreApiUrl(): string {
  const base = process.env.NEXT_PUBLIC_CORE_API_URL ?? 'http://localhost:8080';
  return base.replace(/\/$/, '');
}

type ProblemDetails = {
  code?: string;
  title?: string;
  detail?: string;
  status?: number;
};

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

export type CreatePledgeRequest = {
  property_id: string;
  slot_count: number;
  payment_asset_contract_id: string;
};

export type CreatePledgeResponse = {
  pledge: Pledge;
  canton_command_id: string;
  canton_update_id?: string;
  pool_contract_id?: string;
  payment_asset_contract_id?: string;
  minted_nft_contract_ids?: string[];
};

export async function fetchUserAssets(accessToken: string): Promise<ListAssetsResponse> {
  const response = await fetch(`${getCoreApiUrl()}/nfts/assets`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readProblem(response, `Unable to load assets (${response.status})`));
  }

  return (await response.json()) as ListAssetsResponse;
}

export async function mergeUserAssets(accessToken: string): Promise<MergeAssetsResponse> {
  const response = await fetch(`${getCoreApiUrl()}/nfts/assets/merge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readProblem(response, `Asset merge failed (${response.status})`));
  }

  return (await response.json()) as MergeAssetsResponse;
}

export async function createPledge(
  body: CreatePledgeRequest,
  accessToken: string,
  idempotencyKey: string,
): Promise<CreatePledgeResponse> {
  const response = await fetch(`${getCoreApiUrl()}/pledges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readProblem(response, `Pledge failed (${response.status})`));
  }

  return (await response.json()) as CreatePledgeResponse;
}
