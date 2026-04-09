-- Temporarily disable subscription gating for bookings and society trips.
-- Subscription gating will be enabled again after PhonePe Integration is completed.

-- Bookings trigger
DROP TRIGGER IF EXISTS check_subscription_before_booking ON public.bookings;
DROP FUNCTION IF EXISTS public.validate_booking_subscription();

-- Society trips trigger
DROP TRIGGER IF EXISTS check_subscription_before_society_trip ON public.society_trips;
DROP FUNCTION IF EXISTS public.validate_society_trip_subscription();

