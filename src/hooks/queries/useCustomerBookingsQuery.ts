import { useQuery } from '@tanstack/react-query';
import { BookingService } from '../../services/booking.service';
import { queryKeys } from './queryKeys';

export function useCustomerBookingsQuery(customerId: string | undefined) {
  return useQuery({
    queryKey: customerId
      ? queryKeys.bookings.customer(customerId)
      : (['bookings', 'customer', '_idle'] as const),
    queryFn: () => BookingService.getBookingsByCustomer(customerId!),
    enabled: Boolean(customerId),
  });
}
