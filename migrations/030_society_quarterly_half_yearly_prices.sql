-- Society 3-month (₹6,117) and 6-month (₹12,235) subscription prices.
-- Matches ~15% savings vs paying monthly (₹2,399/mo), consistent with yearly (₹24,469).

UPDATE subscription_plans
SET price = 6117, updated_at = now()
WHERE account_kind = 'society' AND duration_months = 3 AND is_active = true;

UPDATE subscription_plans
SET price = 12235, updated_at = now()
WHERE account_kind = 'society' AND duration_months = 6 AND is_active = true;

UPDATE subscription_plans
SET display_order = duration_months, updated_at = now()
WHERE account_kind = 'society'
  AND duration_months IN (1, 3, 6, 12)
  AND is_active = true;

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
  CASE WHEN d.duration_months = 3 THEN 'Society Quarterly' ELSE 'Society Half Yearly' END,
  m.description,
  d.duration_months,
  CASE WHEN d.duration_months = 3 THEN 6117 ELSE 12235 END,
  m.currency,
  m.features,
  m.max_bookings_per_month,
  true,
  d.duration_months,
  'society'
FROM subscription_plans AS m
CROSS JOIN (VALUES (3), (6)) AS d(duration_months)
WHERE m.account_kind = 'society'
  AND m.duration_months = 1
  AND m.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM subscription_plans AS existing
    WHERE existing.account_kind = 'society'
      AND existing.duration_months = d.duration_months
      AND existing.is_active = true
  );
