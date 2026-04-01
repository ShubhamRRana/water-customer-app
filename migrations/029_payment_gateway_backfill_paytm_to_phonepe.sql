-- Idempotent backfill for databases that applied an older 028 (default only, no UPDATE).
-- Safe if no rows match; subscription flow uses PhonePe only.
UPDATE public.payment_transactions
SET payment_gateway = 'phonepe'
WHERE payment_gateway = 'paytm';
