-- Destructive data reset: remove all Auth users, public app users, bookings, and society payment data.
--
-- WHEN TO USE
--   Manual reset of dev/staging (or a controlled production wipe). Do NOT run on production
--   unless you intend to delete every account and order.
--
-- HOW TO RUN
--   Supabase SQL Editor (service role / postgres), or: supabase db execute --file ...
--   Requires permission to DELETE from auth.users.
--
-- WHAT IT DOES
--   1. Disables society_trips recompute trigger (avoids FK errors during bulk deletes).
--   2. Clears society_trips, society_payment_periods_completed, society_payment_transactions.
--   3. Drops pricing.updated_by FK and allows NULL (ON DELETE RESTRICT would block user deletes).
--   4. Clears bookings.subscription_id (subscriptions are removed with users).
--   5. DELETE FROM public.users (cascades roles, customers, drivers, admins, bookings, etc.).
--   6. DELETE FROM auth.users (cascades auth sessions, society FKs to auth, etc.).
--   7. Re-enables the society_trips trigger.
--
-- AFTER RUNNING
--   Recreate at least one admin user via Auth + app seed, then optionally restore:
--     ALTER TABLE public.pricing ALTER COLUMN updated_by SET NOT NULL;  -- only if you set updated_by
--     ALTER TABLE public.pricing ADD CONSTRAINT pricing_updated_by_fkey
--       FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT;

BEGIN;

ALTER TABLE public.society_trips DISABLE TRIGGER recompute_society_payment_period_from_trip;

DELETE FROM public.society_trips;
DELETE FROM public.society_payment_periods_completed;
DELETE FROM public.society_payment_transactions;

ALTER TABLE public.pricing DROP CONSTRAINT IF EXISTS pricing_updated_by_fkey;
ALTER TABLE public.pricing ALTER COLUMN updated_by DROP NOT NULL;

UPDATE public.bookings SET subscription_id = NULL WHERE subscription_id IS NOT NULL;

DELETE FROM public.users;
DELETE FROM auth.users;

ALTER TABLE public.society_trips ENABLE TRIGGER recompute_society_payment_period_from_trip;

COMMIT;
