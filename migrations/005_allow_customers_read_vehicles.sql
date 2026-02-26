-- Migration: Allow customers to read vehicles for booking creation
-- Purpose: Enable customers to fetch vehicles when selecting an agency for booking
-- Date: 2024

-- Policy: Allow customers to read vehicles from any agency
-- Customers need to see available vehicles to select when creating bookings
CREATE POLICY "Customers can read vehicles"
ON vehicles
FOR SELECT
TO authenticated
USING (
  -- Allow if current user is a customer
  has_role('customer')
);

-- Note: This policy allows customers to SELECT (read) vehicles from any agency
-- Customers can only read, not INSERT, UPDATE, or DELETE
-- This maintains security while enabling the booking flow

