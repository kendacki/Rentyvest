'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  executeBackendPledge,
  fetchUserNFTs,
  type ExecutePledgeParams,
  type PledgeExecutionResult,
  type UserEquityToken,
} from '@rentyvest/ledger-client';
import { useCantonWallet } from '../providers/WalletConnectProvider';

type UseLedgerPortfolioOptions = {
  enabled?: boolean;
};

type UseLedgerPortfolioResult = {
  partyId: string | null;
  tokens: UserEquityToken[];
  count: number;
  totalPendingYield: string;
  currency: string;
  isLoading: boolean;
  isSigning: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  executePledge: (params: ExecutePledgeParams) => Promise<PledgeExecutionResult>;
};

export function useLedgerPortfolio(
  options: UseLedgerPortfolioOptions = {},
): UseLedgerPortfolioResult {
  const { enabled = true } = options;
  const { isMounted, isConnected, partyId } = useCantonWallet();

  const [tokens, setTokens] = useState<UserEquityToken[]>([]);
  const [count, setCount] = useState(0);
  const [totalPendingYield, setTotalPendingYield] = useState('0');
  const [currency, setCurrency] = useState('tUSDC');
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled || !isMounted || !isConnected || !partyId) {
      setTokens([]);
      setCount(0);
      setTotalPendingYield('0');
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchUserNFTs(partyId);
      setTokens(response.tokens ?? []);
      setCount(response.count ?? response.tokens?.length ?? 0);
      setTotalPendingYield(response.total_pending_yield ?? '0');
      setCurrency(response.currency ?? 'tUSDC');
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load on-ledger portfolio';
      setError(message);
      setTokens([]);
      setCount(0);
      setTotalPendingYield('0');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isConnected, isMounted, partyId]);

  useEffect(() => {
    if (!enabled || !isMounted || !isConnected || !partyId) {
      setTokens([]);
      setCount(0);
      setIsLoading(false);
      return;
    }

    void refetch();
  }, [enabled, isConnected, isMounted, partyId, refetch]);

  const executePledge = useCallback(
    async (params: ExecutePledgeParams): Promise<PledgeExecutionResult> => {
      if (!partyId) {
        throw new Error('Connect your Canton wallet before pledging');
      }

      setIsSigning(true);
      setError(null);

      try {
        const result = await executeBackendPledge({
          buyerPartyId: params.buyerPartyId || partyId,
          propertyId: params.propertyId,
          amount: params.amount,
          paymentAssetContractId: params.paymentAssetContractId,
        });

        await refetch();

        return {
          commandId: result.commandId,
          updateId: result.updateId,
          slotCount: result.slotCount,
          mintedNftContractIds: result.mintedNftContractIds,
        };
      } catch (pledgeError) {
        const message =
          pledgeError instanceof Error
            ? pledgeError.message
            : 'Pledge transaction failed';
        setError(message);
        throw pledgeError instanceof Error ? pledgeError : new Error(message);
      } finally {
        setIsSigning(false);
      }
    },
    [partyId, refetch],
  );

  return {
    partyId,
    tokens,
    count,
    totalPendingYield,
    currency,
    isLoading,
    isSigning,
    error,
    refetch,
    executePledge,
  };
}
