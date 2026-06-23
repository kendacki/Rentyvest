'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { fetchUserAssets } from '../lib/pledge';
import type { UserTokenAsset } from '../types/asset';

type UseUserAssetsOptions = {
  enabled?: boolean;
};

type UseUserAssetsResult = {
  assets: UserTokenAsset[];
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useUserAssets(
  options: UseUserAssetsOptions = {},
): UseUserAssetsResult {
  const { enabled = true } = options;
  const { authenticated, getAccessToken } = usePrivy();

  const [assets, setAssets] = useState<UserTokenAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled || !authenticated) {
      setAssets([]);
      setError(null);
      setIsLoading(false);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication is required to load token assets');
      }

      const response = await fetchUserAssets(accessToken);
      setAssets(response.assets);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load token assets';
      setError(message);
      setAssets([]);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [authenticated, enabled, getAccessToken]);

  useEffect(() => {
    if (!enabled || !authenticated) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void refetch();
  }, [authenticated, enabled, refetch]);

  return {
    assets,
    isLoading,
    isValidating,
    error,
    refetch,
  };
}
