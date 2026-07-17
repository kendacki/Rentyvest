import { NextRequest, NextResponse } from 'next/server';
import { getCoreApiUrl } from '../../../lib/api/coreApiUrl';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  const body = await request.text();

  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (authorization) {
    headers.set('Authorization', authorization);
  }

  try {
    const response = await fetch(`${getCoreApiUrl()}/listing-requests`, {
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
      { detail: 'Unable to reach core api for listing submission' },
      { status: 502 },
    );
  }
}
