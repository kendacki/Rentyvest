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
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  createSupabaseBrowserClient,
  resetSupabaseBrowserClient,
} from '../lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type ExchangeTokenResponse = {
  supabase_token: string;
  canton_ledger_token?: string;
};

type ProblemDetails = {
  title?: string;
  status?: number;
  detail?: string;
};

type SupabaseAuthContextValue = {
  supabaseToken: string | null;
  cantonLedgerToken: string | null;
  supabase: SupabaseClient | null;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  retryExchange: () => Promise<void>;
};

type SupabaseAuthProviderProps = {
  children: ReactNode;
  onExchangeError?: (message: string) => void;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

function getCoreApiUrl(): string {
  const base = process.env.NEXT_PUBLIC_CORE_API_URL ?? 'http://localhost:8080';
  return base.replace(/\/$/, '');
}

async function exchangePrivyToken(
  privyToken: string,
): Promise<{ supabaseToken: string; cantonLedgerToken: string | null }> {
  const response = await fetch(`${getCoreApiUrl()}/auth/exchange`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${privyToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let message = `Token exchange failed (${response.status})`;

    try {
      const problem = (await response.json()) as ProblemDetails;
      if (problem.detail) {
        message = problem.detail;
      } else if (problem.title) {
        message = problem.title;
      }
    } catch {
      // Response body was not JSON; keep default message.
    }

    throw new Error(message);
  }

  const data = (await response.json()) as ExchangeTokenResponse;

  if (!data.supabase_token) {
    throw new Error('Token exchange response did not include supabase_token');
  }

  return {
    supabaseToken: data.supabase_token,
    cantonLedgerToken: data.canton_ledger_token?.trim() || null,
  };
}

function reportExchangeError(
  message: string,
  onExchangeError?: (message: string) => void,
): void {
  console.error('[useSupabaseAuth]', message);
  onExchangeError?.(message);
}

export function SupabaseAuthProvider({
  children,
  onExchangeError,
}: SupabaseAuthProviderProps) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { ready: walletsReady } = useWallets();

  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);
  const [cantonLedgerToken, setCantonLedgerToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeVersion, setExchangeVersion] = useState(0);

  const isReady = ready && walletsReady;

  const clearSession = useCallback(() => {
    setSupabaseToken(null);
    setCantonLedgerToken(null);
    setError(null);
    resetSupabaseBrowserClient();
  }, []);

  const runExchange = useCallback(async () => {
    if (!isReady || !authenticated) {
      clearSession();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const privyToken = await getAccessToken();

      if (!privyToken) {
        throw new Error('Privy access token is unavailable');
      }

      const tokens = await exchangePrivyToken(privyToken);
      setSupabaseToken(tokens.supabaseToken);
      setCantonLedgerToken(tokens.cantonLedgerToken);
    } catch (exchangeError) {
      const message =
        exchangeError instanceof Error
          ? exchangeError.message
          : 'Token exchange failed';

      setSupabaseToken(null);
      setCantonLedgerToken(null);
      setError(message);
      resetSupabaseBrowserClient();
      reportExchangeError(message, onExchangeError);
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, clearSession, getAccessToken, isReady, onExchangeError]);

  const retryExchange = useCallback(async () => {
    setExchangeVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!authenticated) {
      clearSession();
      return;
    }

    void runExchange();
  }, [authenticated, clearSession, exchangeVersion, isReady, runExchange]);

  const supabase = useMemo(
    () => createSupabaseBrowserClient(supabaseToken),
    [supabaseToken],
  );

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      supabaseToken,
      cantonLedgerToken,
      supabase,
      isLoading,
      isReady,
      error,
      retryExchange,
    }),
    [cantonLedgerToken, error, isLoading, isReady, retryExchange, supabase, supabaseToken],
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const context = useContext(SupabaseAuthContext);

  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }

  return context;
}
