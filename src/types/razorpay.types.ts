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
