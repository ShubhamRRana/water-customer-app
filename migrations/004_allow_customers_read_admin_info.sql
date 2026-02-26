-- Migration: Allow customers to read admin/agency information for booking creation
-- Purpose: Enable customers to fetch tanker agency information when creating bookings
-- Date: 2024

-- This migration adds RLS policies to allow customers to:
-- 1. Read admin users from the users table
-- 2. Read admin roles from the user_roles table  
-- 3. Read admin data from the admins table (for agency selection)

-- Helper function to check if current user has a specific role
-- This function checks the user_roles table to determine if the authenticated user has the specified role
CREATE OR REPLACE FUNCTION has_role(role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
    AND role = role_name
  );
$$;

-- Policy: Allow customers to read admin users from users table
-- Customers need to see admin users to select agencies when creating bookings
CREATE POLICY "Customers can read admin users"
ON users
FOR SELECT
TO authenticated
USING (
  -- Allow if current user is a customer
  has_role('customer')
  AND EXISTS (
    -- And the user being read has an admin role
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = users.id
    AND user_roles.role = 'admin'
  )
);

-- Policy: Allow customers to read admin roles from user_roles table
-- Customers need to identify which users are admins
CREATE POLICY "Customers can read admin roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  -- Allow if current user is a customer
  has_role('customer')
  -- And the role being read is 'admin'
  AND role = 'admin'
);

-- Policy: Allow customers to read admin data from admins table
-- Customers need business_name and user_id to display agency options
CREATE POLICY "Customers can read admin data"
ON admins
FOR SELECT
TO authenticated
USING (
  -- Allow if current user is a customer
  has_role('customer')
);

-- Note: These policies allow customers to read admin information for booking purposes
-- Customers can only SELECT (read), not INSERT, UPDATE, or DELETE
-- This maintains security while enabling the booking flow

