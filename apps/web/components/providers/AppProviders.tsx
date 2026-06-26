'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';
import { SupabaseAuthProvider } from '../../hooks/useSupabaseAuth';
import { LoopWalletProvider } from './LoopWalletProvider';

type AppProvidersProps = {
  children: ReactNode;
};

function getPrivyAppId(): string {
  return (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '').trim();
}

export function AppProviders({ children }: AppProvidersProps) {
  const privyAppId = getPrivyAppId();

  if (!privyAppId) {
    console.warn(
      '[RentyVest] NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy-backed API routes (faucet, pledges) will not work until it is configured.',
    );
  }

  const content = (
    <LoopWalletProvider>{children}</LoopWalletProvider>
  );

  if (!privyAppId) {
    return content;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#059669',
          walletChainType: 'ethereum-and-solana',
        },
      }}
    >
      <SupabaseAuthProvider>{content}</SupabaseAuthProvider>
    </PrivyProvider>
  );
}
