-- Persist "payment settled" for society tanker periods (month or year view) per customer

CREATE TABLE IF NOT EXISTS public.society_payment_periods_completed (
  customer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, period_key)
);

CREATE INDEX IF NOT EXISTS society_payment_periods_completed_customer_idx
  ON public.society_payment_periods_completed (customer_id);

ALTER TABLE public.society_payment_periods_completed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "society_payment_periods_completed_select_own"
  ON public.society_payment_periods_completed
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "society_payment_periods_completed_insert_own"
  ON public.society_payment_periods_completed
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "society_payment_periods_completed_update_own"
  ON public.society_payment_periods_completed
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);
