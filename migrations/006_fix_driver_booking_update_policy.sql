-- Migration: Fix driver booking update policy to allow accepting orders
-- Purpose: Allow drivers to update bookings when accepting orders (driver_id IS NULL)
-- Date: 2024

-- Problem: The existing RLS policy `bookings_update_drivers` only allows updates when
-- `auth.uid() = driver_id`. However, when a driver accepts an order, the booking has
-- `driver_id IS NULL`, so the update fails.

-- Solution: Modify the policy to allow drivers to update bookings where:
-- 1. The driver_id is already set to their ID (for updates to their own bookings), OR
-- 2. The driver_id IS NULL AND the status is 'pending' (for accepting new orders)

-- Drop the existing policy
DROP POLICY IF EXISTS "bookings_update_drivers" ON bookings;

-- Create updated policy that allows drivers to:
-- - Update bookings they already own (auth.uid() = driver_id)
-- - Accept pending orders (driver_id IS NULL AND status = 'pending')
CREATE POLICY "bookings_update_drivers"
ON bookings
FOR UPDATE
TO authenticated
USING (
  has_role('driver')
  AND (
    -- Allow updates to bookings already assigned to this driver
    (auth.uid() = driver_id)
    OR
    -- Allow accepting pending orders (driver_id IS NULL)
    (driver_id IS NULL AND status = 'pending')
  )
)
WITH CHECK (
  has_role('driver')
  AND (
    -- After update, the booking must be assigned to this driver
    (auth.uid() = driver_id)
    OR
    -- Or it can still be pending (in case of other status updates before acceptance)
    (driver_id IS NULL AND status = 'pending')
  )
);

-- Note: This policy ensures that:
-- 1. Drivers can accept pending orders by setting driver_id to their own ID
-- 2. Drivers can only update bookings they own (after acceptance)
-- 3. Status updates are properly reflected across all views (customer, admin, driver)
-- 4. Security is maintained - drivers cannot update other drivers' bookings

