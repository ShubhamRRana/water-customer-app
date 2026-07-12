-- Prevent Auth user deletion from failing when society trip cascade triggers
-- recompute_society_payment_period while the auth.users row is already gone.
-- Also remove empty period rows instead of upserting zeros.

CREATE OR REPLACE FUNCTION public.recompute_society_payment_period(p_customer_id uuid, p_period_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year int;
  v_month0 int;
  v_month1 int;
  v_start timestamptz;
  v_end timestamptz;
  v_total numeric;
  v_paid numeric;
  v_left numeric;
  v_completed_at timestamptz;
BEGIN
  -- Auth/cascade deletes: skip when the auth user no longer exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_customer_id) THEN
    RETURN;
  END IF;

  -- Only handle month keys; ignore any existing year keys.
  IF p_period_key IS NULL OR p_period_key !~ '^m:[0-9]{4}-([0-9]|1[0-1])$' THEN
    RETURN;
  END IF;

  v_year := split_part(substring(p_period_key from 3), '-', 1)::int;
  v_month0 := split_part(substring(p_period_key from 3), '-', 2)::int;
  v_month1 := v_month0 + 1; -- postgres date months are 1–12

  v_start := make_timestamptz(v_year, v_month1, 1, 0, 0, 0, 'UTC');
  v_end := v_start + interval '1 month';

  SELECT COALESCE(SUM(COALESCE(t.tanker_amount, 0)), 0)
    INTO v_total
  FROM public.society_trips t
  WHERE t.customer_id = p_customer_id
    AND t.scheduled_at >= v_start
    AND t.scheduled_at < v_end;

  SELECT COALESCE(SUM(pt.amount), 0)
    INTO v_paid
  FROM public.society_payment_transactions pt
  WHERE pt.customer_id = p_customer_id
    AND pt.period_key = p_period_key;

  v_left := GREATEST(v_total - v_paid, 0);

  -- No trips left for the period: drop the completion row instead of upserting zeros
  IF v_total = 0 THEN
    DELETE FROM public.society_payment_periods_completed
    WHERE customer_id = p_customer_id
      AND period_key = p_period_key;
    RETURN;
  END IF;

  -- Only mark completed when there is something to settle and left reaches zero.
  v_completed_at := CASE WHEN v_total > 0 AND v_left = 0 THEN now() ELSE NULL END;

  INSERT INTO public.society_payment_periods_completed (
    customer_id,
    period_key,
    total_amount,
    amount_paid,
    amount_left,
    completed_at
  )
  VALUES (
    p_customer_id,
    p_period_key,
    v_total,
    v_paid,
    v_left,
    v_completed_at
  )
  ON CONFLICT (customer_id, period_key)
  DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    amount_paid = EXCLUDED.amount_paid,
    amount_left = EXCLUDED.amount_left,
    completed_at = EXCLUDED.completed_at;
END;
$function$;
