-- Indexed CIP-0056 Test USDC holdings for client asset selection

CREATE TABLE IF NOT EXISTS public.user_token_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  canton_contract_id text NOT NULL,
  owner_party_id text NOT NULL,
  balance numeric(28, 10) NOT NULL CHECK (balance > 0),
  symbol text NOT NULL DEFAULT 'tUSDC',
  instrument_id text NOT NULL DEFAULT 'tUSDC',
  locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_token_assets_canton_contract_id_unique UNIQUE (canton_contract_id)
);

CREATE INDEX IF NOT EXISTS user_token_assets_user_id_idx
  ON public.user_token_assets (user_id);

CREATE INDEX IF NOT EXISTS user_token_assets_user_symbol_idx
  ON public.user_token_assets (user_id, symbol);

ALTER TABLE public.user_token_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_token_assets_select_own ON public.user_token_assets;
CREATE POLICY user_token_assets_select_own
  ON public.user_token_assets
  FOR SELECT
  TO authenticated
  USING (user_id = requesting_user_id());

COMMENT ON TABLE public.user_token_assets IS
  'User-owned CIP-0056 token UTXOs mirrored from Canton for pledge asset selection.';
