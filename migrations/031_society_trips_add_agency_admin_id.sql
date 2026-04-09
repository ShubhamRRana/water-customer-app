-- Add agency_admin_id for admin-scoped trip fetching
-- Used by admin tooling to fetch trips by admin/agency user id.

ALTER TABLE public.society_trips
  ADD COLUMN IF NOT EXISTS agency_admin_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS society_trips_agency_admin_id_idx
  ON public.society_trips (agency_admin_id);

