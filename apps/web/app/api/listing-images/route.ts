import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { detail: 'Image uploads are not configured. Set BLOB_READ_WRITE_TOKEN on Vercel.' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ detail: 'Invalid upload payload' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ detail: 'file is required' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ detail: 'Only image files are allowed' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ detail: 'Image must be 5 MB or smaller' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
  const pathname = `listing-heroes/${Date.now()}-${safeName}`;

  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ detail: 'Unable to store image' }, { status: 500 });
  }
}
