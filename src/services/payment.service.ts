import { FunctionsHttpError } from '@supabase/supabase-js';
import { dataAccess } from '../lib/index';
import { supabase } from '../lib/supabaseClient';
import { ERROR_MESSAGES } from '../constants/config';
import { handleError } from '../utils/errorHandler';
import { getErrorMessage } from '../utils/errors';
import type {
  BookingPaymentVerifyResult,
  RazorpayBookingOrder,
  RazorpaySubscriptionOrder,
  RazorpayVerifyPayload,
  SubscriptionPaymentVerifyResult,
} from '../types/razorpay.types';

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

function paymentVerifyFailure(
  error: string,
  code?: string
): { success: false; error: string; code?: string } {
  return code ? { success: false, error, code } : { success: false, error };
}

function throwBookingPaymentError(message: string, code?: string): never {
  const err = new Error(message);
  if (code) {
    (err as Error & { code: string }).code = code;
  }
  throw err;
}

async function parseEdgeFunctionErrorBody(
  error: unknown,
  fallback: string
): Promise<{ message: string; code?: string }> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string; code?: string };
      if (body?.error) {
        return body.code
          ? { message: body.error, code: body.code }
          : { message: body.error };
      }
    } catch {
      // ignore JSON parse failures
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) return { message };
  }
  return { message: fallback };
}

async function parseEdgeFunctionError(error: unknown, fallback: string): Promise<string> {
  const { message } = await parseEdgeFunctionErrorBody(error, fallback);
  return message;
}

function mapBookingOrderError(message: string, code?: string): string {
  if (code === 'agency_not_onboarded') {
    return ERROR_MESSAGES.payment.agencyNotOnboarded;
  }
  return message;
}

async function parseEdgeFunctionBody<T>(data: unknown, error: unknown, fallback: string): Promise<T> {
  if (error) {
    throw new Error(await parseEdgeFunctionError(error, fallback));
  }
  if (!data || typeof data !== 'object') {
    throw new Error(fallback);
  }
  const body = data as { error?: string };
  if (body.error) {
    throw new Error(body.error);
  }
  return data as T;
}

