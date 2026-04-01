-- Allow customers to update their own checkout rows while still pending (e.g. link gateway_order_id).
-- Cannot mark success from the client; Edge Functions use service_role.
CREATE POLICY "Users can update own pending payment transactions"
  ON public.payment_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'processing'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'processing'));
