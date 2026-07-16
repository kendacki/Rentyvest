'use client';

import { useEffect, useRef, useState } from 'react';
import { truncatePartyId } from '../../lib/format';
import { useCantonWallet } from '../../providers/CantonWalletProvider';

type WalletAccountMenuProps = {
  variant?: 'light' | 'dark';
};

function WalletPortrait({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className="block h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="wallet-portrait-gradient" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#FF5500" />
          <stop offset="100%" stopColor="#CC4400" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#wallet-portrait-gradient)" />
      <circle cx="20" cy="16" r="5.25" fill="white" fillOpacity="0.95" />
      <path
        d="M10 33.5c0-5 4.5-9 10-9s10 4 10 9"
        fill="white"
        fillOpacity="0.95"
      />
      <title>{label}</title>
    </svg>
  );
}

export function WalletAccountMenu({ variant = 'light' }: WalletAccountMenuProps) {
  const {
    isMounted,
    isReady,
    isConnected,
    partyId,
    email,
    walletLabel,
    openConnect,
    disconnect,
  } = useCantonWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDark = variant === 'dark';

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [menuOpen]);

  if (!isMounted || !isReady) {
    return (
      <button
        type="button"
        disabled
        className="btn-primary h-10 px-5 text-sm opacity-70"
      >
        Connect wallet
      </button>
    );
  }

  if (!isConnected || !partyId) {
    return (
      <button
        type="button"
        onClick={openConnect}
        className="btn-primary h-10 px-5 text-sm"
      >
        Connect wallet
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setMenuOpen((open) => !open);
        }}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 ring-1 ring-brand-orange/30 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-brand-orange"
        aria-label="Open wallet menu"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <WalletPortrait label={email ?? walletLabel ?? 'Connected wallet'} />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className={`absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl ${
            isDark
              ? 'border-white/15 bg-black/80'
              : 'border-white/60 bg-white/90'
          }`}
        >
          <div
            className={`border-b px-4 py-3 ${
              isDark ? 'border-white/10' : 'border-neutral-200'
            }`}
          >
            {email ? (
              <p
                className={`truncate text-sm font-medium ${
                  isDark ? 'text-white' : 'text-brand-black'
                }`}
              >
                {email}
              </p>
            ) : null}
            <p
              className={`${email ? 'mt-1' : ''} break-all font-mono text-xs ${
                isDark ? 'text-neutral-400' : 'text-neutral-600'
              }`}
              title={partyId}
            >
              {truncatePartyId(partyId, 10, 8)}
            </p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void disconnect();
            }}
            className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${
              isDark
                ? 'text-red-300 hover:bg-white/5'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            Disconnect wallet
          </button>
        </div>
      ) : null}
    </div>
  );
}
