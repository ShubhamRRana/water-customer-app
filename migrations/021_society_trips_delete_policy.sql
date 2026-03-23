-- Allow customers to delete their own society trip rows

CREATE POLICY "society_trips_delete_own"
  ON public.society_trips
  FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);
