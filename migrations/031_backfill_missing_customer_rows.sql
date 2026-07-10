-- Backfill customers profile rows for users with customer role but no customers row.
-- Safe to run multiple times (skips existing rows via NOT EXISTS).

INSERT INTO customers (user_id, saved_addresses, account_kind)
SELECT ur.user_id, '[]'::jsonb, 'individual'
FROM user_roles ur
WHERE ur.role = 'customer'
  AND NOT EXISTS (
    SELECT 1 FROM customers c WHERE c.user_id = ur.user_id
  );
