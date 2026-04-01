-- Link bookings to subscriptions and define validation for when subscription enforcement is enabled.
-- Applied to production Supabase as migration "add_subscription_check_to_bookings" (April 2026).
-- The trigger is NOT created here — enable it in a controlled rollout (see comments below).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id);

CREATE OR REPLACE FUNCTION public.validate_booking_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Skip validation when booking is created via agency/backend path (not self-serve customer insert)
    IF NEW.agency_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.has_active_subscription(NEW.customer_id) THEN
        RAISE EXCEPTION 'Active subscription required to create bookings';
    END IF;

    RETURN NEW;
END;
$$;

-- Apply when product is ready to require subscription for direct customer bookings:
-- CREATE TRIGGER check_subscription_before_booking
--     BEFORE INSERT ON public.bookings
--     FOR EACH ROW
--     EXECUTE FUNCTION public.validate_booking_subscription();
