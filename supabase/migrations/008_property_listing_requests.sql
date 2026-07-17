-- Property listing intake from signed-in owners (reviewed before on-chain pool creation)

CREATE TABLE public.property_listing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id text NOT NULL,
  canton_party_id text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  property_title text NOT NULL,
  property_description text NOT NULL,
  property_type text NOT NULL DEFAULT 'residential'
    CHECK (property_type IN ('residential', 'commercial', 'mixed_use', 'other')),
  address_line1 text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL DEFAULT 'United States',
  postal_code text,
  total_units integer NOT NULL CHECK (total_units > 0),
  unit_price numeric(18, 2) NOT NULL CHECK (unit_price > 0),
  estimated_annual_yield numeric(5, 2) NOT NULL DEFAULT 0
    CHECK (estimated_annual_yield >= 0),
  image_url text,
  additional_notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX property_listing_requests_submitter_id_idx
  ON public.property_listing_requests (submitter_id);

CREATE INDEX property_listing_requests_status_idx
  ON public.property_listing_requests (status);

ALTER TABLE public.property_listing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_listing_requests_insert_own
  ON public.property_listing_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (submitter_id = requesting_user_id());

CREATE POLICY property_listing_requests_select_own
  ON public.property_listing_requests
  FOR SELECT
  TO authenticated
  USING (submitter_id = requesting_user_id());
