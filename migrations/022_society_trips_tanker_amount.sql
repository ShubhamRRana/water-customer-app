-- Optional rupee amount for a society-logged tanker trip

ALTER TABLE public.society_trips
  ADD COLUMN IF NOT EXISTS tanker_amount integer
  CHECK (tanker_amount IS NULL OR (tanker_amount >= 0 AND tanker_amount <= 100000000));