export class PaymentService {
  /**
   * Process Cash on Delivery payment - marks payment as pending in local storage
   */
  static async processCODPayment(bookingId: string, amount: number): Promise<PaymentResult> {
    try {
      const booking = await dataAccess.bookings.getBookingById(bookingId);
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      const paymentId = `cod_${bookingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await dataAccess.bookings.updateBooking(bookingId, {
        paymentStatus: 'pending',
        paymentId,
      });

      return {
        success: true,
        paymentId,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'processCODPayment', bookingId, amount },
        userFacing: false,
      });
      return {
        success: false,
        error: getErrorMessage(error, 'Payment processing failed'),
      };
    }
  }

  /**
   * Mark payment as completed when driver confirms delivery
   */
  static async confirmCODPayment(bookingId: string): Promise<PaymentResult> {
    try {
      const booking = await dataAccess.bookings.getBookingById(bookingId);
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      const paymentId = `cod_confirmed_${bookingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await dataAccess.bookings.updateBooking(bookingId, {
        paymentStatus: 'completed',
        paymentId,
      });

      return {
        success: true,
        paymentId,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'confirmCODPayment', bookingId },
        userFacing: false,
      });
      return {
        success: false,
        error: getErrorMessage(error, 'Payment confirmation failed'),
      };
    }
  }

  static async processOnlinePayment(
    bookingId: string,
    amount: number,
    paymentMethod: 'razorpay' | 'stripe'
  ): Promise<PaymentResult> {
    throw new Error('Online booking payments are not wired yet. Complete Phase 3 implementation.');
  }

  /**
   * Flow A — create Razorpay order for customer subscription (no Route transfer).
   */
  static async createSubscriptionPayment(
    subscriptionId: string,
    planId: string
  ): Promise<RazorpaySubscriptionOrder> {
    const { data, error } = await supabase.functions.invoke('create-customer-subscription-order', {
      body: { subscriptionId, planId },
    });

    const order = await parseEdgeFunctionBody<RazorpaySubscriptionOrder>(
      data,
      error,
      ERROR_MESSAGES.payment.failed
    );

    if (!order.orderId || !order.keyId || !order.amount) {
      throw new Error(ERROR_MESSAGES.payment.failed);
    }

    return order;
  }

  /**
   * Flow A — verify Razorpay payment signature and activate subscription.
   */
  static async verifySubscriptionPayment(
    subscriptionId: string,
    payload: RazorpayVerifyPayload
  ): Promise<SubscriptionPaymentVerifyResult> {
    try {
      const { data, error } = await supabase.functions.invoke(
        'verify-customer-subscription-payment',
        {
          body: {
            subscriptionId,
            razorpay_order_id: payload.razorpay_order_id,
            razorpay_payment_id: payload.razorpay_payment_id,
            razorpay_signature: payload.razorpay_signature,
          },
        }
      );

      if (error) {
        const message = await parseEdgeFunctionError(error, ERROR_MESSAGES.payment.failed);
        let code: string | undefined;
        if (error instanceof FunctionsHttpError) {
          try {
            const body = (await error.context.json()) as { code?: string };
            code = body?.code;
          } catch {
            // ignore
          }
        }
        return { success: false, error: message, code };
      }

      const body = data as {
        success?: boolean;
        alreadyCompleted?: boolean;
        subscriptionId?: string;
        error?: string;
        code?: string;
      };

      if (body?.error) {
        return { success: false, error: body.error, code: body.code };
      }

      return {
        success: true,
        alreadyCompleted: body?.alreadyCompleted,
        subscriptionId: body?.subscriptionId ?? subscriptionId,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'verifySubscriptionPayment', subscriptionId },
        userFacing: false,
      });
      return {
        success: false,
        error: getErrorMessage(error, ERROR_MESSAGES.payment.failed),
      };
    }
  }

  /**
   * Flow B — create Razorpay order for booking delivery (Route transfer to agency).
   */
  static async createBookingPayment(bookingId: string): Promise<RazorpayBookingOrder> {
    const { data, error } = await supabase.functions.invoke('create-customer-booking-order', {
      body: { bookingId },
    });

    if (error) {
      const { message, code } = await parseEdgeFunctionErrorBody(error, ERROR_MESSAGES.payment.failed);
      throwBookingPaymentError(mapBookingOrderError(message, code), code);
    }

    if (!data || typeof data !== 'object') {
      throw new Error(ERROR_MESSAGES.payment.failed);
    }

    const body = data as { error?: string; code?: string };
    if (body.error) {
      throwBookingPaymentError(mapBookingOrderError(body.error, body.code), body.code);
    }

    const order = data as RazorpayBookingOrder;
    if (!order.orderId || !order.keyId || !order.amount) {
      throw new Error(ERROR_MESSAGES.payment.failed);
    }

    return order;
  }

  /**
   * Flow B — verify Razorpay payment signature and complete booking payment.
   */
  static async verifyBookingPayment(
    bookingId: string,
    payload: RazorpayVerifyPayload
  ): Promise<BookingPaymentVerifyResult> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-customer-booking-payment', {
        body: {
          bookingId,
          razorpay_order_id: payload.razorpay_order_id,
          razorpay_payment_id: payload.razorpay_payment_id,
          razorpay_signature: payload.razorpay_signature,
        },
      });

      if (error) {
        const { message, code } = await parseEdgeFunctionErrorBody(
          error,
          ERROR_MESSAGES.payment.failed
        );
        return paymentVerifyFailure(message, code);
      }

      const body = data as {
        success?: boolean;
        alreadyCompleted?: boolean;
        bookingId?: string;
        error?: string;
        code?: string;
      };

      if (body?.error) {
        return paymentVerifyFailure(body.error, body.code);
      }

      return {
        success: true,
        bookingId: body?.bookingId ?? bookingId,
        ...(body?.alreadyCompleted !== undefined
          ? { alreadyCompleted: body.alreadyCompleted }
          : {}),
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'verifyBookingPayment', bookingId },
        userFacing: false,
      });
      return {
        success: false,
        error: getErrorMessage(error, ERROR_MESSAGES.payment.failed),
      };
    }
  }
}
