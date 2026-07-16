'use client';

import { useEffect, useState } from 'react';

type WalletConnectQrModalProps = {
  open: boolean;
  uri: string | null;
  isConnecting?: boolean;
  onClose: () => void;
};

export function WalletConnectQrModal({
  open,
  uri,
  isConnecting = false,
  onClose,
}: WalletConnectQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !uri) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;

    void import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(uri, {
          width: 240,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        }),
      )
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, uri]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wc-qr-title"
    >
      <div className="w-full max-w-sm rounded-[1.75rem] border border-white/20 bg-black/50 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label drop-shadow-sm">WalletConnect</p>
            <h2
              id="wc-qr-title"
              className="mt-1 text-lg font-bold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]"
            >
              Scan to connect
            </h2>
            <p className="mt-1 text-sm text-neutral-200 drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
              Open a Canton-compatible wallet and approve the session on{' '}
              <span className="font-medium text-white">sandbox</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConnecting}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close WalletConnect modal"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <div className="rounded-2xl border border-white/30 bg-white/90 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm">
              <img
                src={qrDataUrl}
                alt="WalletConnect QR code"
                className="h-60 w-60 rounded-xl"
              />
            </div>
          ) : (
            <div className="flex h-60 w-60 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-sm text-neutral-200 backdrop-blur-md">
              {isConnecting ? 'Preparing WalletConnect…' : 'Generating QR…'}
            </div>
          )}

          <p className="text-center text-xs text-neutral-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)]">
            Or approve the connection in your wallet app if a deep link opened
            automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
