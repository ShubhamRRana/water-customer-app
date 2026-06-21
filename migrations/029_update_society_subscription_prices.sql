-- Society customer subscription plan prices (monthly ₹2,399, yearly ₹24,469).
-- Society users see account_kind = 'society' plans only (not universal catalog rows).

UPDATE subscription_plans
SET price = 2399, updated_at = now()
WHERE account_kind = 'society' AND duration_months = 1 AND is_active = true;

UPDATE subscription_plans
SET price = 24469, updated_at = now()
WHERE account_kind = 'society' AND duration_months = 12 AND is_active = true;

-- Seed society plans from universal monthly/yearly templates when missing.
INSERT INTO subscription_plans (
  name,
  description,
  duration_months,
  price,
  currency,
  features,
  max_bookings_per_month,
  is_active,
  display_order,
  account_kind
)
SELECT
  src.name,
  src.description,
  src.duration_months,
  CASE WHEN src.duration_months = 1 THEN 2399 ELSE 24469 END,
  src.currency,
  src.features,
  src.max_bookings_per_month,
  true,
  src.display_order,
  'society'
FROM subscription_plans AS src
WHERE src.account_kind IS NULL
  AND src.duration_months IN (1, 12)
  AND src.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM subscription_plans AS existing
    WHERE existing.account_kind = 'society'
      AND existing.duration_months = src.duration_months
      AND existing.is_active = true
  );
