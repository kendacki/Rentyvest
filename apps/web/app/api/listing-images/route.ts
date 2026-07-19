import { put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Primary path: Vercel Blob client uploads (browser -> Blob directly), which
// avoids the ~4.5 MB serverless body limit. A legacy multipart fallback keeps
// stale cached clients working for files under that platform limit.
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { detail: 'Image uploads are not configured. Set BLOB_READ_WRITE_TOKEN on Vercel.' },
      { status: 503 },
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    return legacyFormUpload(request);
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ detail: 'Invalid upload payload' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // No post-upload bookkeeping needed; the form stores the returned URL.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unable to store image';
    return NextResponse.json({ detail }, { status: 400 });
  }
}

async function legacyFormUpload(request: Request): Promise<NextResponse> {
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
