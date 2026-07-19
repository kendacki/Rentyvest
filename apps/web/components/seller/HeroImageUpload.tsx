'use client';

import { useRef, useState } from 'react';

type HeroImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  error?: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const COMPRESS_THRESHOLD_BYTES = 150 * 1024;
const MAX_DIMENSION = 1600;
const UPLOAD_URL = '/listing-images';
const UPLOAD_TIMEOUT_MS = 90_000;

async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.size <= COMPRESS_THRESHOLD_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.8);
    });
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}

function uploadViaXhr(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    const timeout = window.setTimeout(() => {
      xhr.abort();
      reject(new Error('Upload timed out — check your connection and try again.'));
    }, UPLOAD_TIMEOUT_MS);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      window.clearTimeout(timeout);
      let payload: { url?: string; detail?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText) as { url?: string; detail?: string };
      } catch {
        // Non-JSON body.
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        resolve(payload.url);
        return;
      }

      reject(
        new Error(
          payload.detail ??
            (xhr.status === 413
              ? 'Image is still too large after compression. Try a smaller file.'
              : `Upload failed (${xhr.status})`),
        ),
      );
    };

    xhr.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Network error during upload. Try again.'));
    };

    xhr.onabort = () => {
      window.clearTimeout(timeout);
      reject(new Error('Upload cancelled.'));
    };

    xhr.open('POST', UPLOAD_URL);
    xhr.send(formData);
  });
}

function UploadSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-brand-orange"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function HeroImageUpload({ value, onChange, error }: HeroImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (JPEG, PNG, WebP, or GIF).');
      return;
    }

    if (file.size > MAX_BYTES) {
      setUploadError('Image must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadError(null);

    try {
      const optimized = await compressImage(file);
      setProgress(1);

      const url = await uploadViaXhr(optimized, (pct) => {
        setProgress(Math.max(1, pct));
      });

      onChange(url);
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof Error ? uploadFailure.message : 'Unable to upload image.',
      );
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div>
      <div className="glass-field mt-1.5 overflow-hidden p-4">
        {value ? (
          <div className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-white/60 bg-white/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Property hero preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="btn-secondary h-9 px-4 text-xs"
              >
                Replace image
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setUploadError(null);
                }}
                disabled={uploading}
                className="h-9 rounded-full border border-neutral-200 bg-white/60 px-4 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-black"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/70 bg-white/25 px-4 py-8 text-center transition-colors hover:border-brand-orange/30 hover:bg-white/35">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFile(file);
                }
              }}
            />
            {uploading ? (
              <UploadSpinner />
            ) : (
              <svg
                className="h-8 w-8 text-neutral-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            )}
            <span className="text-sm font-medium text-brand-black">
              {uploading
                ? progress > 0
                  ? `Uploading… ${progress}%`
                  : 'Preparing image…'
                : 'Upload hero image'}
            </span>
            <span className="text-xs text-neutral-500">
              JPEG, PNG, WebP, or GIF up to 5 MB
            </span>
          </label>
        )}

        {value ? (
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        ) : null}
      </div>

      {uploadError ? <p className="mt-1 text-xs text-red-600">{uploadError}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
