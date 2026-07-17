'use client';

import { useRef, useState } from 'react';

type HeroImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  error?: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

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
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/listing-images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let message = `Upload failed (${response.status})`;
        try {
          const problem = (await response.json()) as { detail?: string };
          message = problem.detail ?? message;
        } catch {
          // Response was not JSON.
        }
        throw new Error(message);
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error('Upload succeeded but no image URL was returned.');
      }

      onChange(data.url);
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof Error ? uploadFailure.message : 'Unable to upload image.',
      );
    } finally {
      setUploading(false);
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
              {uploading ? 'Uploading…' : 'Upload hero image'}
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
