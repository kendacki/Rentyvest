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
import type {
  DappClient,
  PrepareExecuteAndWaitResult,
  PrepareExecuteParams,
  WalletConnectAdapter,
} from '@canton-network/dapp-sdk';
import {
  getCantonWalletChainId,
  getWalletConnectMetadata,
  getWalletConnectProjectId,
} from '@rentyvest/ledger-client';
import { WalletConnectQrModal } from '../components/wallet/WalletConnectQrModal';

type CantonProvider = ReturnType<WalletConnectAdapter['provider']>;

type WalletConnectContextValue = {
  isMounted: boolean;
  isReady: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  partyId: string | null;
  networkId: string | null;
  initError: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  prepareSignExecute: (
    params: PrepareExecuteParams,
  ) => Promise<PrepareExecuteAndWaitResult>;
};

const WalletConnectContext = createContext<WalletConnectContextValue | null>(
  null,
);

function resolvePartyId(accounts: Array<{ partyId?: string }>): string | null {
  return accounts.find((account) => account.partyId)?.partyId ?? null;
}

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [wcUri, setWcUri] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const dappClientRef = useRef<DappClient | null>(null);
  const providerRef = useRef<CantonProvider | null>(null);

  const syncSessionState = useCallback(async () => {
    const client = dappClientRef.current;
    if (!client) {
      setIsConnected(false);
      setPartyId(null);
      setNetworkId(null);
      return;
    }

    try {
      const status = await client.status();
      const connected = Boolean(status.connection?.isConnected);
      setIsConnected(connected);

      if (!connected) {
        setPartyId(null);
        setNetworkId(null);
        return;
      }

      setNetworkId(status.network?.networkId ?? getCantonWalletChainId());

      const accounts = await client.listAccounts();
      setPartyId(resolvePartyId(accounts));
    } catch {
      setIsConnected(false);
      setPartyId(null);
      setNetworkId(null);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    let cancelled = false;

    async function bootstrapWalletSdk() {
      const projectId = getWalletConnectProjectId();
      if (!projectId) {
        setInitError(
          'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not configured.',
        );
        setIsReady(true);
        return;
      }

      try {
        const { DappClient, WalletConnectAdapter } = await import(
          '@canton-network/dapp-sdk'
        );

        const adapter = WalletConnectAdapter.create({
          projectId,
          chainId: getCantonWalletChainId(),
          metadata: getWalletConnectMetadata(),
          onUri: (uri) => {
            setWcUri(uri);
            setShowQrModal(true);
          },
        });

        const restoredProvider = await adapter.restore();
        const provider = restoredProvider ?? adapter.provider();
        providerRef.current = provider;

        const client = new DappClient(provider, { providerType: 'mobile' });
        dappClientRef.current = client;

        if (!cancelled) {
          await syncSessionState();
          setInitError(null);
          setIsReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setInitError(
            error instanceof Error
              ? error.message
              : 'Unable to initialize Canton wallet SDK',
          );
          setIsReady(true);
        }
      }
    }

    void bootstrapWalletSdk();

    return () => {
      cancelled = true;
    };
  }, [isMounted, syncSessionState]);

  const connect = useCallback(async (): Promise<string | null> => {
    const client = dappClientRef.current;
    if (!client) {
      throw new Error(initError ?? 'Canton wallet SDK is not ready');
    }

    setIsConnecting(true);
    setWcUri(null);
    setShowQrModal(true);

    try {
      await client.connect();
      await syncSessionState();

      const accounts = await client.listAccounts();
      return resolvePartyId(accounts);
    } catch (error) {
      setShowQrModal(false);
      setWcUri(null);
      throw error instanceof Error
        ? error
        : new Error('WalletConnect session was not approved');
    } finally {
      setIsConnecting(false);
      setShowQrModal(false);
      setWcUri(null);
    }
  }, [initError, syncSessionState]);

  const disconnect = useCallback(async () => {
    const client = dappClientRef.current;
    if (!client) {
      return;
    }

    await client.disconnect();
    setIsConnected(false);
    setPartyId(null);
    setNetworkId(null);
    setShowQrModal(false);
    setWcUri(null);
  }, []);

  const prepareSignExecute = useCallback(
    async (params: PrepareExecuteParams) => {
      const provider = providerRef.current;
      if (!provider) {
        throw new Error('Connect a Canton wallet before submitting');
      }

      return provider.request({
        method: 'prepareExecuteAndWait',
        params,
      }) as Promise<PrepareExecuteAndWaitResult>;
    },
    [],
  );

  const value = useMemo<WalletConnectContextValue>(
    () => ({
      isMounted,
      isReady,
      isConnecting,
      isConnected,
      partyId,
      networkId,
      initError,
      connect,
      disconnect,
      prepareSignExecute,
    }),
    [
      connect,
      disconnect,
      initError,
      isConnected,
      isConnecting,
      isMounted,
      isReady,
      networkId,
      partyId,
      prepareSignExecute,
    ],
  );

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
      {isMounted && (
        <WalletConnectQrModal
          open={showQrModal}
          uri={wcUri}
          isConnecting={isConnecting}
          onClose={() => {
            if (!isConnecting) {
              setShowQrModal(false);
              setWcUri(null);
            }
          }}
        />
      )}
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect(): WalletConnectContextValue {
  const context = useContext(WalletConnectContext);

  if (!context) {
    throw new Error(
      'useWalletConnect must be used within a WalletConnectProvider',
    );
  }

  return context;
}

export const useCantonWallet = useWalletConnect;
