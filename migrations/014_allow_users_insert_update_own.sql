-- Migration: Allow users to INSERT and UPDATE their own row on users table
-- Purpose: With email authentication enabled, new sign-ups create a user in Supabase Auth
--          and then insert a row into public.users. That insert runs as the new user (JWT).
--          Without an RLS policy allowing INSERT where id = auth.uid(), the insert fails with
--          "new row violates row-level security policy for table users".
-- Date: 2025

-- Allow authenticated users to insert their own profile row (id must match auth.uid())
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile row
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
