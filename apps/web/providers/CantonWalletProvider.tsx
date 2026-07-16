'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { WalletPickerModal } from '../components/wallet/WalletPickerModal';
import { LoopWalletProvider, useLoopWallet } from '../components/providers/LoopWalletProvider';
import {
  WalletConnectProvider,
  useWalletConnect,
} from './WalletConnectProvider';

export type CantonWalletSource = 'loop' | 'walletconnect' | null;

type CantonWalletContextValue = {
  isMounted: boolean;
  isReady: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  partyId: string | null;
  email: string | null;
  walletSource: CantonWalletSource;
  walletLabel: string | null;
  initError: string | null;
  networkId: string | null;
  openConnect: () => void;
  connectLoop: () => Promise<string | null>;
  connectWalletConnect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  prepareSignExecute: ReturnType<typeof useWalletConnect>['prepareSignExecute'];
};

const CantonWalletContext = createContext<CantonWalletContextValue | null>(null);

function CantonWalletBridge({ children }: { children: ReactNode }) {
  const loop = useLoopWallet();
  const wc = useWalletConnect();
  const [pickerOpen, setPickerOpen] = useState(false);

  const loopConnected = Boolean(loop.isConnected && loop.partyId);
  const wcConnected = Boolean(wc.isConnected && wc.partyId);

  const connectLoop = useCallback(async (): Promise<string | null> => {
    setPickerOpen(false);
    const provider = await loop.connect();
    return provider?.party_id ?? loop.partyId;
  }, [loop]);

  const connectWalletConnect = useCallback(async (): Promise<string | null> => {
    setPickerOpen(false);
    return wc.connect();
  }, [wc]);

  const openConnect = useCallback(() => {
    if (loopConnected || wcConnected) {
      return;
    }

    setPickerOpen(true);
  }, [loopConnected, wcConnected]);

  const disconnect = useCallback(async () => {
    if (loopConnected) {
      loop.disconnect();
    }

    if (wcConnected) {
      await wc.disconnect();
    }
  }, [loop.disconnect, loopConnected, wc, wcConnected]);

  const value = useMemo<CantonWalletContextValue>(() => {
    if (loopConnected && loop.partyId) {
      return {
        isMounted: wc.isMounted,
        isReady: loop.isReady && wc.isReady,
        isConnecting: loop.isConnecting || wc.isConnecting,
        isConnected: true,
        partyId: loop.partyId,
        email: loop.email,
        walletSource: 'loop',
        walletLabel: 'Loop Wallet',
        initError: wc.initError,
        networkId: wc.networkId,
        openConnect,
        connectLoop,
        connectWalletConnect,
        disconnect,
        prepareSignExecute: wc.prepareSignExecute,
      };
    }

    if (wcConnected && wc.partyId) {
      return {
        isMounted: wc.isMounted,
        isReady: loop.isReady && wc.isReady,
        isConnecting: loop.isConnecting || wc.isConnecting,
        isConnected: true,
        partyId: wc.partyId,
        email: null,
        walletSource: 'walletconnect',
        walletLabel: 'Canton Wallet',
        initError: wc.initError,
        networkId: wc.networkId,
        openConnect,
        connectLoop,
        connectWalletConnect,
        disconnect,
        prepareSignExecute: wc.prepareSignExecute,
      };
    }

    return {
      isMounted: wc.isMounted,
      isReady: loop.isReady && wc.isReady,
      isConnecting: loop.isConnecting || wc.isConnecting,
      isConnected: false,
      partyId: null,
      email: null,
      walletSource: null,
      walletLabel: null,
      initError: wc.initError,
      networkId: null,
      openConnect,
      connectLoop,
      connectWalletConnect,
      disconnect,
      prepareSignExecute: wc.prepareSignExecute,
    };
  }, [
    connectLoop,
    connectWalletConnect,
    disconnect,
    loop.email,
    loop.isConnecting,
    loop.isReady,
    loop.partyId,
    loopConnected,
    openConnect,
    wc,
    wcConnected,
  ]);

  return (
    <CantonWalletContext.Provider value={value}>
      {children}
      <WalletPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
        }}
        onConnectLoop={() => {
          void connectLoop();
        }}
        onConnectWalletConnect={() => {
          void connectWalletConnect();
        }}
        isConnecting={value.isConnecting}
      />
    </CantonWalletContext.Provider>
  );
}

export function CantonWalletProvider({ children }: { children: ReactNode }) {
  return (
    <LoopWalletProvider>
      <WalletConnectProvider suppressQrModal>
        <CantonWalletBridge>{children}</CantonWalletBridge>
      </WalletConnectProvider>
    </LoopWalletProvider>
  );
}

export function useCantonWallet(): CantonWalletContextValue {
  const context = useContext(CantonWalletContext);

  if (!context) {
    throw new Error('useCantonWallet must be used within a CantonWalletProvider');
  }

  return context;
}
