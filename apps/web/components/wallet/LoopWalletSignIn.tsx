'use client';

import { useCantonWallet } from '../../providers/CantonWalletProvider';

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

export function LoopWalletSignIn() {
  const {
    isMounted,
    isReady,
    isConnecting,
    isConnected,
    partyId,
    openConnect,
  } = useCantonWallet();

  if (!isMounted || !isReady) {
    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-600">
          <Spinner />
          <span>Preparing wallet session…</span>
        </div>
      </article>
    );
  }

  if (isConnected && partyId) {
    return null;
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-5 py-6 text-white sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
          Sign in required
        </p>
        <h2 className="mt-1 text-2xl font-bold">Connect your Canton wallet</h2>
        <p className="mt-3 text-sm text-slate-200">
          Loop is recommended on DevNet. You can also connect any Canton wallet
          via WalletConnect — no QR scan inside RentyVest.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600">1.</span>
            Choose Loop (recommended) or another Canton wallet
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600">2.</span>
            Approve the connection in your wallet popup or extension
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600">3.</span>
            Claim tUSDC from the faucet to start pledging
          </li>
        </ul>

        <button
          type="button"
          onClick={openConnect}
          disabled={isConnecting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isConnecting ? (
            <>
              <Spinner />
              <span>Waiting for wallet approval…</span>
            </>
          ) : (
            'Connect wallet'
          )}
        </button>
      </div>
    </article>
  );
}
