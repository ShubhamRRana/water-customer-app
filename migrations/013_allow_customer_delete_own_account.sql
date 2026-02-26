-- Migration: Allow customers to delete their own account and related data
-- Purpose: Enable Delete Account flow - customer can remove their user, roles,
--          customer profile, and all their bookings (must delete in dependency order).
-- Date: 2025

-- bookings: allow delete where customer_id = auth.uid()
CREATE POLICY "bookings_delete_own_customer"
ON bookings
FOR DELETE
TO authenticated
USING (auth.uid() = customer_id);

-- customers: allow delete where user_id = auth.uid()
CREATE POLICY "customers_delete_own"
ON customers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- user_roles: allow delete where user_id = auth.uid()
CREATE POLICY "user_roles_delete_own"
ON user_roles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- users: allow delete where id = auth.uid()
CREATE POLICY "users_delete_own"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);
