-- Allow customers (and admins) to delete society payment period rows on account deletion.
CREATE POLICY society_payment_periods_completed_delete_own
  ON public.society_payment_periods_completed
  FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY society_payment_periods_completed_delete_admin
  ON public.society_payment_periods_completed
  FOR DELETE
  TO authenticated
  USING (has_role('admin'::text));
