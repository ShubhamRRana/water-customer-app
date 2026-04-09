/**
 * Booking Service Tests (in-memory dataAccess; aligns with Supabase-backed implementation)
 */

jest.mock('../../lib/index', () => {
  const { inMemoryDataAccessForBookingTests } = require('../helpers/inMemoryBookingDataAccess');
  return { dataAccess: inMemoryDataAccessForBookingTests };
});

jest.mock('../../services/subscription.service', () => ({
  SubscriptionService: {
    hasActiveSubscription: jest.fn().mockResolvedValue(true),
    getUserSubscription: jest.fn().mockResolvedValue({
      id: 'sub-test',
      userId: 'customer-1',
      planId: 'plan-1',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 365),
      autoRenew: false,
      cancelledAt: null,
      cancellationReason: null,
      trialEndDate: null,
      isTrial: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ERROR_MESSAGES } from '../../constants/config';
import { BookingService } from '../../services/booking.service';
import { SubscriptionService } from '../../services/subscription.service';
import { Booking } from '../../types';
import {
  clearBookingTestStore,
  inMemoryDataAccessForBookingTests,
} from '../helpers/inMemoryBookingDataAccess';

beforeEach(async () => {
  await AsyncStorage.clear();
  clearBookingTestStore();
});

afterEach(() => {
  jest.restoreAllMocks();
  (SubscriptionService.hasActiveSubscription as jest.Mock).mockResolvedValue(true);
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
      const saved = await BookingService.getBookingById(bookingId);
      expect(saved).toBeTruthy();
      expect(saved?.customerId).toBe(mockBookingData.customerId);
      expect(saved?.status).toBe('pending');
      expect(saved?.createdAt).toBeInstanceOf(Date);
      expect(saved?.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw when saveBooking fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'saveBooking')
        .mockRejectedValueOnce(new Error('Storage error'));

      await expect(BookingService.createBooking(mockBookingData)).rejects.toThrow('Storage error');
    });

    it('allows booking even when subscription is inactive (gating temporarily disabled)', async () => {
      jest.spyOn(SubscriptionService, 'hasActiveSubscription').mockResolvedValueOnce(false);

      const bookingId = await BookingService.createBooking({
        ...mockBookingData,
        agencyId: 'agency-1',
        agencyName: 'Test Agency',
      });

      expect(bookingId).toBeTruthy();
    });
  });

  describe('updateBookingStatus', () => {
    let bookingId: string;

    beforeEach(async () => {
      bookingId = await BookingService.createBooking(mockBookingData);
    });

    it('should update booking status to accepted', async () => {
      await BookingService.updateBookingStatus(bookingId, 'accepted');

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('accepted');
      expect(booking?.acceptedAt).toBeInstanceOf(Date);
      expect(booking?.updatedAt).toBeInstanceOf(Date);
    });

    it('should update booking status to delivered', async () => {
      await BookingService.updateBookingStatus(bookingId, 'delivered');

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');
      expect(booking?.deliveredAt).toBeInstanceOf(Date);
    });

    it('should update booking status with additional data', async () => {
      await BookingService.updateBookingStatus(bookingId, 'accepted', { driverId: 'driver-1' });

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.driverId).toBe('driver-1');
    });

    it('should throw when updateBooking fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'updateBooking')
        .mockRejectedValueOnce(new Error('Update error'));

      await expect(BookingService.updateBookingStatus(bookingId, 'accepted')).rejects.toThrow('Update error');
    });
  });

  describe('getBookingsByCustomer', () => {
    beforeEach(async () => {
      await BookingService.createBooking(mockBookingData);
    });

    it('should return bookings for specific customer', async () => {
      const bookings = await BookingService.getBookingsByCustomer('customer-1');

      expect(bookings).toHaveLength(1);
      expect(bookings[0].customerId).toBe('customer-1');
    });

    it('should return empty array for customer with no bookings', async () => {
      const bookings = await BookingService.getBookingsByCustomer('customer-999');
      expect(bookings).toEqual([]);
    });

    it('should throw when getBookingsByCustomer fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'getBookingsByCustomer')
        .mockRejectedValueOnce(new Error('Fetch error'));

      await expect(BookingService.getBookingsByCustomer('customer-1')).rejects.toThrow('Fetch error');
    });
  });

  describe('getAvailableBookings', () => {
    beforeEach(async () => {
      await BookingService.createBooking(mockBookingData);
    });

    it('should return only pending bookings without driver', async () => {
      const bookings = await BookingService.getAvailableBookings();

      expect(bookings.length).toBeGreaterThan(0);
      bookings.forEach((booking) => {
        expect(booking.status).toBe('pending');
        expect(booking.driverId).toBeUndefined();
      });
    });

    it('should throw when getAvailableBookings fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'getAvailableBookings')
        .mockRejectedValueOnce(new Error('Fetch error'));

      await expect(BookingService.getAvailableBookings()).rejects.toThrow('Fetch error');
    });
  });

  describe('getBookingsByDriver', () => {
    beforeEach(async () => {
      const id = await BookingService.createBooking(mockBookingData);
      await BookingService.updateBookingStatus(id, 'accepted', { driverId: 'driver-1' });
    });

    it('should return bookings for specific driver', async () => {
      const bookings = await BookingService.getBookingsByDriver('driver-1');

      expect(bookings.length).toBeGreaterThan(0);
      bookings.forEach((booking) => {
        expect(booking.driverId).toBe('driver-1');
      });
    });

    it('should return empty array for driver with no bookings', async () => {
      const bookings = await BookingService.getBookingsByDriver('driver-999');
      expect(bookings).toEqual([]);
    });

    it('should throw when getBookingsByDriver fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'getBookingsByDriver')
        .mockRejectedValueOnce(new Error('Fetch error'));

      await expect(BookingService.getBookingsByDriver('driver-1')).rejects.toThrow('Fetch error');
    });
  });

  describe('getAllBookings', () => {
    beforeEach(async () => {
      await BookingService.createBooking(mockBookingData);
      await BookingService.createBooking({ ...mockBookingData, customerId: 'customer-2' });
    });

    it('should return all bookings', async () => {
      const bookings = await BookingService.getAllBookings();

      expect(bookings.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw when getBookings fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'getBookings')
        .mockRejectedValueOnce(new Error('Fetch error'));

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

    it('should throw when getBookingById fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'getBookingById')
        .mockRejectedValueOnce(new Error('Fetch error'));

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

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('cancelled');
      expect(booking?.cancellationReason).toBe(reason);
      expect(booking?.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw when updateBooking fails', async () => {
      jest
        .spyOn(inMemoryDataAccessForBookingTests.bookings, 'updateBooking')
        .mockRejectedValueOnce(new Error('Update error'));

      await expect(BookingService.cancelBooking(bookingId, 'reason')).rejects.toThrow('Update error');
    });
  });

  describe('getBookingsForEarnings', () => {
    it('should filter by month and status', async () => {
      const id = await BookingService.createBooking(mockBookingData);
      await BookingService.updateBookingStatus(id, 'delivered', { driverId: 'driver-1' });

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const earnings = await BookingService.getBookingsForEarnings('driver-1', {
        startDate: monthStart,
        status: ['delivered'],
      });

      expect(earnings.some((b) => b.id === id)).toBe(true);
    });
  });
});
