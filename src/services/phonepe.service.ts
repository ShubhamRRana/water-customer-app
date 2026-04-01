import { supabase } from '../lib/supabaseClient';
import { getErrorMessage } from '../utils/errors';

/** Parsed fields from `initiate-payment` (PhonePe redirect URL + clientMeta from Edge Function). */
export interface InitiatePaymentParsed {
  redirectUrl: string | null;
  orderId: string | null;
  amount: string | null;
  initiateOk: boolean;
  raw: unknown;
}

/**
 * Interprets `initiate-payment` JSON: redirectUrl + clientMeta for WebView checkout.
 */
export function parseInitiatePaymentResponse(data: unknown): InitiatePaymentParsed {
  if (!data || typeof data !== 'object') {
    return {
      redirectUrl: null,
      orderId: null,
      amount: null,
      initiateOk: false,
      raw: data,
    };
  }
  const root = data as Record<string, unknown>;
  const redirectUrl = typeof root.redirectUrl === 'string' ? root.redirectUrl : null;
  const clientMeta = root.clientMeta as Record<string, unknown> | undefined;
  const orderId = typeof clientMeta?.orderId === 'string' ? clientMeta.orderId : null;
  const amount = typeof clientMeta?.amount === 'string' ? clientMeta.amount : null;

  return {
    redirectUrl,
    orderId,
    amount,
    initiateOk: Boolean(redirectUrl),
    raw: data,
  };
}

/** Response shape from `verify-payment` Edge Function */
export interface VerifyPaymentResponse {
  orderId: string;
  orderStatus?: unknown;
  applied?: boolean;
  reason?: string;
}

/**
 * PhonePe checkout via Supabase Edge Functions (client credentials never touch the app).
 */
export class PhonePeService {
  static async initiateTransaction(orderId: string): Promise<unknown> {
    const { data, error } = await supabase.functions.invoke('initiate-payment', {
      body: { orderId },
    });
    if (error) {
      throw new Error(getErrorMessage(error, 'Could not start payment'));
    }
    return data;
  }

  static async verifyTransaction(orderId: string): Promise<VerifyPaymentResponse> {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { orderId },
    });
    if (error) {
      throw new Error(getErrorMessage(error, 'Could not verify payment'));
    }
    return data as VerifyPaymentResponse;
  }
}
