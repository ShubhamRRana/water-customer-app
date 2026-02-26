-- Migration: Add receipt image URL to expenses table
-- Purpose: Enable storing receipt images for expense tracking
-- Date: 2025

-- Add receipt_image_url column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN expenses.receipt_image_url IS 'URL of the receipt image for the expense (stored in Supabase Storage)';
