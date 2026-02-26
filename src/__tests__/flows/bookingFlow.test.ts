/**
 * Booking Flow Integration Tests
 * Tests the complete booking flow from creation to delivery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookingService } from '../../services/booking.service';
import { PaymentService } from '../../services/payment.service';
import { LocalStorageService } from '../../services/localStorage';
import { Booking, BookingStatus } from '../../types';

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
});

// Restore all mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
});

describe('Booking Flow Integration', () => {
  const mockCustomer = {
    id: 'customer-1',
    email: 'customer@test.com',
    password: 'hashed-password',
    name: 'Test Customer',
    phone: '1234567890',
    role: 'customer' as const,
    createdAt: new Date(),
  };

  const mockDriver = {
    id: 'driver-1',
    email: 'driver@test.com',
    password: 'hashed-password',
    name: 'Test Driver',
    phone: '9876543210',
    role: 'driver' as const,
    licenseNumber: 'DL123456',
    vehicleNumber: 'ABC123',
    createdAt: new Date(),
  };

  const mockBookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
    customerId: mockCustomer.id,
    customerName: mockCustomer.name,
    customerPhone: mockCustomer.phone,
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

  describe('Complete Booking Flow', () => {
    it('should complete full booking flow: create -> accept -> deliver', async () => {
      // Step 1: Customer creates booking
      const bookingId = await BookingService.createBooking(mockBookingData);
      expect(bookingId).toBeTruthy();

      let booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('pending');
      expect(booking?.paymentStatus).toBe('pending');

      // Step 2: Driver accepts booking
      await BookingService.updateBookingStatus(bookingId, 'accepted', {
        driverId: mockDriver.id,
        driverName: mockDriver.name,
        driverPhone: mockDriver.phone,
      });

      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('accepted');
      expect(booking?.driverId).toBe(mockDriver.id);
      expect(booking?.acceptedAt).toBeInstanceOf(Date);
      expect(booking?.canCancel).toBe(true); // Can still cancel after acceptance

      // Step 3: Driver starts delivery (in_transit)
      await BookingService.updateBookingStatus(bookingId, 'in_transit');
      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('in_transit');

      // Step 4: Driver delivers and confirms payment
      await BookingService.updateBookingStatus(bookingId, 'delivered');
      const paymentResult = await PaymentService.confirmCODPayment(bookingId);

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.paymentId).toBeTruthy();

      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');
      expect(booking?.paymentStatus).toBe('completed');
      expect(booking?.deliveredAt).toBeInstanceOf(Date);
      expect(booking?.paymentId).toBe(paymentResult.paymentId);
    });

    it('should handle booking cancellation flow', async () => {
      // Create booking
      const bookingId = await BookingService.createBooking(mockBookingData);
      
      // Customer cancels booking
      const cancellationReason = 'Changed my mind';
      await BookingService.cancelBooking(bookingId, cancellationReason);

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('cancelled');
      expect(booking?.cancellationReason).toBe(cancellationReason);
    });

    it('should handle payment processing during booking flow', async () => {
      // Create booking
      const bookingId = await BookingService.createBooking(mockBookingData);
      
      // Process COD payment
      const paymentResult = await PaymentService.processCODPayment(bookingId, 600);
      expect(paymentResult.success).toBe(true);
      expect(paymentResult.paymentId).toBeTruthy();

      let booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending');
      expect(booking?.paymentId).toBe(paymentResult.paymentId);

      // Driver accepts and delivers
      await BookingService.updateBookingStatus(bookingId, 'accepted', {
        driverId: mockDriver.id,
      });
      await BookingService.updateBookingStatus(bookingId, 'delivered');

      // Confirm payment
      const confirmResult = await PaymentService.confirmCODPayment(bookingId);
      expect(confirmResult.success).toBe(true);

      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('completed');
    });
  });

  describe('Booking Status Transitions', () => {
    it('should allow valid status transitions', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      // pending -> accepted
      await BookingService.updateBookingStatus(bookingId, 'accepted');
      let booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('accepted');

      // accepted -> in_transit
      await BookingService.updateBookingStatus(bookingId, 'in_transit');
      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('in_transit');

      // in_transit -> delivered
      await BookingService.updateBookingStatus(bookingId, 'delivered');
      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');
    });

    it('should set acceptedAt timestamp when status changes to accepted', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      
      const beforeAccept = new Date();
      await BookingService.updateBookingStatus(bookingId, 'accepted');
      const afterAccept = new Date();

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.acceptedAt).toBeInstanceOf(Date);
      expect(booking?.acceptedAt!.getTime()).toBeGreaterThanOrEqual(beforeAccept.getTime());
      expect(booking?.acceptedAt!.getTime()).toBeLessThanOrEqual(afterAccept.getTime());
    });

    it('should set deliveredAt timestamp when status changes to delivered', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      
      await BookingService.updateBookingStatus(bookingId, 'accepted');
      
      const beforeDeliver = new Date();
      await BookingService.updateBookingStatus(bookingId, 'delivered');
      const afterDeliver = new Date();

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.deliveredAt).toBeInstanceOf(Date);
      expect(booking?.deliveredAt!.getTime()).toBeGreaterThanOrEqual(beforeDeliver.getTime());
      expect(booking?.deliveredAt!.getTime()).toBeLessThanOrEqual(afterDeliver.getTime());
    });
  });

  describe('Multi-Booking Scenarios', () => {
    it('should handle multiple bookings for same customer', async () => {
      const booking1Id = await BookingService.createBooking(mockBookingData);
      const booking2Id = await BookingService.createBooking({
        ...mockBookingData,
        tankerSize: 2000,
        totalPrice: 1200,
      });

      const customerBookings = await BookingService.getBookingsByCustomer(mockCustomer.id);
      expect(customerBookings.length).toBe(2);
      expect(customerBookings.some(b => b.id === booking1Id)).toBe(true);
      expect(customerBookings.some(b => b.id === booking2Id)).toBe(true);
    });

    it('should handle multiple bookings for same driver', async () => {
      const booking1Id = await BookingService.createBooking(mockBookingData);
      const booking2Id = await BookingService.createBooking({
        ...mockBookingData,
        customerId: 'customer-2',
        customerName: 'Another Customer',
      });

      // Driver accepts both
      await BookingService.updateBookingStatus(booking1Id, 'accepted', {
        driverId: mockDriver.id,
      });
      await BookingService.updateBookingStatus(booking2Id, 'accepted', {
        driverId: mockDriver.id,
      });

      const driverBookings = await BookingService.getBookingsByDriver(mockDriver.id);
      expect(driverBookings.length).toBe(2);
      driverBookings.forEach(booking => {
        expect(booking.driverId).toBe(mockDriver.id);
        expect(booking.status).toBe('accepted');
      });
    });
  });

  describe('Error Handling in Flow', () => {
    it('should handle payment processing failure gracefully', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      // Simulate storage failure
      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValueOnce(
        new Error('Storage error')
      );

      const paymentResult = await PaymentService.processCODPayment(bookingId, 600);
      expect(paymentResult.success).toBe(false);
      expect(paymentResult.error).toBeTruthy();
    });

    it('should handle booking status update failure', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValueOnce(
        new Error('Update failed')
      );

      await expect(
        BookingService.updateBookingStatus(bookingId, 'accepted')
      ).rejects.toThrow('Update failed');
    });
  });
});

