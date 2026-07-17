import { NextRequest, NextResponse } from 'next/server';
import { getCoreApiUrl } from '../../../lib/api/coreApiUrl';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = new Headers({ 'Content-Type': 'application/json' });

  const cantonPartyId = request.headers.get('X-Canton-Party-Id');
  if (cantonPartyId) {
    headers.set('X-Canton-Party-Id', cantonPartyId);
  }

  try {
    const response = await fetch(`${getCoreApiUrl()}/faucet/usdc`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { detail: 'Unable to reach core api for faucet claim' },
      { status: 502 },
    );
  }
}
