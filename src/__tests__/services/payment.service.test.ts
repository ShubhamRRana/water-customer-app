/**
 * Payment Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentService } from '../../services/payment.service';
import { ERROR_MESSAGES } from '../../constants/config';
import { dataAccess } from '../../lib/index';
import type { PaymentTransaction } from '../../types/subscription.types';
import { clearBookingTestStore } from '../helpers/inMemoryBookingDataAccess';

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
  return {
    dataAccess: {
      ...inMemoryDataAccessForBookingTests,
      subscriptions: {
        getPaymentTransactionsByUser: jest.fn(),
      },
    },
  };
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

const mockGetPaymentTransactionsByUser =
  dataAccess.subscriptions.getPaymentTransactionsByUser as jest.Mock;

const baseTransaction = (
  overrides: Partial<PaymentTransaction> = {}
): PaymentTransaction => ({
  id: 'tx-1',
  userId: 'customer-1',
  subscriptionId: null,
  amount: 999,
  currency: 'INR',
  status: 'success',
  paymentGateway: 'razorpay',
  gatewayOrderId: 'order_1',
  gatewayTransactionId: 'pay_1',
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
  clearBookingTestStore();
  mockInvoke.mockReset();
  mockGetPaymentTransactionsByUser.mockReset();
});

// Restore all mocks after each test to prevent mock leakage
afterEach(() => {
  jest.restoreAllMocks();
});

describe('PaymentService', () => {
  describe('getPaymentHistory', () => {
    it('infers flow from metadata.flow and filters by flow and status', async () => {
      mockGetPaymentTransactionsByUser.mockResolvedValue([
        baseTransaction({
          id: 'tx-sub',
          subscriptionId: 'sub-1',
          metadata: { flow: 'customer_subscription' },
          status: 'success',
        }),
        baseTransaction({
          id: 'tx-book',
          subscriptionId: null,
          metadata: { flow: 'customer_booking', booking_id: 'book-1' },
          status: 'pending',
        }),
        baseTransaction({
          id: 'tx-inferred-sub',
          subscriptionId: 'sub-2',
          metadata: {},
          status: 'success',
        }),
      ]);

      const all = await PaymentService.getPaymentHistory('customer-1');
      expect(all).toHaveLength(3);
      expect(all[0].flow).toBe('customer_subscription');
      expect(all[0].flowLabel).toBe('Subscription');
      expect(all[1].flow).toBe('customer_booking');
      expect(all[1].flowLabel).toBe('Delivery');
      expect(all[1].bookingId).toBe('book-1');
      expect(all[2].flow).toBe('customer_subscription');

      const deliveryOnly = await PaymentService.getPaymentHistory('customer-1', {
        flow: 'customer_booking',
      });
      expect(deliveryOnly).toHaveLength(1);
      expect(deliveryOnly[0].id).toBe('tx-book');

      const pendingOnly = await PaymentService.getPaymentHistory('customer-1', {
        status: 'pending',
      });
      expect(pendingOnly).toHaveLength(1);
      expect(pendingOnly[0].id).toBe('tx-book');
    });

    it('rethrows when data access fails', async () => {
      mockGetPaymentTransactionsByUser.mockRejectedValue(new Error('DB error'));
      await expect(PaymentService.getPaymentHistory('customer-1')).rejects.toThrow('DB error');
    });
  });

  describe('createSubscriptionPayment', () => {
    const validOrder = {
      orderId: 'order_sub_1',
      amount: 99900,
      currency: 'INR',
      keyId: 'rzp_test_key',
    };

    it('returns order from Edge Function on success', async () => {
      mockInvoke.mockResolvedValue({ data: validOrder, error: null });

      const order = await PaymentService.createSubscriptionPayment('sub-1', 'plan-1');

      expect(mockInvoke).toHaveBeenCalledWith('create-customer-subscription-order', {
        body: { subscriptionId: 'sub-1', planId: 'plan-1' },
      });
      expect(order).toEqual(validOrder);
    });

    it('throws when order fields are missing', async () => {
      mockInvoke.mockResolvedValue({
        data: { orderId: 'order_sub_1', amount: 99900 },
        error: null,
      });

      await expect(
        PaymentService.createSubscriptionPayment('sub-1', 'plan-1')
      ).rejects.toThrow(ERROR_MESSAGES.payment.failed);
    });

    it('maps trial_active error code to user message', async () => {
      mockInvoke.mockResolvedValue({
        data: { error: 'Active free trial in progress', code: 'trial_active' },
        error: null,
      });

      await expect(
        PaymentService.createSubscriptionPayment('sub-1', 'plan-1')
      ).rejects.toThrow(ERROR_MESSAGES.payment.trialActive);
    });
  });

  describe('verifySubscriptionPayment', () => {
    const verifyPayload = {
      razorpay_order_id: 'order_sub_1',
      razorpay_payment_id: 'pay_sub_1',
      razorpay_signature: 'sig_sub_1',
    };

    it('returns success on verified payment', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, subscriptionId: 'sub-1' },
        error: null,
      });

      const result = await PaymentService.verifySubscriptionPayment('sub-1', verifyPayload);

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('sub-1');
    });

    it('maps signature_mismatch to user message', async () => {
      mockInvoke.mockResolvedValue({
        data: { error: 'Invalid signature', code: 'signature_mismatch' },
        error: null,
      });

      const result = await PaymentService.verifySubscriptionPayment('sub-1', verifyPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.payment.signatureMismatch);
      expect(result.code).toBe('signature_mismatch');
    });

    it('returns alreadyCompleted when idempotent', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, alreadyCompleted: true, subscriptionId: 'sub-1' },
        error: null,
      });

      const result = await PaymentService.verifySubscriptionPayment('sub-1', verifyPayload);

      expect(result.success).toBe(true);
      expect(result.alreadyCompleted).toBe(true);
    });

    it('returns failure on unexpected throw', async () => {
      mockInvoke.mockRejectedValue(new Error('Network timeout'));

      const result = await PaymentService.verifySubscriptionPayment('sub-1', verifyPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });
});

