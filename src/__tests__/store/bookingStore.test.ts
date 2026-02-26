/**
 * Booking Store Tests
 */

import { useBookingStore } from '../../store/bookingStore';
import { BookingService } from '../../services/booking.service';
import { Booking, BookingStatus } from '../../types';

// Mock the BookingService
jest.mock('../../services/booking.service');

describe('useBookingStore', () => {
  const mockBooking: Booking = {
    id: 'booking-1',
    customerId: 'customer-1',
    customerName: 'Test Customer',
    customerPhone: '1234567890',
    status: 'pending',
    tankerSize: 1000,
    basePrice: 500,
    distanceCharge: 100,
    totalPrice: 600,
    deliveryAddress: {
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      latitude: 0,
      longitude: 0,
    },
    distance: 10,
    paymentStatus: 'pending',
    canCancel: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset store state before each test
    useBookingStore.setState({
      bookings: [],
      currentBooking: null,
      isLoading: false,
      error: null,
      unsubscribeCurrentBooking: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useBookingStore.getState();

      expect(state.bookings).toEqual([]);
      expect(state.currentBooking).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.unsubscribeCurrentBooking).toBeNull();
    });
  });

  describe('createBooking', () => {
    it('should create booking successfully', async () => {
      (BookingService.createBooking as jest.Mock).mockResolvedValue('booking-1');

      const bookingId = await useBookingStore.getState().createBooking({
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        status: 'pending',
        tankerSize: 1000,
        basePrice: 500,
        distanceCharge: 100,
        totalPrice: 600,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
      });

      expect(bookingId).toBe('booking-1');
      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(BookingService.createBooking).toHaveBeenCalled();
    });

    it('should handle create booking errors', async () => {
      (BookingService.createBooking as jest.Mock).mockRejectedValue(new Error('Create error'));

      await expect(
        useBookingStore.getState().createBooking({
          customerId: 'customer-1',
          customerName: 'Test Customer',
          customerPhone: '1234567890',
          status: 'pending',
          tankerSize: 1000,
          basePrice: 500,
          distanceCharge: 100,
          totalPrice: 600,
          deliveryAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456',
            latitude: 0,
            longitude: 0,
          },
          distance: 10,
          paymentStatus: 'pending',
          canCancel: true,
        })
      ).rejects.toThrow('Create error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Create error');
    });
  });

  describe('updateBookingStatus', () => {
    it('should update booking status successfully', async () => {
      useBookingStore.setState({ bookings: [mockBooking] });
      (BookingService.updateBookingStatus as jest.Mock).mockResolvedValue(undefined);

      await useBookingStore.getState().updateBookingStatus('booking-1', 'accepted');

      const state = useBookingStore.getState();
      expect(state.bookings[0].status).toBe('accepted');
      expect(state.isLoading).toBe(false);
      expect(BookingService.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'accepted', undefined);
    });

    it('should update booking with additional data', async () => {
      useBookingStore.setState({ bookings: [mockBooking] });
      (BookingService.updateBookingStatus as jest.Mock).mockResolvedValue(undefined);

      await useBookingStore.getState().updateBookingStatus('booking-1', 'accepted', {
        driverId: 'driver-1',
      });

      const state = useBookingStore.getState();
      expect(state.bookings[0].status).toBe('accepted');
      expect(state.bookings[0].driverId).toBe('driver-1');
    });

    it('should handle update errors', async () => {
      useBookingStore.setState({ bookings: [mockBooking] });
      (BookingService.updateBookingStatus as jest.Mock).mockRejectedValue(new Error('Update error'));

      await expect(
        useBookingStore.getState().updateBookingStatus('booking-1', 'accepted')
      ).rejects.toThrow('Update error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Update error');
    });
  });

  describe('fetchCustomerBookings', () => {
    it('should fetch customer bookings successfully', async () => {
      const bookings = [mockBooking];
      (BookingService.getBookingsByCustomer as jest.Mock).mockResolvedValue(bookings);

      await useBookingStore.getState().fetchCustomerBookings('customer-1');

      const state = useBookingStore.getState();
      expect(state.bookings).toEqual(bookings);
      expect(state.isLoading).toBe(false);
      expect(BookingService.getBookingsByCustomer).toHaveBeenCalledWith('customer-1');
    });

    it('should handle fetch errors', async () => {
      (BookingService.getBookingsByCustomer as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(
        useBookingStore.getState().fetchCustomerBookings('customer-1')
      ).rejects.toThrow('Fetch error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('fetchAvailableBookings', () => {
    it('should fetch available bookings successfully', async () => {
      const bookings = [mockBooking];
      (BookingService.getAvailableBookings as jest.Mock).mockResolvedValue(bookings);

      await useBookingStore.getState().fetchAvailableBookings();

      const state = useBookingStore.getState();
      expect(state.bookings).toEqual(bookings);
      expect(state.isLoading).toBe(false);
      expect(BookingService.getAvailableBookings).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      (BookingService.getAvailableBookings as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(
        useBookingStore.getState().fetchAvailableBookings()
      ).rejects.toThrow('Fetch error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('fetchDriverBookings', () => {
    it('should fetch driver bookings successfully', async () => {
      const bookings = [{ ...mockBooking, driverId: 'driver-1' }];
      (BookingService.getBookingsByDriver as jest.Mock).mockResolvedValue(bookings);

      await useBookingStore.getState().fetchDriverBookings('driver-1');

      const state = useBookingStore.getState();
      expect(state.bookings).toEqual(bookings);
      expect(state.isLoading).toBe(false);
      expect(BookingService.getBookingsByDriver).toHaveBeenCalledWith('driver-1');
    });

    it('should handle fetch errors', async () => {
      (BookingService.getBookingsByDriver as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(
        useBookingStore.getState().fetchDriverBookings('driver-1')
      ).rejects.toThrow('Fetch error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('fetchAllBookings', () => {
    it('should fetch all bookings successfully', async () => {
      const bookings = [mockBooking];
      (BookingService.getAllBookings as jest.Mock).mockResolvedValue(bookings);

      await useBookingStore.getState().fetchAllBookings();

      const state = useBookingStore.getState();
      expect(state.bookings).toEqual(bookings);
      expect(state.isLoading).toBe(false);
      expect(BookingService.getAllBookings).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      (BookingService.getAllBookings as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(
        useBookingStore.getState().fetchAllBookings()
      ).rejects.toThrow('Fetch error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('getBookingById', () => {
    it('should get booking by id successfully', async () => {
      (BookingService.getBookingById as jest.Mock).mockResolvedValue(mockBooking);

      const booking = await useBookingStore.getState().getBookingById('booking-1');

      expect(booking).toEqual(mockBooking);
      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(BookingService.getBookingById).toHaveBeenCalledWith('booking-1');
    });

    it('should return null when booking not found', async () => {
      (BookingService.getBookingById as jest.Mock).mockResolvedValue(null);

      const booking = await useBookingStore.getState().getBookingById('non-existent');

      expect(booking).toBeNull();
    });

    it('should handle fetch errors', async () => {
      (BookingService.getBookingById as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(
        useBookingStore.getState().getBookingById('booking-1')
      ).rejects.toThrow('Fetch error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      useBookingStore.setState({ bookings: [mockBooking] });
      (BookingService.cancelBooking as jest.Mock).mockResolvedValue(undefined);

      await useBookingStore.getState().cancelBooking('booking-1', 'Customer request');

      const state = useBookingStore.getState();
      expect(state.bookings[0].status).toBe('cancelled');
      expect(state.bookings[0].cancellationReason).toBe('Customer request');
      expect(state.isLoading).toBe(false);
      expect(BookingService.cancelBooking).toHaveBeenCalledWith('booking-1', 'Customer request');
    });

    it('should handle cancel errors', async () => {
      useBookingStore.setState({ bookings: [mockBooking] });
      (BookingService.cancelBooking as jest.Mock).mockRejectedValue(new Error('Cancel error'));

      await expect(
        useBookingStore.getState().cancelBooking('booking-1', 'Reason')
      ).rejects.toThrow('Cancel error');

      const state = useBookingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Cancel error');
    });
  });

  describe('setCurrentBooking', () => {
    it('should set current booking and clean up subscription', () => {
      const mockUnsubscribe = jest.fn();
      useBookingStore.setState({ unsubscribeCurrentBooking: mockUnsubscribe });

      useBookingStore.getState().setCurrentBooking(mockBooking);

      const state = useBookingStore.getState();
      expect(state.currentBooking).toEqual(mockBooking);
      expect(state.unsubscribeCurrentBooking).toBeNull();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should set current booking to null', () => {
      useBookingStore.getState().setCurrentBooking(null);

      expect(useBookingStore.getState().currentBooking).toBeNull();
    });
  });

  describe('subscribeToBooking', () => {
    it('should subscribe to booking updates', () => {
      const mockUnsubscribe = jest.fn();
      (BookingService.subscribeToBookingUpdates as jest.Mock).mockReturnValue(mockUnsubscribe);

      useBookingStore.getState().subscribeToBooking('booking-1');

      const state = useBookingStore.getState();
      expect(state.unsubscribeCurrentBooking).toBe(mockUnsubscribe);
      expect(BookingService.subscribeToBookingUpdates).toHaveBeenCalledWith('booking-1', expect.any(Function));
    });

    it('should clean up existing subscription before creating new one', () => {
      const oldUnsubscribe = jest.fn();
      useBookingStore.setState({ unsubscribeCurrentBooking: oldUnsubscribe });

      const newUnsubscribe = jest.fn();
      (BookingService.subscribeToBookingUpdates as jest.Mock).mockReturnValue(newUnsubscribe);

      useBookingStore.getState().subscribeToBooking('booking-2');

      expect(oldUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useBookingStore.getState().unsubscribeCurrentBooking).toBe(newUnsubscribe);
    });

    it('should update current booking when subscription callback is called', () => {
      let callback: ((booking: Booking | null) => void) | undefined;
      (BookingService.subscribeToBookingUpdates as jest.Mock).mockImplementation((id, cb) => {
        callback = cb;
        return jest.fn();
      });

      useBookingStore.getState().subscribeToBooking('booking-1');

      const updatedBooking = { ...mockBooking, status: 'accepted' as BookingStatus };
      callback?.(updatedBooking);

      expect(useBookingStore.getState().currentBooking).toEqual(updatedBooking);
    });

    it('should update bookings array when subscription callback is called', () => {
      useBookingStore.setState({ bookings: [mockBooking] });

      let callback: ((booking: Booking | null) => void) | undefined;
      (BookingService.subscribeToBookingUpdates as jest.Mock).mockImplementation((id, cb) => {
        callback = cb;
        return jest.fn();
      });

      useBookingStore.getState().subscribeToBooking('booking-1');

      const updatedBooking = { ...mockBooking, status: 'accepted' as BookingStatus };
      callback?.(updatedBooking);

      expect(useBookingStore.getState().bookings[0]).toEqual(updatedBooking);
    });

    it('should remove booking from array when subscription callback returns null', () => {
      useBookingStore.setState({ bookings: [mockBooking] });

      let callback: ((booking: Booking | null) => void) | undefined;
      (BookingService.subscribeToBookingUpdates as jest.Mock).mockImplementation((id, cb) => {
        callback = cb;
        return jest.fn();
      });

      useBookingStore.getState().subscribeToBooking('booking-1');

      callback?.(null);

      expect(useBookingStore.getState().bookings).toHaveLength(0);
    });
  });

  describe('unsubscribeFromBooking', () => {
    it('should unsubscribe and clear subscription', () => {
      const mockUnsubscribe = jest.fn();
      useBookingStore.setState({ unsubscribeCurrentBooking: mockUnsubscribe });

      useBookingStore.getState().unsubscribeFromBooking();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useBookingStore.getState().unsubscribeCurrentBooking).toBeNull();
    });

    it('should handle when no subscription exists', () => {
      useBookingStore.setState({ unsubscribeCurrentBooking: null });

      expect(() => {
        useBookingStore.getState().unsubscribeFromBooking();
      }).not.toThrow();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useBookingStore.getState().setLoading(true);
      expect(useBookingStore.getState().isLoading).toBe(true);

      useBookingStore.getState().setLoading(false);
      expect(useBookingStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useBookingStore.getState().setError('Test error');
      expect(useBookingStore.getState().error).toBe('Test error');
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useBookingStore.setState({ error: 'Test error' });
      useBookingStore.getState().clearError();
      expect(useBookingStore.getState().error).toBeNull();
    });
  });
});

