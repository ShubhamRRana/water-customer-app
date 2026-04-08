-- Require active subscription for all new bookings (including when agency_id is set — customer-app path).
-- Require active subscription for society_trips inserts (defense in depth with app layer).

CREATE OR REPLACE FUNCTION public.validate_booking_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.has_active_subscription(NEW.customer_id) THEN
        RAISE EXCEPTION 'Active subscription required to create bookings';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_subscription_before_booking ON public.bookings;
CREATE TRIGGER check_subscription_before_booking
    BEFORE INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_booking_subscription();

CREATE OR REPLACE FUNCTION public.validate_society_trip_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.has_active_subscription(NEW.customer_id) THEN
        RAISE EXCEPTION 'Active subscription required to create society trips';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_subscription_before_society_trip ON public.society_trips;
CREATE TRIGGER check_subscription_before_society_trip
    BEFORE INSERT ON public.society_trips
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_society_trip_subscription();
