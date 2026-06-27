'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type LoopProviderLike = {
  party_id: string;
  email?: string;
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
  connect: () => Promise<LoopProviderLike | null>;
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
  const providerRef = useRef<LoopProviderLike | null>(null);
  const connectResolverRef = useRef<((provider: LoopProviderLike | null) => void) | null>(null);

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

          providerRef.current = nextProvider;
          setProvider(nextProvider);
          setPartyId(nextProvider.party_id);
          setEmail(nextProvider.email ?? null);
          setIsConnecting(false);
          connectResolverRef.current?.(nextProvider);
          connectResolverRef.current = null;
        },
        onReject: () => {
          if (!mounted) {
            return;
          }

          setIsConnecting(false);
          connectResolverRef.current?.(null);
          connectResolverRef.current = null;
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
    if (providerRef.current) {
      return providerRef.current;
    }

    const { loop } = await import('@fivenorth/loop-sdk');

    setIsConnecting(true);

    try {
      return await new Promise<LoopProviderLike | null>((resolve) => {
        connectResolverRef.current = (nextProvider) => {
          connectResolverRef.current = null;
          resolve(nextProvider);
        };

        void loop.connect()
          .then(() => {
            if (providerRef.current) {
              connectResolverRef.current = null;
              resolve(providerRef.current);
            }
          })
          .catch(() => {
            connectResolverRef.current = null;
            resolve(null);
          });
      });
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    void import('@fivenorth/loop-sdk').then(({ loop }) => {
      loop.logout();
      providerRef.current = null;
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
