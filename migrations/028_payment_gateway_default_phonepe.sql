-- Default gateway for new payment rows (historical Paytm rows unchanged).
ALTER TABLE public.payment_transactions
  ALTER COLUMN payment_gateway SET DEFAULT 'phonepe';
