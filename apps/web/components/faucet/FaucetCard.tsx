'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatTokenBalance } from '../../lib/format';
import { claimFaucetViaBackend } from '../../lib/faucet/backendMint';
import { fetchFaucetAssets } from '../../lib/api/faucetAssets';
import { useLoopWallet } from '../providers/LoopWalletProvider';
import { useCantonWallet } from '../../providers/CantonWalletProvider';
import { sumAssetBalances } from '../../types/asset';
import type { UserTokenAsset } from '../../types/asset';


const CLAIM_BUTTON_LABEL = 'Claim 10,000 tUSDC';

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

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

function formatClaimError(error: unknown): string {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Cannot reach the faucet service. Check your connection and try again in a moment.';
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.includes('502') || message.toLowerCase().includes('bad gateway')) {
      return 'Canton could not complete the faucet mint. If you use Loop wallet, confirm your party is whitelisted and the RentyVest package is vetted on DevNet, then retry.';
    }
    return message;
  }

  return 'Unable to claim tUSDC';
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
          ? 'border-brand-orange/30 bg-brand-orange-light text-black'
          : 'border-red-200 bg-red-50 text-red-900'
      }`}
    >
      <p className="font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
          isSuccess
            ? 'text-brand-orange hover:bg-brand-orange-light'
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
    isReady: isWalletReady,
    isConnected,
    isConnecting,
    partyId,
    walletSource,
    openConnect,
  } = useCantonWallet();
  const loop = useLoopWallet();

  const [assets, setAssets] = useState<UserTokenAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const totalBalance = sumAssetBalances(assets);
  const isBusy = isClaiming || isConnecting;
  const isWalletConnected = Boolean(isConnected && partyId);

  const refetchBalance = useCallback(async () => {
    if (!partyId) {
      setAssets([]);
      setBalanceError(null);
      return;
    }

    setIsLoading(true);
    setBalanceError(null);

    try {
      const nextAssets = await fetchFaucetAssets(partyId);
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
    if (!partyId) {
      openConnect();
      return;
    }

    const activePartyId = partyId;

    setIsClaiming(true);
    setToast(null);

    try {
      if (walletSource === 'loop') {
        const provider = await loop.connect();
        if (!provider?.party_id) {
          throw new Error('Connect Loop wallet before claiming tUSDC.');
        }
      }

      await claimFaucetViaBackend(getApiUrl(), activePartyId);

      await refetchBalance();

      setToast({
        type: 'success',
        message: 'Successfully claimed tUSDC to your connected party.',
      });
    } catch (claimError) {
      setToast({
        type: 'error',
        message: formatClaimError(claimError),
      });
    } finally {
      setIsClaiming(false);
    }
  }, [loop, openConnect, partyId, refetchBalance, walletSource]);

  return (
    <article className="card-surface overflow-hidden">
      <div className="border-b border-white/10 bg-black px-5 py-5 sm:px-6">
        <p className="section-label">DevNet Faucet</p>
        <p className="mt-2 text-sm text-neutral-300">
          {isWalletConnected
            ? 'Your wallet is connected. Claim tUSDC minted directly to your party. One claim per party every 24 hours.'
            : 'Connect your wallet to claim tUSDC minted directly to your party. One claim per party every 24 hours.'}
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <FaucetToast toast={toast} onDismiss={() => setToast(null)} />

        {partyId && (
          <p className="truncate glass-inset px-3 py-2 text-xs text-slate-600">
            <span className="font-medium text-slate-800">Canton party:</span>{' '}
            {partyId}
          </p>
        )}

        <div className="glass-inset p-4">
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
          disabled={!isWalletReady || isBusy || (isConnected && isLoading)}
          className="btn-primary h-12 w-full disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
        >
          {isClaiming ? (
            <>
              <Spinner />
              <span>Claiming tUSDC…</span>
            </>
          ) : isConnected ? (
            CLAIM_BUTTON_LABEL
          ) : (
            'Connect to claim tUSDC'
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          {isConnected && partyId
            ? 'Claimed tUSDC goes directly to your wallet.'
            : 'Connect a wallet to claim tUSDC.'}
        </p>
      </div>
    </article>
  );
}
