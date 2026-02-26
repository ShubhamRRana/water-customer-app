-- Migration: Create Supabase Storage bucket for bank QR code images
-- Date: 2024
-- Description: Creates a public storage bucket for storing bank account QR code images

-- Note: This migration should be run in Supabase Dashboard -> Storage
-- SQL Editor may not support storage bucket creation directly
-- Use the Supabase Dashboard Storage section instead

-- If running via SQL, you may need to use the storage API or dashboard:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Click "New bucket"
-- 3. Name: "bank-qr-codes"
-- 4. Public bucket: YES (so QR codes can be accessed without authentication)
-- 5. File size limit: 5 MB (adjust as needed)
-- 6. Allowed MIME types: image/jpeg, image/png, image/jpg

-- Storage bucket configuration:
-- - Bucket name: bank-qr-codes
-- - Public: true (QR codes need to be publicly accessible)
-- - File size limit: 5242880 (5 MB)
-- - Allowed MIME types: image/jpeg, image/png, image/jpg

-- Storage policies (RLS for storage):
-- Note: The bucket must be created first via Supabase Dashboard -> Storage
-- Bucket name: bank-qr-codes (must be public)

-- Allow public read access to QR code images
DROP POLICY IF EXISTS "Public read access for QR codes" ON storage.objects;
CREATE POLICY "Public read access for QR codes"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'bank-qr-codes');

-- Allow authenticated users to upload QR codes
DROP POLICY IF EXISTS "Authenticated users can upload QR codes" ON storage.objects;
CREATE POLICY "Authenticated users can upload QR codes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bank-qr-codes');

-- Allow authenticated users to update QR codes
DROP POLICY IF EXISTS "Authenticated users can update QR codes" ON storage.objects;
CREATE POLICY "Authenticated users can update QR codes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'bank-qr-codes')
WITH CHECK (bucket_id = 'bank-qr-codes');

-- Allow authenticated users to delete QR codes
DROP POLICY IF EXISTS "Authenticated users can delete QR codes" ON storage.objects;
CREATE POLICY "Authenticated users can delete QR codes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'bank-qr-codes');

