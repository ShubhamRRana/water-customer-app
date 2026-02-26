-- Migration: Allow admins to delete driver accounts they created
-- Purpose: Enable Delete Driver flow on Driver Management - admin can unassign
--          the driver from bookings, then remove driver row, user_roles, and user.
-- Uses: has_role() from migration 004.
-- Date: 2025

-- SECURITY DEFINER function so deletes run with definer rights after we verify
-- the driver was created by the current admin (auth.uid()).
CREATE OR REPLACE FUNCTION delete_driver_account(p_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
BEGIN
  -- Ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only allow if caller is admin and driver was created by this admin
  SELECT created_by_admin_id INTO v_created_by
  FROM drivers
  WHERE user_id = p_driver_id;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  IF v_created_by != auth.uid() THEN
    RAISE EXCEPTION 'Only the admin who created this driver can delete the account';
  END IF;

  IF NOT (SELECT has_role('admin')) THEN
    RAISE EXCEPTION 'Only admins can delete driver accounts';
  END IF;

  -- 1. Unassign driver from all bookings
  UPDATE bookings
  SET driver_id = NULL, driver_name = NULL, driver_phone = NULL
  WHERE driver_id = p_driver_id;

  -- 2. Delete driver row
  DELETE FROM drivers WHERE user_id = p_driver_id;

  -- 3. Delete user_roles for this user
  DELETE FROM user_roles WHERE user_id = p_driver_id;

  -- 4. Delete user
  DELETE FROM users WHERE id = p_driver_id;
END;
$$;

COMMENT ON FUNCTION delete_driver_account(uuid) IS 'Allows an admin to delete a driver account they created. Unassigns bookings, then deletes driver, user_roles, and user.';

-- Allow authenticated users to call (function itself enforces admin + created_by_admin_id)
GRANT EXECUTE ON FUNCTION delete_driver_account(uuid) TO authenticated;
