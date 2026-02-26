# Database Migrations

This directory contains SQL migration files for updating the Supabase database schema.

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of the migration file
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

## Migration Files

### 001_update_bank_accounts_table.sql

**Purpose**: Updates the `bank_accounts` table to use QR code images instead of bank account details.

**Changes**:
- Removes columns: `account_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `branch_name`
- Adds column: `qr_code_image_url` (TEXT)

**Important Notes**:
- ⚠️ **This migration will permanently delete existing bank account detail data**
- Make sure to backup your data before running this migration if you need to preserve it
- After running this migration, admins will need to upload QR code images for their bank accounts

**When to Run**: 
- Run this migration when updating the app to use QR code images for payment collection
- Run before deploying the updated frontend code

### 002_create_storage_bucket.sql

**Purpose**: Sets up Supabase Storage bucket and policies for QR code images.

**Important Notes**:
- ⚠️ **This file contains SQL for storage policies, but the bucket itself must be created via Supabase Dashboard**
- The bucket must be created manually in Supabase Dashboard -> Storage
- Bucket name: `bank-qr-codes`
- Must be set as **Public** so QR codes can be accessed without authentication

**Steps to Create Bucket**:
1. Go to Supabase Dashboard -> Storage
2. Click "New bucket"
3. Name: `bank-qr-codes`
4. Public bucket: **YES** (required for QR code access)
5. File size limit: 5 MB (adjust as needed)
6. Allowed MIME types: `image/jpeg`, `image/png`, `image/jpg`
7. Click "Create bucket"

**When to Run**: 
- Run after creating the bucket in the dashboard
- The SQL policies can be applied via SQL Editor after the bucket is created

### 003_add_bank_name_column.sql

**Purpose**: Adds a `bank_name` column to the `bank_accounts` table.

**When to Run**: 
- Run when you need to store bank names along with QR codes

### 004_allow_customers_read_admin_info.sql

**Purpose**: Allows customers to read admin/agency information for booking creation.

**Problem Solved**: 
- After enabling RLS policies, customers were unable to fetch tanker agency information when creating bookings
- This migration fixes the issue by allowing customers to read admin data needed for agency selection

**Changes**:
- Creates `has_role()` helper function to check user roles
- Adds RLS policy: "Customers can read admin users" on `users` table
- Adds RLS policy: "Customers can read admin roles" on `user_roles` table  
- Adds RLS policy: "Customers can read admin data" on `admins` table

**Security Notes**:
- Customers can only SELECT (read) admin information, not modify it
- Only authenticated users with 'customer' role can access admin data
- This maintains security while enabling the booking flow

**When to Run**: 
- Run immediately after enabling RLS if customers cannot see agency information
- Required for booking creation flow to work properly

### 005_allow_customers_read_vehicles.sql

**Purpose**: Allows customers to read vehicles from agencies for booking creation.

**Problem Solved**: 
- After enabling RLS policies, customers could select agencies but could not see vehicles for those agencies
- This migration fixes the issue by allowing customers to read vehicles needed for booking

**Changes**:
- Adds RLS policy: "Customers can read vehicles" on `vehicles` table

**Security Notes**:
- Customers can only SELECT (read) vehicles, not modify them
- Only authenticated users with 'customer' role can access vehicles
- This maintains security while enabling the booking flow

**When to Run**: 
- Run immediately after enabling RLS if customers cannot see vehicles for selected agencies
- Required for complete booking creation flow to work properly

### 008_allow_drivers_read_bank_accounts.sql

**Purpose**: Allows drivers to read bank accounts for payment collection.

**Problem Solved**: 
- After enabling RLS policies, drivers were unable to fetch QR codes from bank accounts when collecting payment for completed bookings
- This migration fixes the issue by allowing drivers to read bank accounts for agencies where they have assigned bookings

**Changes**:
- Adds RLS policy: "Drivers can read bank accounts for assigned bookings" on `bank_accounts` table

**Security Notes**:
- Drivers can only SELECT (read) bank accounts, not modify them
- Only authenticated users with 'driver' role can access bank accounts
- Drivers can only access bank accounts for agencies where they have active or completed bookings (not cancelled)
- This maintains security while enabling the payment collection flow

**When to Run**: 
- Run immediately after enabling RLS if drivers cannot see QR codes on the Collect Payment screen
- Required for payment collection flow to work properly

### 014_allow_users_insert_update_own.sql

**Purpose**: Allows authenticated users to insert and update their own row on the `users` table.

**Problem Solved**: 
- After enabling **email authentication** in Supabase, new account creation fails with:  
  `new row violates row-level security policy for table "users"`.
- With email auth, sign-up creates a user in Supabase Auth and then inserts a row into `public.users` using the new user's JWT. Without an RLS policy allowing INSERT where `id = auth.uid()`, that insert is denied.

**Changes**:
- Adds RLS policy: `users_insert_own` — INSERT allowed when `id = auth.uid()`
- Adds RLS policy: `users_update_own` — UPDATE allowed when `id = auth.uid()`

**When to Run**: 
- Run as soon as you enable email authentication in Supabase Auth if registration/create account fails with an RLS violation on `users`.

### 015_sync_auth_user_to_public_users_trigger.sql

**Purpose**: Creates a trigger on `auth.users` so that when a new user is created in Supabase Auth, a row is automatically inserted into `public.users` and `public.user_roles`. The trigger runs with `SECURITY DEFINER` and bypasses RLS.

**Problem Solved**: 
- Even with policy 014, registration can still fail with "new row violates row-level security policy for table users" when **Confirm email** is enabled: after `signUp()` the client often has no session until the user confirms, so the client-side insert runs without `auth.uid()` and is denied by RLS.
- The trigger runs on the server when Auth inserts into `auth.users`, so the `public.users` (and `user_roles`) row is created regardless of client session. The app then only creates role-specific data (customers, drivers, admins).

**Requirements**: 
- The app passes `name`, `role`, and `phone` in `signUp` options `data` so the trigger can populate `users` and `user_roles`. Apply this migration **and** deploy the app change that uses it.

**When to Run**: 
- Run if you still get RLS violation on `users` after 014, or if you use **Confirm email** and want sign-up to work without requiring a session on the client.

## Verification

After running a migration, verify the changes:

```sql
-- Check bank_accounts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
ORDER BY ordinal_position;
```

Expected columns after migration:
- `id` (uuid)
- `admin_id` (uuid)
- `qr_code_image_url` (text)
- `is_default` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Rollback

If you need to rollback this migration, you would need to:

1. Add back the removed columns
2. Remove the `qr_code_image_url` column
3. Restore data from backup (if available)

**Note**: Rollback is only possible if you have a backup of the original data.

