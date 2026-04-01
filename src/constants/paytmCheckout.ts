/**
 * Paytm hosted checkout (must match Edge Function PAYTM_HOST: staging vs production).
 */
export const PAYTM_CHECKOUT_BASE_URL =
  process.env.EXPO_PUBLIC_PAYTM_CHECKOUT_BASE_URL ?? 'https://securegw-stage.paytm.in';

export const PAYTM_PROCESS_TRANSACTION_PATH = '/theia/processTransaction';

export function getPaytmProcessTransactionUrl(): string {
  return `${PAYTM_CHECKOUT_BASE_URL.replace(/\/$/, '')}${PAYTM_PROCESS_TRANSACTION_PATH}`;
}
