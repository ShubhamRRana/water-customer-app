import type { QueryClient } from '@tanstack/react-query';
import type { Booking } from '../../types';
import { queryKeys } from './queryKeys';

export function setBookingDetailInCache(
  queryClient: QueryClient,
  bookingId: string,
  booking: Booking | null
): void {
  queryClient.setQueryData(queryKeys.bookings.detail(bookingId), booking);
}

export function patchBookingInCustomerListCache(
  queryClient: QueryClient,
  customerId: string,
  bookingId: string,
  booking: Booking | null
): void {
  queryClient.setQueryData(
    queryKeys.bookings.customer(customerId),
    (prev: Booking[] | undefined) => {
      if (!prev) return prev;
      if (!booking) {
        return prev.filter((b) => b.id !== bookingId);
      }
      const idx = prev.findIndex((b) => b.id === bookingId);
      if (idx === -1) return [...prev, booking];
      return prev.map((b) => (b.id === bookingId ? booking : b));
    }
  );
}
