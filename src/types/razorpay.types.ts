/**
 * Razorpay checkout types (Flow A subscription + Flow B booking).
 * Amounts are in paise (INR smallest unit) per Razorpay API.
 */

export type PaymentFlow = 'customer_subscription' | 'customer_booking';

export interface RazorpayCheckoutPrefill {
  email?: string;
  contact?: string;
  name?: string;
}

export interface RazorpayCheckoutParams {
  orderId: string;
  /** Amount in paise (from server order). */
  amount: number;
  currency: string;
  keyId: string;
  prefill?: RazorpayCheckoutPrefill;
  description?: string;
  name?: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type RazorpayCheckoutResult =
  | { status: 'success'; data: RazorpayVerifyPayload }
  | { status: 'cancelled' }
  | { status: 'error'; message: string; code?: string | number };

/** Server response from `create-customer-subscription-order`. */
export interface RazorpaySubscriptionOrder {
  orderId: string;
  /** Amount in paise. */
  amount: number;
  currency: string;
  keyId: string;
}

export interface SubscriptionPaymentVerifyResult {
  success: boolean;
  alreadyCompleted?: boolean;
  subscriptionId?: string;
  error?: string;
  code?: string;
}

/** Server response from `create-customer-booking-order`. */
export interface RazorpayBookingOrder {
  orderId: string;
  /** Amount in paise. */
  amount: number;
  currency: string;
  keyId: string;
}

export interface BookingPaymentVerifyResult {
  success: boolean;
  alreadyCompleted?: boolean;
  bookingId?: string;
  error?: string;
  code?: string;
}

export type PaymentResultParams =
  | {
      type: 'booking';
      status: 'success' | 'failure';
      bookingId: string;
      paymentId?: string;
      errorMessage?: string;
    }
  | {
      type: 'subscription';
      status: 'success' | 'failure';
      subscriptionId: string;
      planId: string;
      planName: string;
      paymentId?: string;
      errorMessage?: string;
    };
