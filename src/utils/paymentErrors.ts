import { ERROR_MESSAGES } from '../constants/config';

export interface PaymentErrorOptions {
  trialEndDate?: Date | string | null;
}

function formatTrialActiveMessage(trialEndDate?: Date | string | null): string {
  if (!trialEndDate) {
    return ERROR_MESSAGES.payment.trialActive;
  }
  const date =
    trialEndDate instanceof Date ? trialEndDate : new Date(trialEndDate);
  if (Number.isNaN(date.getTime())) {
    return ERROR_MESSAGES.payment.trialActive;
  }
  return `Your free trial is active until ${date.toLocaleDateString()}. Paid subscription checkout is not available until the trial ends.`;
}

/**
 * Maps Supabase Edge Function payment error codes to user-facing messages.
 */
export function mapPaymentErrorCode(
  code?: string,
  fallback?: string,
  options?: PaymentErrorOptions
): string {
  switch (code) {
    case 'agency_not_onboarded':
      return ERROR_MESSAGES.payment.agencyNotOnboarded;
    case 'signature_mismatch':
      return ERROR_MESSAGES.payment.signatureMismatch;
    case 'trial_active':
      return formatTrialActiveMessage(options?.trialEndDate);
    case 'already_paid':
      return ERROR_MESSAGES.payment.bookingAlreadyPaid;
    case 'subscription_not_eligible':
      return ERROR_MESSAGES.payment.subscriptionNotEligible;
    default:
      return fallback ?? ERROR_MESSAGES.payment.failed;
  }
}
