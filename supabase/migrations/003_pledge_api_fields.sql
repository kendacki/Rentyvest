-- API fields for pledge initiation and KYC gating

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS kyc_tier integer NOT NULL DEFAULT 0
    CHECK (kyc_tier >= 0);

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE INDEX IF NOT EXISTS properties_created_at_id_idx
  ON public.properties (created_at DESC, id DESC);
