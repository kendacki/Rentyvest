'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  RealtimeChannel,
  RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js';
import { useSupabaseAuth } from './useSupabaseAuth';
import {
  normalizeProperty,
  type Property,
  type PropertyRow,
} from '../types/property';

const PROPERTIES_CHANNEL = 'public:properties';
const ACTIVE_STATUS_FILTER = 'status=eq.active';

type UsePropertySlotsResult = {
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  refetch: () => Promise<void>;
};

function isPropertyRow(value: unknown): value is PropertyRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Partial<PropertyRow>;
  return typeof row.id === 'string' && typeof row.slots_filled === 'number';
}

export function usePropertySlots(): UsePropertySlotsResult {
  const { supabase, isLoading: isAuthLoading, error: authError } =
    useSupabaseAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const patchSlotsFilled = useCallback(
    (payload: RealtimePostgresUpdatePayload<PropertyRow>) => {
      const updated = payload.new;

      if (!isPropertyRow(updated)) {
        return;
      }

      setProperties((current) =>
        current.map((property) =>
          property.id === updated.id
            ? { ...property, slots_filled: updated.slots_filled }
            : property,
        ),
      );
    },
    [],
  );

  const fetchProperties = useCallback(async () => {
    if (!supabase) {
      setProperties([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'active')
      .order('listed_at', { ascending: false, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setProperties([]);
      setIsLoading(false);
      return;
    }

    setProperties((data ?? []).map((row) => normalizeProperty(row as PropertyRow)));
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (authError) {
      setError(authError);
      setIsLoading(false);
      return;
    }

    void fetchProperties();
  }, [authError, fetchProperties, isAuthLoading]);

  useEffect(() => {
    if (!supabase) {
      setIsRealtimeConnected(false);
      return;
    }

    const channel = supabase
      .channel(PROPERTIES_CHANNEL)
      .on<PropertyRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'properties',
          filter: ACTIVE_STATUS_FILTER,
        },
        patchSlotsFilled,
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      setIsRealtimeConnected(false);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [patchSlotsFilled, supabase]);

  return {
    properties,
    isLoading: isAuthLoading || isLoading,
    error,
    isRealtimeConnected,
    refetch: fetchProperties,
  };
}
