import { ERROR_MESSAGES } from '../constants/config';

/**
 * Maps Supabase Edge Function payment error codes to user-facing messages.
 */
export function mapPaymentErrorCode(code?: string, fallback?: string): string {
  switch (code) {
    case 'agency_not_onboarded':
      return ERROR_MESSAGES.payment.agencyNotOnboarded;
    case 'signature_mismatch':
      return ERROR_MESSAGES.payment.signatureMismatch;
    case 'trial_active':
      return ERROR_MESSAGES.payment.trialActive;
    case 'already_paid':
      return ERROR_MESSAGES.payment.bookingAlreadyPaid;
    case 'subscription_not_eligible':
      return ERROR_MESSAGES.payment.subscriptionNotEligible;
    default:
      return fallback ?? ERROR_MESSAGES.payment.failed;
  }
}
