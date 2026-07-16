'use client';

import { useEffect, useState } from 'react';

type WalletConnectQrModalProps = {
  open: boolean;
  uri: string | null;
  onClose: () => void;
};

export function WalletConnectQrModal({
  open,
  uri,
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

  if (!open || !uri) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wc-qr-title"
    >
      <div className="glass-panel w-full max-w-sm rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">WalletConnect</p>
            <h2 id="wc-qr-title" className="mt-1 text-lg font-bold text-black">
              Scan to connect
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Open a Canton-compatible wallet and approve the session on{' '}
              <span className="font-medium">sandbox</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            aria-label="Close WalletConnect modal"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="WalletConnect QR code"
              className="h-60 w-60 rounded-2xl border border-slate-200"
            />
          ) : (
            <div className="flex h-60 w-60 items-center justify-center glass-inset text-sm text-slate-500">
              Generating QR…
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            Or approve the connection in your wallet app if a deep link opened
            automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
