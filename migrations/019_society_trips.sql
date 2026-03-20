-- Migration: Society trips (log external tanker visits with photo + metadata)
-- RLS: customers manage only their own rows

CREATE TABLE IF NOT EXISTS public.society_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  agency_name text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  tanker_size_liters integer NOT NULL CHECK (tanker_size_liters > 0 AND tanker_size_liters <= 100000),
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS society_trips_customer_id_idx ON public.society_trips (customer_id);
CREATE INDEX IF NOT EXISTS society_trips_scheduled_at_idx ON public.society_trips (scheduled_at DESC);

ALTER TABLE public.society_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "society_trips_select_own"
  ON public.society_trips
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "society_trips_insert_own"
  ON public.society_trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);
