-- Marketplace fields for real-time slot tracking

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS slots_filled integer NOT NULL DEFAULT 0
    CHECK (slots_filled >= 0);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS estimated_annual_yield numeric(5, 2) NOT NULL DEFAULT 0
    CHECK (estimated_annual_yield >= 0);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS image_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
END $$;
