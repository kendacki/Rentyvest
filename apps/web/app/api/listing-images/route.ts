import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

const MAX_BYTES = 5 * 1024 * 1024;

// Issues client-upload tokens so the browser uploads straight to Vercel Blob.
// Serverless request bodies are capped at ~4.5 MB, so files must not pass through here.
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { detail: 'Image uploads are not configured. Set BLOB_READ_WRITE_TOKEN on Vercel.' },
      { status: 503 },
    );
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
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
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
