-- Property fundraising expiry fields for expiry-cron worker

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS expiry_at timestamp with time zone;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS expiry_submitted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS properties_expiry_pending_idx
  ON public.properties (expiry_at)
  WHERE status = 'pending' AND expiry_submitted = false;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('draft', 'pending', 'active', 'funded', 'expired', 'closed', 'archived'));

COMMENT ON COLUMN public.properties.expiry_at IS
  'Fundraising deadline after which expiry-cron refunds escrowed pledges.';

COMMENT ON COLUMN public.properties.expiry_submitted IS
  'Set true before Canton expiry submission to prevent AUD-011 double refunds.';
