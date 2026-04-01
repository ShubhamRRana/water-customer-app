import { supabase } from '../lib/supabaseClient';
import { getErrorMessage } from '../utils/errors';

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
