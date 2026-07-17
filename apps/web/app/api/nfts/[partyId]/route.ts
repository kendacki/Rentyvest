import { NextRequest, NextResponse } from 'next/server';
import { getCoreApiUrl } from '../../../../lib/api/coreApiUrl';

function emptyPortfolio(partyId: string) {
  return {
    party_id: partyId,
    tokens: [],
    nfts: [],
    count: 0,
    total_pending_yield: '0',
    currency: 'tUSDC',
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { partyId: string } },
) {
  const partyId = decodeURIComponent(params.partyId?.trim() ?? '');

  if (!partyId) {
    return NextResponse.json(
      { detail: 'partyId path segment is required' },
      { status: 400 },
    );
  }

  const upstream = `${getCoreApiUrl()}/api/nfts/${encodeURIComponent(partyId)}`;

  try {
    const response = await fetch(upstream, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const body = await response.text();
      return new NextResponse(body, {
        status: response.status,
        headers: {
          'Content-Type':
            response.headers.get('Content-Type') ?? 'application/json',
        },
      });
    }

    if (response.status === 404) {
      return NextResponse.json(emptyPortfolio(partyId));
    }
  } catch {
    // Fall through when core-api is unavailable.
  }

  return NextResponse.json(emptyPortfolio(partyId));
}
