/**
 * Booking Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookingService } from '../../services/booking.service';
import { LocalStorageService } from '../../services/localStorage';
import { Booking, BookingStatus } from '../../types';

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
});

// Restore all mocks after each test to prevent mock leakage
afterEach(() => {
  jest.restoreAllMocks();
});

describe('BookingService', () => {
  const mockBookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
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
  };

  describe('createBooking', () => {
    it('should create a new booking with generated ID', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      
      expect(bookingId).toBeTruthy();
      expect(typeof bookingId).toBe('string');
      
      const savedBooking = await LocalStorageService.getBookingById(bookingId);
      expect(savedBooking).toBeTruthy();
      expect(savedBooking?.customerId).toBe(mockBookingData.customerId);
      expect(savedBooking?.status).toBe('pending');
      expect(savedBooking?.createdAt).toBeInstanceOf(Date);
      expect(savedBooking?.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'saveBooking').mockRejectedValue(new Error('Storage error'));
      
      await expect(BookingService.createBooking(mockBookingData)).rejects.toThrow('Storage error');
    });
  });

  describe('updateBookingStatus', () => {
    let bookingId: string;

    beforeEach(async () => {
      bookingId = await BookingService.createBooking(mockBookingData);
    });

    it('should update booking status to accepted', async () => {
      await BookingService.updateBookingStatus(bookingId, 'accepted');
      
      const booking = await LocalStorageService.getBookingById(bookingId);
      expect(booking?.status).toBe('accepted');
      expect(booking?.acceptedAt).toBeInstanceOf(Date);
      expect(booking?.updatedAt).toBeInstanceOf(Date);
    });

    it('should update booking status to delivered', async () => {
      await BookingService.updateBookingStatus(bookingId, 'delivered');
      
      const booking = await LocalStorageService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');
      expect(booking?.deliveredAt).toBeInstanceOf(Date);
      expect(booking?.updatedAt).toBeInstanceOf(Date);
    });

    it('should update booking status with additional data', async () => {
      const additionalData = { driverId: 'driver-1', driverName: 'Test Driver' };
      await BookingService.updateBookingStatus(bookingId, 'accepted', additionalData);
      
      const booking = await LocalStorageService.getBookingById(bookingId);
      expect(booking?.status).toBe('accepted');
      expect(booking?.driverId).toBe('driver-1');
      expect(booking?.driverName).toBe('Test Driver');
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValue(new Error('Update error'));
      
      await expect(BookingService.updateBookingStatus(bookingId, 'accepted')).rejects.toThrow('Update error');
    });
  });

  describe('getBookingsByCustomer', () => {
    beforeEach(async () => {
      await BookingService.createBooking(mockBookingData);
      await BookingService.createBooking({ ...mockBookingData, customerId: 'customer-2' });
    });

    it('should return bookings for specific customer', async () => {
      const bookings = await BookingService.getBookingsByCustomer('customer-1');
      
      expect(bookings).toHaveLength(1);
      expect(bookings[0].customerId).toBe('customer-1');
    });

    it('should return empty array for customer with no bookings', async () => {
      const bookings = await BookingService.getBookingsByCustomer('non-existent');
      
      expect(bookings).toHaveLength(0);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getBookingsByCustomer').mockRejectedValue(new Error('Fetch error'));
      
      await expect(BookingService.getBookingsByCustomer('customer-1')).rejects.toThrow('Fetch error');
    });
  });

  describe('getAvailableBookings', () => {
    beforeEach(async () => {
      await BookingService.createBooking(mockBookingData);
      await BookingService.createBooking({ ...mockBookingData, status: 'accepted', driverId: 'driver-1' });
      await BookingService.createBooking({ ...mockBookingData, status: 'delivered' });
    });

    it('should return only pending bookings without driver', async () => {
      const bookings = await BookingService.getAvailableBookings();
      
      expect(bookings.length).toBeGreaterThan(0);
      bookings.forEach(booking => {
        expect(booking.status).toBe('pending');
        expect(booking.driverId).toBeUndefined();
      });
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getAvailableBookings').mockRejectedValue(new Error('Fetch error'));
      
      await expect(BookingService.getAvailableBookings()).rejects.toThrow('Fetch error');
    });
  });

  describe('getBookingsByDriver', () => {
    beforeEach(async () => {
      await BookingService.createBooking({ ...mockBookingData, driverId: 'driver-1', status: 'accepted' });
      await BookingService.createBooking({ ...mockBookingData, driverId: 'driver-2', status: 'accepted' });
      await BookingService.createBooking(mockBookingData);
    });

    it('should return bookings for specific driver', async () => {
      const bookings = await BookingService.getBookingsByDriver('driver-1');
      
      expect(bookings.length).toBeGreaterThan(0);
      bookings.forEach(booking => {
        expect(booking.driverId).toBe('driver-1');
      });
    });

    it('should return empty array for driver with no bookings', async () => {
      const bookings = await BookingService.getBookingsByDriver('non-existent');
      
      expect(bookings).toHaveLength(0);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getBookingsByDriver').mockRejectedValue(new Error('Fetch error'));
      
      await expect(BookingService.getBookingsByDriver('driver-1')).rejects.toThrow('Fetch error');
    });
  });

  describe('getAllBookings', () => {
    beforeEach(async () => {
      await BookingService.createBooking(mockBookingData);
      await BookingService.createBooking({ ...mockBookingData, status: 'accepted' });
    });

    it('should return all bookings', async () => {
      const bookings = await BookingService.getAllBookings();
      
      expect(bookings.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getBookings').mockRejectedValue(new Error('Fetch error'));
      
      await expect(BookingService.getAllBookings()).rejects.toThrow('Fetch error');
    });
  });

  describe('getBookingById', () => {
    let bookingId: string;

    beforeEach(async () => {
      bookingId = await BookingService.createBooking(mockBookingData);
    });

    it('should return booking by ID', async () => {
      const booking = await BookingService.getBookingById(bookingId);
      
      expect(booking).toBeTruthy();
      expect(booking?.id).toBe(bookingId);
      expect(booking?.customerId).toBe(mockBookingData.customerId);
    });

    it('should return null for non-existent booking', async () => {
      const booking = await BookingService.getBookingById('non-existent');
      
      expect(booking).toBeNull();
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getBookingById').mockRejectedValue(new Error('Fetch error'));
      
      await expect(BookingService.getBookingById(bookingId)).rejects.toThrow('Fetch error');
    });
  });

  describe('subscribeToBookingUpdates', () => {
    it('should return a no-op unsubscribe function', () => {
      const unsubscribe = BookingService.subscribeToBookingUpdates('booking-1', () => {});
      
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('cancelBooking', () => {
    let bookingId: string;

    beforeEach(async () => {
      bookingId = await BookingService.createBooking(mockBookingData);
    });

    it('should cancel booking with reason', async () => {
      const reason = 'Customer requested cancellation';
      await BookingService.cancelBooking(bookingId, reason);
      
      const booking = await LocalStorageService.getBookingById(bookingId);
      expect(booking?.status).toBe('cancelled');
      expect(booking?.cancellationReason).toBe(reason);
      expect(booking?.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValue(new Error('Update error'));
      
      await expect(BookingService.cancelBooking(bookingId, 'reason')).rejects.toThrow('Update error');
    });
  });
});

