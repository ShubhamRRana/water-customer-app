import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Booking, BookingStatus } from '../../types';
import { BookingService } from '../../services/booking.service';
import { queryKeys } from './queryKeys';

export function useCreateBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) =>
      BookingService.createBooking(bookingData),
    onSuccess: (_id, bookingData) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.customer(bookingData.customerId),
      });
    },
  });
}

export function useUpdateBookingStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      status,
      additionalData,
    }: {
      bookingId: string;
      status: BookingStatus;
      additionalData?: Partial<Booking>;
    }) => BookingService.updateBookingStatus(bookingId, status, additionalData),
    onSuccess: (_void, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}

export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string; customerId: string }) =>
      BookingService.cancelBooking(bookingId, reason),
    onSuccess: (_void, { bookingId, customerId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customer(customerId) });
    },
  });
}
