-- Link bookings to subscriptions and define validation for when subscription enforcement is enabled.
-- Applied to production Supabase as migration "add_subscription_check_to_bookings" (April 2026).
-- Superseded by `026_enforce_subscription_bookings_and_society_trips.sql`, which removes the
-- agency_id bypass and creates triggers on `bookings` and `society_trips`.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id);

-- Function body replaced in migration 026 (subscription required even when agency_id is set).
