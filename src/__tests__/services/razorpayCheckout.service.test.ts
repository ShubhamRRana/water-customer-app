/**
 * Razorpay checkout service tests
 */

const mockOpen = jest.fn();

const mockExpoConfig: { extra?: Record<string, unknown> } = { extra: {} };
const mockAppOwnership: { value: string | null } = { value: null };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
    get appOwnership() {
      return mockAppOwnership.value;
    },
  },
}));

jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: {
    open: (...args: unknown[]) => mockOpen(...args),
  },
}));

import { ERROR_MESSAGES } from '../../constants/config';
import { getRazorpayKeyId, openCheckout } from '../../services/razorpayCheckout.service';

describe('razorpayCheckout.service', () => {
  const originalEnv = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
    mockExpoConfig.extra = {};
    mockAppOwnership.value = null;
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID = originalEnv;
    }
  });

  describe('getRazorpayKeyId', () => {
    it('returns key from expo extra', () => {
      mockExpoConfig.extra = { razorpayKeyId: 'rzp_test_from_extra' };

      expect(getRazorpayKeyId()).toBe('rzp_test_from_extra');
    });

    it('returns key from process.env when extra is missing', () => {
      process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_from_env';

      expect(getRazorpayKeyId()).toBe('rzp_test_from_env');
    });

    it('throws when key is not configured', () => {
      expect(() => getRazorpayKeyId()).toThrow(ERROR_MESSAGES.payment.razorpayNotConfigured);
    });
  });

  describe('openCheckout', () => {
    const baseParams = {
      orderId: 'order_test_123',
      amount: 50000,
      currency: 'INR',
      keyId: 'rzp_test_key',
      description: 'Subscription payment',
      prefill: { email: 'user@example.com', contact: '9876543210', name: 'Test User' },
    };

    it('returns success with verify payload on SDK success', async () => {
      mockOpen.mockResolvedValue({
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: 'sig_test_789',
      });

      const result = await openCheckout(baseParams);

      expect(result).toEqual({
        status: 'success',
        data: {
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'sig_test_789',
        },
      });
      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'rzp_test_key',
          order_id: 'order_test_123',
          amount: 50000,
          currency: 'INR',
        })
      );
    });

    it('returns cancelled when SDK reports code 0', async () => {
      mockOpen.mockRejectedValue({ code: 0, description: 'Payment processing cancelled by user' });

      const result = await openCheckout(baseParams);

      expect(result).toEqual({ status: 'cancelled' });
    });

    it('returns cancelled when description contains cancel', async () => {
      mockOpen.mockRejectedValue({ description: 'User cancelled the payment' });

      const result = await openCheckout(baseParams);

      expect(result).toEqual({ status: 'cancelled' });
    });

    it('returns error with message on SDK failure', async () => {
      mockOpen.mockRejectedValue({ code: 2, description: 'Payment failed at bank' });

      const result = await openCheckout(baseParams);

      expect(result).toEqual({
        status: 'error',
        message: 'Payment failed at bank',
        code: 2,
      });
    });

    it('returns network error message for network failures', async () => {
      mockOpen.mockRejectedValue({ description: 'Network request timeout' });

      const result = await openCheckout(baseParams);

      expect(result).toEqual({
        status: 'error',
        message: ERROR_MESSAGES.payment.razorpayNetworkError,
        code: undefined,
      });
    });

    it('returns dev-build error when running in Expo Go', async () => {
      mockAppOwnership.value = 'expo';

      const result = await openCheckout(baseParams);

      expect(result).toEqual({
        status: 'error',
        message: ERROR_MESSAGES.payment.razorpayRequiresDevBuild,
      });
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });
});
