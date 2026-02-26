-- Migration: Update bank_accounts table to use QR code images instead of bank details
-- Date: 2024
-- Description: 
--   - Remove old bank detail columns (account_holder_name, bank_name, account_number, ifsc_code, branch_name)
--   - Add new qr_code_image_url column for storing QR code image URLs

-- Step 1: Add the new qr_code_image_url column
ALTER TABLE bank_accounts 
ADD COLUMN IF NOT EXISTS qr_code_image_url TEXT;

-- Step 2: Remove old columns (only if they exist)
-- Note: This will permanently delete data in these columns
-- Make sure to backup your data before running this migration if needed

DO $$ 
BEGIN
  -- Drop account_holder_name column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bank_accounts' 
    AND column_name = 'account_holder_name'
  ) THEN
    ALTER TABLE bank_accounts DROP COLUMN account_holder_name;
  END IF;

  -- Drop bank_name column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bank_accounts' 
    AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE bank_accounts DROP COLUMN bank_name;
  END IF;

  -- Drop account_number column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bank_accounts' 
    AND column_name = 'account_number'
  ) THEN
    ALTER TABLE bank_accounts DROP COLUMN account_number;
  END IF;

  -- Drop ifsc_code column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bank_accounts' 
    AND column_name = 'ifsc_code'
  ) THEN
    ALTER TABLE bank_accounts DROP COLUMN ifsc_code;
  END IF;

  -- Drop branch_name column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bank_accounts' 
    AND column_name = 'branch_name'
  ) THEN
    ALTER TABLE bank_accounts DROP COLUMN branch_name;
  END IF;
END $$;

-- Step 3: Add comment to the new column for documentation
COMMENT ON COLUMN bank_accounts.qr_code_image_url IS 'URL of the QR code image for payment collection, stored in Supabase Storage';

-- Step 4: Verify the migration
-- Run this query to verify the table structure:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'bank_accounts' 
-- ORDER BY ordinal_position;

