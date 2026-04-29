import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookingService } from '../../services/booking.service';
import { queryKeys } from './queryKeys';
import { patchBookingInCustomerListCache, setBookingDetailInCache } from './bookingQueryUtils';

/**
 * Subscribes to booking row updates and mirrors them into React Query cache
 * (`['booking', id]` and the customer's list query when `customerId` is known).
 */
export function useBookingRealtimeSubscription(
  bookingId: string | undefined,
  customerIdHint?: string | undefined
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = BookingService.subscribeToBookingUpdates(bookingId, (booking) => {
      setBookingDetailInCache(queryClient, bookingId, booking);
      const customerId = booking?.customerId ?? customerIdHint;
      if (customerId) {
        patchBookingInCustomerListCache(queryClient, customerId, bookingId, booking);
      }
      if (!booking) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      }
    });

    return unsubscribe;
  }, [bookingId, customerIdHint, queryClient]);
}
