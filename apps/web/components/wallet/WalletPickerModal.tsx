'use client';

import { useEffect } from 'react';

type WalletPickerModalProps = {
  open: boolean;
  isConnecting?: boolean;
  onClose: () => void;
  onConnectLoop: () => void;
  onConnectWalletConnect: () => void;
};

export function WalletPickerModal({
  open,
  isConnecting = false,
  onClose,
  onConnectLoop,
  onConnectWalletConnect,
}: WalletPickerModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-picker-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[1.75rem] border border-white/20 bg-black/50 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label drop-shadow-sm">Connect wallet</p>
            <h2
              id="wallet-picker-title"
              className="mt-1 text-lg font-bold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]"
            >
              Connect your wallet
            </h2>
            <p className="mt-1 text-sm text-neutral-200">
              Loop is recommended. Other wallets work too.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConnecting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onConnectLoop}
            disabled={isConnecting}
            className="flex w-full items-center gap-4 rounded-2xl border border-brand-orange/40 bg-brand-orange/15 px-4 py-4 text-left transition-colors hover:border-brand-orange hover:bg-brand-orange/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
              Loop
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Loop
                </span>
                <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Recommended
                </span>
              </span>
              <span className="mt-1 block text-xs text-neutral-300">
                Fastest way to sign in.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onConnectWalletConnect}
            disabled={isConnecting}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-left transition-colors hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6M12 9v6"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-white">
                Another wallet
              </span>
              <span className="mt-1 block text-xs text-neutral-300">
                Browser extension or mobile app.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
