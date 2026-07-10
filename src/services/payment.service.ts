import { FunctionsHttpError } from '@supabase/supabase-js';
import { dataAccess } from '../lib/index';
import { supabase } from '../lib/supabaseClient';
import { ERROR_MESSAGES } from '../constants/config';
import { handleError } from '../utils/errorHandler';
import { getErrorMessage } from '../utils/errors';
import { mapPaymentErrorCode } from '../utils/paymentErrors';
import type {
  PaymentFlow,
  RazorpaySubscriptionOrder,
  RazorpayVerifyPayload,
  SubscriptionPaymentVerifyResult,
} from '../types/razorpay.types';
import type { PaymentTransaction, PaymentTransactionStatus } from '../types/subscription.types';

export interface PaymentHistoryOptions {
  flow?: PaymentFlow;
  status?: PaymentTransactionStatus;
}

export interface PaymentHistoryItem extends PaymentTransaction {
  flow: PaymentFlow | null;
  flowLabel: string;
  bookingId: string | null;
}

function inferPaymentFlow(tx: PaymentTransaction): PaymentFlow | null {
  const metaFlow = tx.metadata?.flow;
  if (metaFlow === 'customer_subscription' || metaFlow === 'customer_booking') {
    return metaFlow;
  }
  if (tx.subscriptionId) {
    return 'customer_subscription';
  }
  const bookingId = tx.metadata?.booking_id;
  if (typeof bookingId === 'string' && bookingId.length > 0) {
    return 'customer_booking';
  }
  return null;
}

function flowLabel(flow: PaymentFlow | null): string {
  switch (flow) {
    case 'customer_subscription':
      return 'Subscription';
    case 'customer_booking':
      return 'Delivery';
    default:
      return 'Payment';
  }
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

export class PaymentService {
  /**
   * Unified payment history for subscription (Flow A) and delivery (Flow B) transactions.
   */
  static async getPaymentHistory(
    customerId: string,
    options?: PaymentHistoryOptions
  ): Promise<PaymentHistoryItem[]> {
    try {
      const rows = await dataAccess.subscriptions.getPaymentTransactionsByUser(customerId);
      const items: PaymentHistoryItem[] = rows.map((tx) => {
        const flow = inferPaymentFlow(tx);
        const bookingIdRaw = tx.metadata?.booking_id;
        const bookingId =
          typeof bookingIdRaw === 'string' && bookingIdRaw.length > 0 ? bookingIdRaw : null;
        return {
          ...tx,
          flow,
          flowLabel: flowLabel(flow),
          bookingId,
        };
      });

      return items.filter((item) => {
        if (options?.flow && item.flow !== options.flow) {
          return false;
        }
        if (options?.status && item.status !== options.status) {
          return false;
        }
        return true;
      });
    } catch (error) {
      handleError(error, {
        context: { operation: 'getPaymentHistory', customerId, options },
        userFacing: false,
      });
      throw error;
    }
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

    if (error) {
      const { message, code } = await parseEdgeFunctionErrorBody(error, ERROR_MESSAGES.payment.failed);
      throw new Error(mapPaymentErrorCode(code, message));
    }

    if (!data || typeof data !== 'object') {
      throw new Error(ERROR_MESSAGES.payment.failed);
    }

    const body = data as { error?: string; code?: string };
    if (body.error) {
      throw new Error(mapPaymentErrorCode(body.code, body.error));
    }

    const order = data as RazorpaySubscriptionOrder;
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
        const { message, code } = await parseEdgeFunctionErrorBody(
          error,
          ERROR_MESSAGES.payment.failed
        );
        return {
          success: false,
          error: mapPaymentErrorCode(code, message),
          code,
        };
      }

      const body = data as {
        success?: boolean;
        alreadyCompleted?: boolean;
        subscriptionId?: string;
        error?: string;
        code?: string;
      };

      if (body?.error) {
        return {
          success: false,
          error: mapPaymentErrorCode(body.code, body.error),
          code: body.code,
        };
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
}
