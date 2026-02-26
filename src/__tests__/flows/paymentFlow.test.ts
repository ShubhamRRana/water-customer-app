/**
 * Payment Flow Integration Tests
 * Tests the complete COD payment flow from booking to payment confirmation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookingService } from '../../services/booking.service';
import { PaymentService } from '../../services/payment.service';
import { LocalStorageService } from '../../services/localStorage';
import { Booking } from '../../types';

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
});

// Restore all mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
});

describe('Payment Flow Integration', () => {
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

  describe('Complete COD Payment Flow', () => {
    it('should complete full COD payment flow: booking -> payment -> delivery -> confirmation', async () => {
      // Step 1: Create booking with pending payment
      const bookingId = await BookingService.createBooking(mockBookingData);
      let booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending');
      expect(booking?.paymentId).toBeUndefined();

      // Step 2: Process COD payment (marks as pending)
      const paymentResult = await PaymentService.processCODPayment(bookingId, 600);
      expect(paymentResult.success).toBe(true);
      expect(paymentResult.paymentId).toBeTruthy();
      expect(paymentResult.paymentId).toContain('cod_');
      expect(paymentResult.paymentId).toContain(bookingId);

      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending');
      expect(booking?.paymentId).toBe(paymentResult.paymentId);

      // Step 3: Driver accepts and delivers
      await BookingService.updateBookingStatus(bookingId, 'accepted', {
        driverId: 'driver-1',
      });
      await BookingService.updateBookingStatus(bookingId, 'delivered');

      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');

      // Step 4: Confirm COD payment (mark as completed)
      const confirmResult = await PaymentService.confirmCODPayment(bookingId);
      expect(confirmResult.success).toBe(true);
      expect(confirmResult.paymentId).toBeTruthy();
      expect(confirmResult.paymentId).toContain('cod_confirmed_');

      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('completed');
      expect(booking?.paymentId).toBe(confirmResult.paymentId);
    });

    it('should handle payment processing before delivery', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      // Process payment immediately after booking
      const paymentResult = await PaymentService.processCODPayment(bookingId, 600);
      expect(paymentResult.success).toBe(true);

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending');
      expect(booking?.status).toBe('pending'); // Still pending, not delivered yet
    });

    it('should allow payment confirmation only after delivery', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      // Try to confirm payment before delivery (should still work, but status should be delivered)
      await BookingService.updateBookingStatus(bookingId, 'delivered');
      const confirmResult = await PaymentService.confirmCODPayment(bookingId);

      expect(confirmResult.success).toBe(true);
      
      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');
      expect(booking?.paymentStatus).toBe('completed');
    });
  });

  describe('Payment Error Scenarios', () => {
    it('should handle payment processing for non-existent booking', async () => {
      const paymentResult = await PaymentService.processCODPayment('non-existent', 600);
      
      expect(paymentResult.success).toBe(false);
      expect(paymentResult.error).toBe('Booking not found');
    });

    it('should handle payment confirmation for non-existent booking', async () => {
      const confirmResult = await PaymentService.confirmCODPayment('non-existent');
      
      expect(confirmResult.success).toBe(false);
      expect(confirmResult.error).toBe('Booking not found');
    });

    it('should handle storage errors during payment processing', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValueOnce(
        new Error('Storage full')
      );

      const paymentResult = await PaymentService.processCODPayment(bookingId, 600);
      expect(paymentResult.success).toBe(false);
      expect(paymentResult.error).toBe('Storage full');
    });

    it('should handle storage errors during payment confirmation', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      await PaymentService.processCODPayment(bookingId, 600);

      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValueOnce(
        new Error('Storage error')
      );

      const confirmResult = await PaymentService.confirmCODPayment(bookingId);
      expect(confirmResult.success).toBe(false);
      expect(confirmResult.error).toBe('Storage error');
    });
  });

  describe('Payment ID Generation', () => {
    it('should generate unique payment IDs for multiple payments', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      const payment1 = await PaymentService.processCODPayment(bookingId, 600);
      const payment2 = await PaymentService.processCODPayment(bookingId, 600);

      expect(payment1.paymentId).not.toBe(payment2.paymentId);
      expect(payment1.paymentId).toContain('cod_');
      expect(payment2.paymentId).toContain('cod_');
    });

    it('should generate unique confirmation IDs', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      await BookingService.updateBookingStatus(bookingId, 'delivered');

      const confirm1 = await PaymentService.confirmCODPayment(bookingId);
      const confirm2 = await PaymentService.confirmCODPayment(bookingId);

      expect(confirm1.paymentId).not.toBe(confirm2.paymentId);
      expect(confirm1.paymentId).toContain('cod_confirmed_');
      expect(confirm2.paymentId).toContain('cod_confirmed_');
    });

    it('should include booking ID in payment ID', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      const paymentResult = await PaymentService.processCODPayment(bookingId, 600);

      expect(paymentResult.paymentId).toContain(bookingId);
    });
  });

  describe('Payment Status Transitions', () => {
    it('should transition from pending to completed', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      // Initial state
      let booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending');

      // Process payment
      await PaymentService.processCODPayment(bookingId, 600);
      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending'); // Still pending until delivery

      // Deliver and confirm
      await BookingService.updateBookingStatus(bookingId, 'delivered');
      await PaymentService.confirmCODPayment(bookingId);
      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('completed');
    });

    it('should maintain payment ID through status transitions', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      const paymentResult = await PaymentService.processCODPayment(bookingId, 600);
      const initialPaymentId = paymentResult.paymentId;

      let booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentId).toBe(initialPaymentId);

      // Status changes but payment ID remains until confirmation
      await BookingService.updateBookingStatus(bookingId, 'accepted');
      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentId).toBe(initialPaymentId);

      // Confirmation creates new payment ID
      await BookingService.updateBookingStatus(bookingId, 'delivered');
      const confirmResult = await PaymentService.confirmCODPayment(bookingId);
      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentId).toBe(confirmResult.paymentId);
      expect(booking?.paymentId).not.toBe(initialPaymentId);
    });
  });

  describe('Multiple Payment Attempts', () => {
    it('should handle multiple payment processing attempts', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);

      const payment1 = await PaymentService.processCODPayment(bookingId, 600);
      const payment2 = await PaymentService.processCODPayment(bookingId, 600);

      expect(payment1.success).toBe(true);
      expect(payment2.success).toBe(true);

      // Latest payment ID should be stored
      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentId).toBe(payment2.paymentId);
    });

    it('should handle multiple confirmation attempts', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      await BookingService.updateBookingStatus(bookingId, 'delivered');

      const confirm1 = await PaymentService.confirmCODPayment(bookingId);
      const confirm2 = await PaymentService.confirmCODPayment(bookingId);

      expect(confirm1.success).toBe(true);
      expect(confirm2.success).toBe(true);

      // Latest confirmation ID should be stored
      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentId).toBe(confirm2.paymentId);
      expect(booking?.paymentStatus).toBe('completed');
    });
  });
});

