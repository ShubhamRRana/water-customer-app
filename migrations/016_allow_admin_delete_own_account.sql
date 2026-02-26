-- Migration: Allow admins to delete their own account and related data
-- Purpose: Enable Delete Account flow on admin Profile - admin can remove their
--          expenses, bank accounts, admin profile, roles, and user (must delete in dependency order).
-- Uses: has_role() from migration 004. user_roles_delete_own and users_delete_own from 013.
-- Date: 2025

-- bank_accounts: allow delete where admin_id = auth.uid() and user is admin
CREATE POLICY "bank_accounts_delete_own_admin"
ON bank_accounts
FOR DELETE
TO authenticated
USING (
  has_role('admin')
  AND admin_id = auth.uid()
);

-- admins: allow delete where user_id = auth.uid()
CREATE POLICY "admins_delete_own"
ON admins
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
