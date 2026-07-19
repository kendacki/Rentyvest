-- Seamless approval: when a property_listing_requests row is marked 'approved',
-- automatically publish it to public.properties so it appears on the marketplace.

-- Loop-only submitters have no users row, so owner_id cannot be a hard FK.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_owner_id_fkey;

-- Link a published property back to the request it came from (idempotent promotion).
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS properties_listing_request_id_key
  ON public.properties (listing_request_id)
  WHERE listing_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.promote_approved_listing_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act on the transition into 'approved'.
  IF NEW.status = 'approved' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.properties (
      owner_id,
      title,
      description,
      address_line1,
      city,
      state,
      country,
      postal_code,
      total_units,
      unit_price,
      estimated_annual_yield,
      image_url,
      status,
      listed_at,
      listing_request_id
    )
    VALUES (
      NEW.submitter_id,
      NEW.property_title,
      NEW.property_description,
      NEW.address_line1,
      NEW.city,
      NEW.state,
      NEW.country,
      NEW.postal_code,
      NEW.total_units,
      NEW.unit_price,
      NEW.estimated_annual_yield,
      NEW.image_url,
      'active',
      now(),
      NEW.id
    )
    ON CONFLICT (listing_request_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_approved_listing_request
  ON public.property_listing_requests;

CREATE TRIGGER trg_promote_approved_listing_request
  AFTER UPDATE ON public.property_listing_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_approved_listing_request();

COMMENT ON FUNCTION public.promote_approved_listing_request() IS
  'Publishes an approved property_listing_requests row into public.properties (status=active) for the marketplace.';
