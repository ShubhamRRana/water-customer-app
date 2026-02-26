-- Migration: Add created_by_admin_id to drivers table
-- Purpose: Scope driver visibility to the admin who created them.
-- When an admin creates a driver, only that admin should see that driver in their list.

ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN drivers.created_by_admin_id IS 'User ID of the admin who created this driver account. Used to show drivers only to their creating admin.';
