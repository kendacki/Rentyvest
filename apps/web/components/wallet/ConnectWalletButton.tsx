'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { truncatePartyId } from '../../lib/format';
import { useWalletConnect } from '../../providers/WalletConnectProvider';

type ConnectWalletButtonProps = {
  className?: string;
  connectedClassName?: string;
  connectedHref?: string;
  label?: string;
  connectedLabel?: string;
  showPartyWhenConnected?: boolean;
  onConnected?: (partyId: string) => void;
};

export function ConnectWalletButton({
  className = 'btn-primary',
  connectedClassName = 'btn-secondary',
  connectedHref = '/wallet',
  label = 'Connect wallet',
  connectedLabel = 'Wallet connected',
  showPartyWhenConnected = false,
  onConnected,
}: ConnectWalletButtonProps) {
  const {
    isMounted,
    isReady,
    isConnecting,
    isConnected,
    partyId,
    initError,
    connect,
  } = useWalletConnect();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setActionError(null);

    try {
      const resolvedPartyId = await connect();
      if (resolvedPartyId) {
        onConnected?.(resolvedPartyId);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to start WalletConnect session';
      setActionError(message);
    }
  }, [connect, onConnected]);

  if (!isMounted || !isReady) {
    return (
      <button type="button" disabled className={`${className} opacity-70`}>
        {label}
      </button>
    );
  }

  if (initError) {
    return (
      <Link href="/wallet" className={className} title={initError}>
        Set up wallet
      </Link>
    );
  }

  if (isConnected && partyId) {
    const text = showPartyWhenConnected
      ? truncatePartyId(partyId, 8, 6)
      : connectedLabel;

    return (
      <Link href={connectedHref} className={connectedClassName} title={partyId}>
        {text}
      </Link>
    );
  }

  return (
    <span className="inline-flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={() => {
          void handleConnect();
        }}
        disabled={isConnecting}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {isConnecting ? 'Connecting…' : label}
      </button>
      {actionError ? (
        <span className="text-xs text-red-600" role="alert">
          {actionError}
        </span>
      ) : null}
    </span>
  );
}
