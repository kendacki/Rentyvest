-- RentyVest initial schema with Privy-compatible Row-Level Security
-- Supabase Auth is disabled; JWT `sub` carries the Privy user ID (did:privy:...)

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    ''
  );
$$;

COMMENT ON FUNCTION public.requesting_user_id() IS
  'Extracts the Privy user ID (did:privy:...) from the JWT sub claim in request.jwt.claims.';

GRANT EXECUTE ON FUNCTION public.requesting_user_id() TO authenticated;

CREATE TABLE public.users (
  id text PRIMARY KEY,
  email text,
  wallet_address text,
  full_name text,
  role text NOT NULL DEFAULT 'investor'
    CHECK (role IN ('investor', 'seller', 'manager', 'admin')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique_idx
  ON public.users (email)
  WHERE email IS NOT NULL;

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  address_line1 text,
  city text,
  state text,
  country text,
  postal_code text,
  total_units integer NOT NULL DEFAULT 0 CHECK (total_units >= 0),
  unit_price numeric(18, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'funded', 'closed', 'archived')),
  listed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX properties_owner_id_idx ON public.properties (owner_id);
CREATE INDEX properties_status_idx ON public.properties (status);

CREATE TABLE public.pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE RESTRICT,
  units integer NOT NULL CHECK (units > 0),
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled', 'refunded')),
  idempotency_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pledges_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX pledges_user_id_idx ON public.pledges (user_id);
CREATE INDEX pledges_property_id_idx ON public.pledges (property_id);

CREATE TABLE public.nfts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE RESTRICT,
  owner_id text NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  pledge_id uuid REFERENCES public.pledges (id) ON DELETE SET NULL,
  canton_contract_id text NOT NULL,
  token_id text,
  share_units integer NOT NULL CHECK (share_units > 0),
  minted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX nfts_owner_id_idx ON public.nfts (owner_id);
CREATE INDEX nfts_property_id_idx ON public.nfts (property_id);
CREATE UNIQUE INDEX nfts_canton_contract_id_unique_idx
  ON public.nfts (canton_contract_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = requesting_user_id());

CREATE POLICY users_update_own
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = requesting_user_id())
  WITH CHECK (id = requesting_user_id());

CREATE POLICY properties_select_active_or_own
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    (status = 'active' AND requesting_user_id() IS NOT NULL)
    OR owner_id = requesting_user_id()
  );

CREATE POLICY pledges_select_own
  ON public.pledges
  FOR SELECT
  TO authenticated
  USING (user_id = requesting_user_id());
