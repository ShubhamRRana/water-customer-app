# Database Migration Setup Guide

This guide walks you through the steps to migrate your Supabase database from bank account details to QR code images.

## Prerequisites

- Access to your Supabase project dashboard
- Admin access to modify database schema
- Backup of existing data (if you want to preserve it)

## Step-by-Step Migration

### Step 1: Backup Existing Data (Optional but Recommended)

If you have existing bank account data that you want to preserve:

```sql
-- Export existing bank account data
SELECT * FROM bank_accounts;
```

Save this data somewhere safe in case you need to reference it later.

### Step 2: Create Storage Bucket

1. Open your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Configure the bucket:
   - **Name**: `bank-qr-codes`
   - **Public bucket**: ✅ **YES** (This is important - QR codes need to be publicly accessible)
   - **File size limit**: 5242880 (5 MB) or adjust as needed
   - **Allowed MIME types**: `image/jpeg, image/png, image/jpg`
5. Click **"Create bucket"**

### Step 3: Apply Storage Policies

1. Go to **SQL Editor** in Supabase Dashboard
2. Open the file `migrations/002_create_storage_bucket.sql`
3. Copy and paste the SQL into the editor
4. Click **"Run"** to apply the storage policies

### Step 4: Update Database Schema

1. In **SQL Editor**, open the file `migrations/001_update_bank_accounts_table.sql`
2. Copy and paste the SQL into the editor
3. **Review the migration carefully** - it will permanently delete bank account detail columns
4. Click **"Run"** to execute the migration

### Step 5: Verify Migration

Run this query to verify the table structure:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
ORDER BY ordinal_position;
```

You should see:
- `id` (uuid)
- `admin_id` (uuid)
- `qr_code_image_url` (text, nullable)
- `is_default` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Step 6: Test the Application

1. Deploy or run the updated frontend code
2. Log in as an admin user
3. Navigate to Bank Accounts section
4. Try uploading a QR code image
5. Verify the image is stored and accessible
6. Log in as a driver
7. Create a test booking
8. Navigate to "Collect Payment" screen
9. Verify the QR code image is displayed correctly

## Troubleshooting

### Issue: Storage bucket not found

**Error**: `Bucket 'bank-qr-codes' not found`

**Solution**: 
- Make sure you created the bucket in Step 2
- Verify the bucket name is exactly `bank-qr-codes` (case-sensitive)

### Issue: QR code images not loading

**Error**: Images return 403 or 404

**Solution**:
- Verify the bucket is set as **Public**
- Check storage policies are applied correctly
- Ensure the `qr_code_image_url` in the database is a valid Supabase Storage URL

### Issue: Cannot upload images

**Error**: Permission denied when uploading

**Solution**:
- Verify storage policies allow authenticated users to upload
- Check that the user is properly authenticated
- Ensure RLS policies are correctly configured

### Issue: Migration fails

**Error**: Column does not exist or cannot drop column

**Solution**:
- The migration uses `IF EXISTS` checks, so it should be safe
- If columns don't exist, the migration will skip dropping them
- Check the error message for specific details

## Rollback Plan

If you need to rollback the migration:

1. **Restore from backup** (if you created one)
2. **Re-add the removed columns**:
   ```sql
   ALTER TABLE bank_accounts 
   ADD COLUMN account_holder_name TEXT,
   ADD COLUMN bank_name TEXT,
   ADD COLUMN account_number TEXT,
   ADD COLUMN ifsc_code TEXT,
   ADD COLUMN branch_name TEXT;
   ```
3. **Remove the new column**:
   ```sql
   ALTER TABLE bank_accounts DROP COLUMN qr_code_image_url;
   ```
4. **Restore data** from your backup

## Post-Migration Tasks

After successful migration:

1. ✅ Test admin QR code upload functionality
2. ✅ Test driver payment collection screen
3. ✅ Verify QR code images are publicly accessible
4. ✅ Check that existing bank accounts are handled gracefully
5. ✅ Update any documentation or API documentation

## Support

If you encounter issues:
1. Check the Supabase logs in the Dashboard
2. Review the error messages in the application console
3. Verify all migration steps were completed successfully
4. Check that the storage bucket exists and is public

