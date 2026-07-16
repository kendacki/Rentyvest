'use client';

import { truncatePartyId } from '../../lib/format';
import { useWalletConnect } from '../../providers/WalletConnectProvider';

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
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

export function WalletConnectSignIn() {
  const {
    isMounted,
    isReady,
    isConnecting,
    isConnected,
    partyId,
    networkId,
    initError,
    connect,
    disconnect,
  } = useWalletConnect();

  if (!isMounted || !isReady) {
    return (
      <article className="card-surface overflow-hidden p-6">
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-neutral-600">
          <Spinner />
          <span>Preparing Canton wallet…</span>
        </div>
      </article>
    );
  }

  if (initError) {
    return (
      <article className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-950">
          WalletConnect not configured
        </h2>
        <p className="mt-2 text-sm text-amber-900">{initError}</p>
      </article>
    );
  }

  if (isConnected && partyId) {
    return (
      <article className="card-surface overflow-hidden">
        <div className="border-b border-orange-100 bg-gradient-to-br from-brand-orange-light to-white px-5 py-5 sm:px-6">
          <p className="section-label">Connected</p>
          <h2 className="mt-1 text-xl font-bold text-brand-black">
            Canton Wallet
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Your party is linked via WalletConnect on{' '}
            {networkId ?? 'Canton sandbox'}.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Canton party ID
            </p>
            <p
              className="mt-1 break-all font-mono text-sm text-brand-black"
              title={partyId}
            >
              {truncatePartyId(partyId, 18, 12)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void disconnect();
            }}
            className="btn-secondary h-11 w-full"
          >
            Disconnect wallet
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="card-surface overflow-hidden">
      <div className="border-b border-neutral-800 bg-gradient-to-br from-brand-black via-neutral-900 to-brand-orange/30 px-5 py-6 text-white sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
          Sign in required
        </p>
        <h2 className="mt-1 text-2xl font-bold">Connect Canton Wallet</h2>
        <p className="mt-3 text-sm text-neutral-300">
          Connect any CIP-103 compatible wallet through WalletConnect. Sessions
          target the Canton sandbox network.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <ul className="space-y-2 text-sm text-neutral-600">
          <li className="flex gap-2">
            <span className="font-semibold text-brand-orange">1.</span>
            Open your Canton wallet app or browser extension
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-brand-orange">2.</span>
            Scan the WalletConnect QR code when prompted
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-brand-orange">3.</span>
            Approve the sandbox network session
          </li>
        </ul>

        <button
          type="button"
          onClick={() => {
            void connect();
          }}
          disabled={isConnecting}
          className="btn-primary h-12 w-full disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
        >
          {isConnecting ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Waiting for wallet approval…
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </article>
  );
}
