'use client';

import { useCallback, useState } from 'react';
import { useCantonWallet } from '../../providers/CantonWalletProvider';

type ConnectWalletButtonProps = {
  className?: string;
  label?: string;
};

export function ConnectWalletButton({
  className = 'btn-primary',
  label = 'Connect wallet',
}: ConnectWalletButtonProps) {
  const {
    isMounted,
    isReady,
    isConnecting,
    isConnected,
    partyId,
    initError,
    openConnect,
  } = useCantonWallet();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleConnect = useCallback(() => {
    setActionError(null);
    openConnect();
  }, [openConnect]);

  if (!isMounted || !isReady) {
    return (
      <button type="button" disabled className={`${className} opacity-70`}>
        {label}
      </button>
    );
  }

  if (initError) {
    return (
      <button
        type="button"
        onClick={handleConnect}
        className={className}
        title={initError}
      >
        Connect wallet
      </button>
    );
  }

  if (isConnected && partyId) {
    return null;
  }

  return (
    <span className="inline-flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={handleConnect}
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
