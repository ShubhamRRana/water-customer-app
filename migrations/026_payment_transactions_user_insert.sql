-- Allow authenticated customers to insert their own payment transaction rows (pending checkout).
-- Completion and status updates remain via service_role (Edge Functions + activation).
CREATE POLICY "Users can insert own payment transactions"
  ON public.payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
