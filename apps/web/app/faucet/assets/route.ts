import { NextRequest, NextResponse } from 'next/server';
import { getCoreApiUrl } from '../../../lib/api/coreApiUrl';

export async function GET(request: NextRequest) {
  const cantonPartyId = request.nextUrl.searchParams.get('canton_party_id');

  if (!cantonPartyId?.trim()) {
    return NextResponse.json(
      { detail: 'canton_party_id query parameter is required' },
      { status: 400 },
    );
  }

  const upstream = `${getCoreApiUrl()}/faucet/assets?canton_party_id=${encodeURIComponent(cantonPartyId)}`;

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
      return NextResponse.json({ assets: [] });
    }
  } catch {
    // Fall through to empty holdings when core-api is unavailable.
  }

  return NextResponse.json({ assets: [] });
}
