'use client';

import { truncatePartyId } from '../../lib/format';
import { useLoopWallet } from '../providers/LoopWalletProvider';

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
    isReady,
    isConnecting,
    isConnected,
    partyId,
    email,
    connect,
    disconnect,
  } = useLoopWallet();

  if (!isReady) {
    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-600">
          <Spinner />
          <span>Preparing Loop wallet…</span>
        </div>
      </article>
    );
  }

  if (isConnected && partyId) {
    return (
      <article className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Connected
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Loop Wallet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your Canton party is linked. You can claim test USDC and fund pledges
            on DevNet.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          {email && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Loop account
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{email}</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Canton party ID
            </p>
            <p
              className="mt-1 break-all font-mono text-sm text-slate-900"
              title={partyId}
            >
              {truncatePartyId(partyId, 18, 12)}
            </p>
          </div>

          <button
            type="button"
            onClick={disconnect}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Disconnect Loop wallet
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-5 py-6 text-white sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
          Sign in required
        </p>
        <h2 className="mt-1 text-2xl font-bold">Connect Loop Wallet</h2>
        <p className="mt-3 text-sm text-slate-200">
          RentyVest uses Loop on Canton DevNet for identity and on-ledger
          actions. Scan the QR code or approve the connection in your Loop
          browser extension.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600">1.</span>
            Install Loop on mobile or desktop at cantonloop.com
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600">2.</span>
            Tap connect below and approve the DevNet session
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600">3.</span>
            Claim test USDC from the faucet to start pledging
          </li>
        </ul>

        <button
          type="button"
          onClick={() => {
            void connect();
          }}
          disabled={isConnecting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isConnecting ? (
            <>
              <Spinner />
              <span>Waiting for Loop approval…</span>
            </>
          ) : (
            'Connect Loop Wallet'
          )}
        </button>
      </div>
    </article>
  );
}
