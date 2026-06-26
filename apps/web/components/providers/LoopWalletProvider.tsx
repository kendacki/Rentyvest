'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type LoopProviderLike = {
  submitAndWaitForTransaction: (
    payload: {
      commands: unknown[];
      disclosedContracts: unknown[];
      actAs?: string[];
      readAs?: string[];
    },
    options?: { message?: string },
  ) => Promise<{
    command_id?: string;
    update_id?: string;
    update_data?: unknown;
  }>;
};

type LoopWalletContextValue = {
  isReady: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  partyId: string | null;
  email: string | null;
  provider: LoopProviderLike | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const LoopWalletContext = createContext<LoopWalletContextValue | null>(null);

function getLoopRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.origin}/wallet`;
}

export function LoopWalletProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<LoopWalletContextValue['provider']>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrapLoop() {
      const { loop } = await import('@fivenorth/loop-sdk');

      loop.init({
        appName: 'RentyVest',
        network: 'devnet',
        options: {
          openMode: 'popup',
          requestSigningMode: 'popup',
          redirectUrl: getLoopRedirectUrl(),
        },
        onAccept: (nextProvider) => {
          if (!mounted) {
            return;
          }

          setProvider(nextProvider);
          setPartyId(nextProvider.party_id);
          setEmail(nextProvider.email ?? null);
          setIsConnecting(false);
        },
        onReject: () => {
          if (!mounted) {
            return;
          }

          setIsConnecting(false);
        },
      });

      try {
        await loop.autoConnect();
      } catch {
        // No saved Loop session — user must connect manually.
      }

      if (mounted) {
        setIsReady(true);
      }
    }

    void bootstrapLoop();

    return () => {
      mounted = false;
    };
  }, []);

  const connect = useCallback(async () => {
    const { loop } = await import('@fivenorth/loop-sdk');

    setIsConnecting(true);

    try {
      await loop.connect();
    } catch {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    void import('@fivenorth/loop-sdk').then(({ loop }) => {
      loop.logout();
      setProvider(null);
      setPartyId(null);
      setEmail(null);
      setIsConnecting(false);
    });
  }, []);

  const value = useMemo<LoopWalletContextValue>(
    () => ({
      isReady,
      isConnecting,
      isConnected: Boolean(partyId),
      partyId,
      email,
      provider,
      connect,
      disconnect,
    }),
    [connect, disconnect, email, isConnecting, isReady, partyId, provider],
  );

  return (
    <LoopWalletContext.Provider value={value}>
      {children}
    </LoopWalletContext.Provider>
  );
}

export function useLoopWallet(): LoopWalletContextValue {
  const context = useContext(LoopWalletContext);

  if (!context) {
    throw new Error('useLoopWallet must be used within a LoopWalletProvider');
  }

  return context;
}
