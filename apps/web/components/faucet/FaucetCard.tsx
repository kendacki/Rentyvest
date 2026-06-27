'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatTokenBalance } from '../../lib/format';
import { claimFaucetViaLoop } from '../../lib/faucet/loopMint';
import { useLoopWallet } from '../providers/LoopWalletProvider';
import { sumAssetBalances } from '../../types/asset';
import type { UserTokenAsset } from '../../types/asset';


const CLAIM_BUTTON_LABEL = 'Claim 10,000 tUSDC';
const FAUCET_ASSETS_PATH = '/faucet/assets';

type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
};

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;


type FaucetAssetsResponse = {
  assets: UserTokenAsset[];
};

function getApiUrl(): string {
  // Browser: same-origin `/faucet/*` routes are proxied by Next.js (no CORS).
  if (typeof window !== 'undefined') {
    return '';
  }

  const base =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_CORE_API_URL ??
    'http://localhost:8080';

  return base.replace(/\/$/, '');
}

function formatFetchError(error: unknown, action: string): Error {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return new Error(
      `Cannot reach core-api for ${action}. Ensure core-api is running on port 8080 and restart Next.js after config changes.`,
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`Unable to ${action}`);
}

async function readFaucetError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const problem = (await response.json()) as ProblemDetails;

    if (problem.detail) {
      return problem.detail;
    }

    if (problem.title && problem.code) {
      return `${problem.title} (${problem.code})`;
    }

    if (problem.title) {
      return problem.title;
    }
  } catch {
    // Response body was not JSON.
  }

  return fallback;
}

async function fetchLoopPartyAssets(partyId: string): Promise<UserTokenAsset[]> {
  try {
    const response = await fetch(
      `${getApiUrl()}${FAUCET_ASSETS_PATH}?canton_party_id=${encodeURIComponent(partyId)}`,
    );

    if (!response.ok) {
      const fallback = `Unable to load balance (${response.status})`;
      throw new Error(await readFaucetError(response, fallback));
    }

    const data = (await response.json()) as FaucetAssetsResponse;
    return data.assets ?? [];
  } catch (error) {
    throw formatFetchError(error, 'load your balance');
  }
}

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

type FaucetToastProps = {
  toast: ToastState;
  onDismiss: () => void;
};

function FaucetToast({ toast, onDismiss }: FaucetToastProps) {
  if (!toast) {
    return null;
  }

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-red-200 bg-red-50 text-red-900'
      }`}
    >
      <p className="font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
          isSuccess
            ? 'text-emerald-700 hover:bg-emerald-100'
            : 'text-red-700 hover:bg-red-100'
        }`}
        aria-label="Dismiss notification"
      >
        Dismiss
      </button>
    </div>
  );
}

export function FaucetCard() {
  const {
    isReady: isLoopReady,
    isConnected,
    isConnecting,
    partyId,
    provider,
    connect,
  } = useLoopWallet();

  const [assets, setAssets] = useState<UserTokenAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const totalBalance = sumAssetBalances(assets);
  const isBusy = isClaiming || isConnecting;

  const refetchBalance = useCallback(async () => {
    if (!partyId) {
      setAssets([]);
      setBalanceError(null);
      return;
    }

    setIsLoading(true);
    setBalanceError(null);

    try {
      const nextAssets = await fetchLoopPartyAssets(partyId);
      setAssets(nextAssets);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load token balance';
      setBalanceError(message);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    if (!isConnected || !partyId) {
      setAssets([]);
      setBalanceError(null);
      return;
    }

    void refetchBalance();
  }, [isConnected, partyId, refetchBalance]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const handleClaim = useCallback(async () => {
    const activeProvider = provider ?? (await connect());
    if (!activeProvider?.party_id) {
      setToast({
        type: 'error',
        message: 'Connect your Loop wallet to claim test USDC.',
      });
      return;
    }

    const activePartyId = partyId ?? activeProvider.party_id;

    setIsClaiming(true);
    setToast(null);

    try {
      await claimFaucetViaLoop(getApiUrl(), activePartyId, activeProvider);

      await refetchBalance();

      setToast({
        type: 'success',
        message: 'Successfully claimed test USDC to your Loop wallet.',
      });
    } catch (claimError) {
      const message = formatFetchError(claimError, 'claim test USDC').message;

      setToast({
        type: 'error',
        message,
      });
    } finally {
      setIsClaiming(false);
    }
  }, [connect, partyId, provider, refetchBalance]);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          DevNet Faucet
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Test USDC</h2>
        <p className="mt-2 text-sm text-slate-600">
          Claim Canton test tokens to your connected Loop wallet on DevNet.
          One claim per Loop party every 24 hours.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <FaucetToast toast={toast} onDismiss={() => setToast(null)} />

        {partyId && (
          <p className="truncate rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="font-medium text-slate-800">Loop party:</span>{' '}
            {partyId}
          </p>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Your balance
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {isLoading && assets.length === 0
              ? 'Loading…'
              : formatTokenBalance(totalBalance)}
          </p>
          {balanceError && (
            <p className="mt-2 text-xs text-red-600">
              Unable to refresh balance: {balanceError}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            void handleClaim();
          }}
          disabled={!isLoopReady || isBusy || (isConnected && isLoading)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isClaiming ? (
            <>
              <Spinner />
              <span>Claiming tUSDC…</span>
            </>
          ) : isConnected ? (
            CLAIM_BUTTON_LABEL
          ) : (
            'Connect Loop Wallet to Claim'
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Tokens are minted on Canton DevNet to the Loop party shown above.
        </p>
      </div>
    </article>
  );
}
