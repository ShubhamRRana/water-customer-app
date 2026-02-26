-- Migration: Allow drivers to read bank accounts for payment collection
-- Purpose: Enable drivers to fetch QR codes from bank accounts for completed bookings
-- Date: 2024

-- This migration adds RLS policy to allow drivers to:
-- Read bank accounts for agencies where they have assigned bookings
-- This is needed for the Collect Payment screen to display QR codes

-- Policy: Allow drivers to read bank accounts for assigned bookings
-- Drivers need to see bank account QR codes when collecting payment for completed deliveries
CREATE POLICY "Drivers can read bank accounts for assigned bookings"
ON bank_accounts
FOR SELECT
TO authenticated
USING (
  -- Allow if current user is a driver
  has_role('driver')
  AND EXISTS (
    -- And the driver has a booking assigned to them
    -- Where the booking's agency_id matches the bank_account's admin_id
    SELECT 1
    FROM bookings
    WHERE bookings.driver_id = auth.uid()
    AND bookings.agency_id = bank_accounts.admin_id
    -- Only allow for bookings that are in progress or completed (not cancelled)
    AND bookings.status != 'cancelled'
  )
);

-- Note: This policy allows drivers to read bank accounts (including QR codes) for agencies
-- where they have active or completed bookings. Drivers can only SELECT (read), not INSERT, UPDATE, or DELETE.
-- This maintains security while enabling the payment collection flow.

