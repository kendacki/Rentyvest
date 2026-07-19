import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return raw.replace(/\/rest\/v1\/?$/, '');
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

let cachedClient: SupabaseClient | null = null;
let cachedToken: string | null = null;

export function createSupabaseBrowserClient(
  supabaseToken: string | null,
): SupabaseClient | null {
  if (!supabaseToken) {
    cachedClient = null;
    cachedToken = null;
    return null;
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    console.error(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
    );
    return null;
  }

  if (cachedClient && cachedToken === supabaseToken) {
    return cachedClient;
  }

  cachedToken = supabaseToken;
  cachedClient = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}

export function resetSupabaseBrowserClient(): void {
  cachedClient = null;
  cachedToken = null;
}

let cachedPublicClient: SupabaseClient | null = null;

/**
 * Anon-key client for public data (active marketplace listings).
 * Works without sign-in; RLS must allow `anon` to read the rows.
 */
export function createSupabasePublicClient(): SupabaseClient | null {
  if (cachedPublicClient) {
    return cachedPublicClient;
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    console.error(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
    );
    return null;
  }

  cachedPublicClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedPublicClient;
}
