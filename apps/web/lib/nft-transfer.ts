import type { TransferNFTRequest, TransferNFTResponse } from '../types/nft';

function getCoreApiUrl(): string {
  const base = process.env.NEXT_PUBLIC_CORE_API_URL ?? 'http://localhost:8080';
  return base.replace(/\/$/, '');
}

export async function transferNFT(
  nftId: string,
  body: TransferNFTRequest,
  accessToken: string,
): Promise<TransferNFTResponse> {
  const response = await fetch(`${getCoreApiUrl()}/nfts/${nftId}/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Transfer failed (${response.status})`;

    try {
      const problem = (await response.json()) as {
        detail?: string;
        title?: string;
      };
      if (problem.detail) {
        message = problem.detail;
      } else if (problem.title) {
        message = problem.title;
      }
    } catch {
      // Response was not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as TransferNFTResponse;
}
