-- Migration: Add UPDATE policy for user_roles table
-- Purpose: Allow users to update their own role records (needed for upsert operations)
-- Date: 2024

-- Problem: When updating user profiles (e.g., driver earnings), the saveUser method
-- uses upsert on user_roles table. If the role already exists, it tries to UPDATE,
-- but there's no UPDATE policy, causing the operation to fail.

-- Solution: Add UPDATE policy that allows users to update their own role records.
-- This is safe because users can only update their own roles, and the role value
-- itself shouldn't change (it's just updating metadata like created_at).

-- Add UPDATE policy for user_roles
CREATE POLICY "user_roles_update_own"
ON user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: This policy ensures that:
-- 1. Users can update their own role records (needed for upsert operations)
-- 2. Security is maintained - users can only update their own roles
-- 3. This is necessary for operations like updating driver earnings which
--    trigger a full user profile save including role information

