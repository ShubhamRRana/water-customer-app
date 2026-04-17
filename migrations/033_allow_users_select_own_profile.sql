-- Migration: Allow authenticated users to read their own profile rows
-- Purpose: Fix login failures where Supabase Auth succeeds but RLS blocks reading
--          from public.users / public.user_roles / role tables for the current user.
--
-- Notes:
-- - Existing policies (e.g. customers reading admin info) remain in effect.
-- - These policies only grant SELECT on the caller's own rows.

BEGIN;

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop & recreate to keep this migration idempotent across environments
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own"
ON public.customers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "drivers_select_own" ON public.drivers;
CREATE POLICY "drivers_select_own"
ON public.drivers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
CREATE POLICY "admins_select_own"
ON public.admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

COMMIT;

