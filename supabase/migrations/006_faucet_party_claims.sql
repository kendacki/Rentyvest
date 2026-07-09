-- Loop wallet faucet claims keyed by Canton party (no Privy user row required)

CREATE TABLE IF NOT EXISTS public.faucet_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canton_party_id text NOT NULL,
  amount text NOT NULL,
  canton_command_id text,
  canton_update_id text,
  canton_holding_contract_id text,
  canton_issuer_contract_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faucet_claims_party_created_idx
  ON public.faucet_claims (canton_party_id, created_at DESC);

COMMENT ON TABLE public.faucet_claims IS
  'Faucet claim audit for Loop-connected parties without a users.id FK.';
