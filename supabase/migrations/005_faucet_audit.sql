-- Faucet rate limiting, audit trail, and Canton party mapping

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS canton_party_id text;

CREATE INDEX IF NOT EXISTS users_canton_party_id_idx
  ON public.users (canton_party_id)
  WHERE canton_party_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_user_event_created_idx
  ON public.audit_log (user_id, event_type, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.audit_log IS
  'Append-only audit trail for privileged backend actions (e.g. faucet claims).';

COMMENT ON COLUMN public.users.canton_party_id IS
  'Canton ledger party ID allocated for this Privy user.';
