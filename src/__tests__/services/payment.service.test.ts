/**
 * Payment Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentService } from '../../services/payment.service';
import { LocalStorageService } from '../../services/localStorage';
import { BookingService } from '../../services/booking.service';
import { Booking } from '../../types';

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
});

// Restore all mocks after each test to prevent mock leakage
afterEach(() => {
  jest.restoreAllMocks();
});

describe('PaymentService', () => {
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

  describe('processCODPayment', () => {
    let bookingId: string;

    beforeEach(async () => {
      bookingId = await BookingService.createBooking(mockBookingData);
    });

    it('should process COD payment and mark as pending', async () => {
      const result = await PaymentService.processCODPayment(bookingId, 600);
      
      expect(result.success).toBe(true);
      expect(result.paymentId).toBeTruthy();
      expect(result.paymentId).toContain('cod_');
      expect(result.paymentId).toContain(bookingId);
      
      const booking = await LocalStorageService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending');
      expect(booking?.paymentId).toBe(result.paymentId);
    });

    it('should generate unique payment IDs', async () => {
      const result1 = await PaymentService.processCODPayment(bookingId, 600);
      const result2 = await PaymentService.processCODPayment(bookingId, 600);
      
      expect(result1.paymentId).not.toBe(result2.paymentId);
    });

    it('should return error when booking does not exist', async () => {
      const result = await PaymentService.processCODPayment('non-existent', 600);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValue(new Error('Update error'));
      
      const result = await PaymentService.processCODPayment(bookingId, 600);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update error');
    });

    it('should handle non-Error exceptions', async () => {
      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValue('String error');
      
      const result = await PaymentService.processCODPayment(bookingId, 600);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment processing failed');
    });
  });

  describe('confirmCODPayment', () => {
    let bookingId: string;

    beforeEach(async () => {
      bookingId = await BookingService.createBooking(mockBookingData);
      await PaymentService.processCODPayment(bookingId, 600);
    });

    it('should confirm COD payment and mark as completed', async () => {
      const result = await PaymentService.confirmCODPayment(bookingId);
      
      expect(result.success).toBe(true);
      expect(result.paymentId).toBeTruthy();
      expect(result.paymentId).toContain('cod_confirmed_');
      expect(result.paymentId).toContain(bookingId);
      
      const booking = await LocalStorageService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('completed');
      expect(booking?.paymentId).toBe(result.paymentId);
    });

    it('should generate unique payment IDs for confirmations', async () => {
      const result1 = await PaymentService.confirmCODPayment(bookingId);
      const result2 = await PaymentService.confirmCODPayment(bookingId);
      
      expect(result1.paymentId).not.toBe(result2.paymentId);
    });

    it('should return error when booking does not exist', async () => {
      const result = await PaymentService.confirmCODPayment('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValue(new Error('Update error'));
      
      const result = await PaymentService.confirmCODPayment(bookingId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update error');
    });

    it('should handle non-Error exceptions', async () => {
      jest.spyOn(LocalStorageService, 'updateBooking').mockRejectedValue('String error');
      
      const result = await PaymentService.confirmCODPayment(bookingId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment confirmation failed');
    });
  });

  describe('processOnlinePayment', () => {
    it('should throw error indicating online payments are not implemented', async () => {
      await expect(
        PaymentService.processOnlinePayment('booking-1', 600, 'razorpay')
      ).rejects.toThrow('Online payments not implemented in MVP. Use COD instead.');
    });

    it('should throw error for stripe payment method', async () => {
      await expect(
        PaymentService.processOnlinePayment('booking-1', 600, 'stripe')
      ).rejects.toThrow('Online payments not implemented in MVP. Use COD instead.');
    });
  });
});

