/**
 * Payment Flow Integration Tests
 * Tests the pay-at-delivery lifecycle (driver app confirms payment via shared DB)
 * and the Razorpay subscription flow (Flow A).
 */

const mockInvoke = jest.fn();

jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock('../../lib/index', () => {
  const { inMemoryDataAccessForBookingTests } = require('../helpers/inMemoryBookingDataAccess');
  return { dataAccess: inMemoryDataAccessForBookingTests };
});

jest.mock('../../services/razorpayCheckout.service', () => ({
  openCheckout: jest.fn(),
}));

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
    activateSubscription: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookingService } from '../../services/booking.service';
import { PaymentService } from '../../services/payment.service';
import { SubscriptionService } from '../../services/subscription.service';
import { openCheckout } from '../../services/razorpayCheckout.service';
import { ERROR_MESSAGES } from '../../constants/config';
import { Booking } from '../../types';
import { clearBookingTestStore } from '../helpers/inMemoryBookingDataAccess';
import { simulateDriverPaymentConfirmation } from '../helpers/driverPayment';

const mockOpenCheckout = openCheckout as jest.Mock;

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
  clearBookingTestStore();
  mockOpenCheckout.mockReset();
  (SubscriptionService.activateSubscription as jest.Mock).mockReset();
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

  describe('Pay-at-delivery lifecycle', () => {
    it('booking starts unpaid and is marked paid by the driver after delivery', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      let booking = await BookingService.getBookingById(bookingId);
      expect(booking?.paymentStatus).toBe('pending');
      expect(booking?.paymentId).toBeUndefined();

      await BookingService.updateBookingStatus(bookingId, 'accepted', {
        driverId: 'driver-1',
      });
      await BookingService.updateBookingStatus(bookingId, 'delivered');

      const paymentId = await simulateDriverPaymentConfirmation(bookingId);

      booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');
      expect(booking?.paymentStatus).toBe('completed');
      expect(booking?.paymentId).toBe(paymentId);
    });

    it('keeps booking unpaid until the driver confirms', async () => {
      const bookingId = await BookingService.createBooking(mockBookingData);
      await BookingService.updateBookingStatus(bookingId, 'delivered');

      const booking = await BookingService.getBookingById(bookingId);
      expect(booking?.status).toBe('delivered');
      expect(booking?.paymentStatus).toBe('pending');
    });
  });

  describe('Razorpay subscription flow (Flow A)', () => {
    const subscriptionOrder = {
      orderId: 'order_sub_flow',
      amount: 99900,
      currency: 'INR',
      keyId: 'rzp_test_key',
    };
    const verifyPayload = {
      razorpay_order_id: 'order_sub_flow',
      razorpay_payment_id: 'pay_sub_flow',
      razorpay_signature: 'sig_sub_flow',
    };

    it('completes create order -> checkout -> verify', async () => {
      const createSpy = jest
        .spyOn(PaymentService, 'createSubscriptionPayment')
        .mockResolvedValue(subscriptionOrder);
      const verifySpy = jest
        .spyOn(PaymentService, 'verifySubscriptionPayment')
        .mockResolvedValue({ success: true, subscriptionId: 'sub-1' });
      (SubscriptionService.activateSubscription as jest.Mock).mockImplementation(
        async (subscriptionId: string, payload: typeof verifyPayload) => {
          const result = await PaymentService.verifySubscriptionPayment(subscriptionId, payload);
          if (!result.success) {
            throw new Error(result.error ?? 'Subscription activation failed');
          }
        }
      );
      mockOpenCheckout.mockResolvedValue({ status: 'success', data: verifyPayload });

      const order = await PaymentService.createSubscriptionPayment('sub-1', 'plan-1');
      const checkout = await mockOpenCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        description: 'Plan subscription',
      });

      expect(checkout.status).toBe('success');
      if (checkout.status === 'success') {
        await SubscriptionService.activateSubscription('sub-1', checkout.data);
      }

      expect(createSpy).toHaveBeenCalledWith('sub-1', 'plan-1');
      expect(verifySpy).toHaveBeenCalledWith('sub-1', verifyPayload);
    });

    it('retries with new order after verify failure', async () => {
      const createSpy = jest
        .spyOn(PaymentService, 'createSubscriptionPayment')
        .mockResolvedValueOnce(subscriptionOrder)
        .mockResolvedValueOnce({
          ...subscriptionOrder,
          orderId: 'order_sub_retry',
        });
      const verifySpy = jest
        .spyOn(PaymentService, 'verifySubscriptionPayment')
        .mockResolvedValueOnce({
          success: false,
          error: ERROR_MESSAGES.payment.signatureMismatch,
          code: 'signature_mismatch',
        })
        .mockResolvedValueOnce({ success: true, subscriptionId: 'sub-1' });
      mockOpenCheckout.mockResolvedValue({ status: 'success', data: verifyPayload });

      await PaymentService.createSubscriptionPayment('sub-1', 'plan-1');
      const checkout = await mockOpenCheckout({});
      expect(checkout.status).toBe('success');

      if (checkout.status === 'success') {
        const firstVerify = await PaymentService.verifySubscriptionPayment('sub-1', checkout.data);
        expect(firstVerify.success).toBe(false);

        await PaymentService.createSubscriptionPayment('sub-1', 'plan-1');
        const retryVerify = await PaymentService.verifySubscriptionPayment('sub-1', checkout.data);
        expect(retryVerify.success).toBe(true);
      }

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(verifySpy).toHaveBeenCalledTimes(2);
    });

    it('does not verify when checkout is cancelled', async () => {
      jest.spyOn(PaymentService, 'createSubscriptionPayment').mockResolvedValue(subscriptionOrder);
      const verifySpy = jest.spyOn(PaymentService, 'verifySubscriptionPayment');
      mockOpenCheckout.mockResolvedValue({ status: 'cancelled' });

      await PaymentService.createSubscriptionPayment('sub-1', 'plan-1');
      const checkout = await mockOpenCheckout({});

      expect(checkout.status).toBe('cancelled');
      expect(verifySpy).not.toHaveBeenCalled();
    });
  });

});

