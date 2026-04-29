import { useQuery } from '@tanstack/react-query';
import { BookingService } from '../../services/booking.service';
import { queryKeys } from './queryKeys';

export function useBookingByIdQuery(bookingId: string | undefined) {
  return useQuery({
    queryKey: bookingId ? queryKeys.bookings.detail(bookingId) : (['booking', '_idle'] as const),
    queryFn: () => BookingService.getBookingById(bookingId!),
    enabled: Boolean(bookingId),
  });
}
