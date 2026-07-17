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
    const response = await fetch(upstream, { cache: 'no-store' });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { detail: 'Unable to reach core api for faucet assets' },
      { status: 502 },
    );
  }
}
