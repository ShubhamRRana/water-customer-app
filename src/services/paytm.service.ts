import { supabase } from '../lib/supabaseClient';
import { getErrorMessage } from '../utils/errors';

/** Parsed fields from `initiate-payment` (includes Paytm body + clientMeta from Edge Function). */
export interface InitiatePaymentParsed {
  txnToken: string | null;
  mid: string | null;
  orderId: string | null;
  amount: string | null;
  initiateOk: boolean;
  raw: unknown;
}

function readBody(data: Record<string, unknown>): Record<string, unknown> {
  const body = data.body;
  if (body && typeof body === 'object') {
    return body as Record<string, unknown>;
  }
  return data;
}

/**
 * Interprets `initiate-payment` JSON: txnToken + clientMeta for WebView checkout.
 */
export function parseInitiatePaymentResponse(data: unknown): InitiatePaymentParsed {
  if (!data || typeof data !== 'object') {
    return {
      txnToken: null,
      mid: null,
      orderId: null,
      amount: null,
      initiateOk: false,
      raw: data,
    };
  }
  const root = data as Record<string, unknown>;
  const body = readBody(root);
  const txnToken = typeof body.txnToken === 'string' ? body.txnToken : null;
  const clientMeta = root.clientMeta as Record<string, unknown> | undefined;
  const mid = typeof clientMeta?.mid === 'string' ? clientMeta.mid : null;
  const orderId = typeof clientMeta?.orderId === 'string' ? clientMeta.orderId : null;
  const amount = typeof clientMeta?.amount === 'string' ? clientMeta.amount : null;

  return {
    txnToken,
    mid,
    orderId,
    amount,
    initiateOk: Boolean(txnToken),
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
 * Paytm checkout via Supabase Edge Functions (merchant key never touches the app).
 */
export class PaytmService {
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
