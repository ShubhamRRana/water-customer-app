-- Migration: Make vehicle amount nullable
-- Description: Allow vehicles to be created without an amount. Amount will be set by driver at delivery time.

-- Make amount column nullable in vehicles table
ALTER TABLE vehicles 
ALTER COLUMN amount DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN vehicles.amount IS 'Optional amount in rupees. Set by driver at delivery time.';

