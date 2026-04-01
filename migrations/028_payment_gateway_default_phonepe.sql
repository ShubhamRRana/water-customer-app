-- Subscription checkout uses PhonePe only. Fix default and rows inserted before this migration
-- when the column default was still 'paytm' (migration 024 originally used paytm; corrected in-repo).
UPDATE public.payment_transactions
SET payment_gateway = 'phonepe'
WHERE payment_gateway = 'paytm';

ALTER TABLE public.payment_transactions
  ALTER COLUMN payment_gateway SET DEFAULT 'phonepe';
