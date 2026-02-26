-- Migration: Add bank_name column to bank_accounts table
-- Date: 2024
-- Description: 
--   - Add bank_name column to store the name of the bank for each account

-- Step 1: Add the bank_name column
ALTER TABLE bank_accounts 
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Step 2: Add comment to the column for documentation
COMMENT ON COLUMN bank_accounts.bank_name IS 'Name of the bank for this account';

-- Step 3: Verify the migration
-- Run this query to verify the table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'bank_accounts' 
-- ORDER BY ordinal_position;

