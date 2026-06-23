-- Canton ledger integration fields

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS canton_pool_contract_id text;

CREATE INDEX IF NOT EXISTS properties_canton_pool_contract_id_idx
  ON public.properties (canton_pool_contract_id)
  WHERE canton_pool_contract_id IS NOT NULL;

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS canton_submit_status text NOT NULL DEFAULT 'pending'
    CHECK (canton_submit_status IN ('pending', 'submitted', 'failed'));

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS canton_submit_error text;

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS canton_submitted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS pledges_canton_submit_status_idx
  ON public.pledges (canton_submit_status)
  WHERE canton_submit_status = 'pending';
