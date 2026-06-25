import { dataAccess } from '../lib/index';
import { supabase } from '../lib/supabaseClient';
import { FEATURE_FLAGS } from '../constants/config';
import { PaymentService } from './payment.service';
import { errorLogger } from '../utils/errorLogger';
import type { RazorpayVerifyPayload } from '../types/razorpay.types';
import type {
  SubscriptionPlan,
  UserSubscription,
  PaymentTransaction,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  CreatePaymentTransactionData,
  UpdatePaymentTransactionData,
} from '../types/subscription.types';
import type { CustomerAccountKind } from '../types/index';
import { handleAsyncOperationWithRethrow } from '../utils/errorHandler';

/** Standard society billing periods shown on the subscription screen. */
export const SOCIETY_VISIBLE_DURATIONS = [1, 12] as const;

export interface ProvisionFreeTrialResult {
  success: boolean;
  subscriptionId?: string;
  trialEndDate?: string;
  alreadyProvisioned?: boolean;
  reason?: string;
}

export function computeYearlySavingsFromMonthly(
  monthlyPrice: number,
  yearlyPrice: number
): { fullYearPrice: number; savingsAmount: number; discountPercent: number } | null {
  const fullYearPrice = monthlyPrice * 12;
  if (fullYearPrice <= yearlyPrice) return null;
  const savingsAmount = fullYearPrice - yearlyPrice;
  const discountPercent = Math.round((1 - yearlyPrice / fullYearPrice) * 100);
  if (discountPercent <= 0) return null;
  return { fullYearPrice, savingsAmount, discountPercent };
}

/**
 * Subscription lifecycle and plan queries for the customer app.
 */
export class SubscriptionService {
  static async getActivePlans(): Promise<SubscriptionPlan[]> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.getSubscriptionPlans(),
      { context: { operation: 'getActivePlans' }, userFacing: false }
    );
  }

  static filterPlansForAccountKind(
    plans: SubscriptionPlan[],
    accountKind: CustomerAccountKind | null | undefined
  ): SubscriptionPlan[] {
    const customerPlans = plans.filter((plan) => plan.accountKind !== 'agency');

    if (!accountKind) {
      return customerPlans;
    }

    const matchingKind = customerPlans.filter(
      (plan) => !plan.accountKind || plan.accountKind === accountKind
    );

    if (accountKind === 'society') {
      const societyOnly = matchingKind.filter((plan) => plan.accountKind === 'society');
      const societyPlans =
        societyOnly.length > 0
          ? societyOnly
          : matchingKind.filter((plan) => !plan.accountKind);

      return societyPlans.filter((plan) =>
        (SOCIETY_VISIBLE_DURATIONS as readonly number[]).includes(plan.durationMonths)
      );
    }

    return matchingKind;
  }

  static async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.getSubscriptionPlanById(planId),
      { context: { operation: 'getPlanById', planId }, userFacing: false }
    );
  }

  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.getUserSubscription(userId),
      { context: { operation: 'getUserSubscription', userId }, userFacing: false }
    );
  }

  static async hasActiveSubscription(userId: string): Promise<boolean> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.hasActiveSubscription(userId),
      { context: { operation: 'hasActiveSubscription', userId }, userFacing: false }
    );
  }

  /**
   * Provision 1-month free trial via Edge Function (idempotent for returning users).
   */
  static async provisionFreeTrial(): Promise<ProvisionFreeTrialResult> {
    const { data, error } = await supabase.functions.invoke('provision-free-trial-subscription', {
      body: {},
    });

    if (error) {
      errorLogger.medium('provision-free-trial-subscription failed', error);
      return { success: false, reason: error.message };
    }

    const body = data as {
      success?: boolean;
      subscriptionId?: string;
      trialEndDate?: string;
      alreadyProvisioned?: boolean;
      reason?: string;
    };

    if (!body?.success) {
      return { success: false, reason: body?.reason ?? 'ineligible' };
    }

    return {
      success: true,
      subscriptionId: body.subscriptionId,
      trialEndDate: body.trialEndDate,
      alreadyProvisioned: body.alreadyProvisioned,
    };
  }

  static async createSubscription(data: CreateSubscriptionData): Promise<UserSubscription> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.createSubscription(data),
      { context: { operation: 'createSubscription' }, userFacing: false }
    );
  }

  /**
   * Ensures a pending or expired subscription row exists for checkout (Flow A).
   */
  static async prepareSubscriptionCheckout(
    userId: string,
    planId: string
  ): Promise<UserSubscription> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const existing = await dataAccess.subscriptions.getUserSubscription(userId);
        const now = Date.now();

        if (
          existing?.status === 'active' &&
          !existing.isTrial &&
          existing.endDate &&
          existing.endDate.getTime() > now
        ) {
          throw new Error('You already have an active subscription.');
        }

        if (existing?.status === 'pending') {
          if (existing.planId !== planId) {
            await dataAccess.subscriptions.updateSubscription(existing.id, { planId });
            return { ...existing, planId };
          }
          return existing;
        }

        if (existing?.status === 'expired') {
          if (existing.planId !== planId) {
            await dataAccess.subscriptions.updateSubscription(existing.id, {
              planId,
              status: 'pending',
            });
            return { ...existing, planId, status: 'pending' };
          }
          return existing;
        }

        return dataAccess.subscriptions.createSubscription({
          userId,
          planId,
          status: 'pending',
        });
      },
      { context: { operation: 'prepareSubscriptionCheckout', userId, planId }, userFacing: false }
    );
  }

  /**
   * Activates subscription after Razorpay SDK success (`verify-customer-subscription-payment`).
   */
  static async activateSubscription(
    subscriptionId: string,
    verifyPayload: RazorpayVerifyPayload
  ): Promise<void> {
    if (!FEATURE_FLAGS.enableRazorpaySubscription) {
      throw new Error(
        'Razorpay subscription checkout is disabled. Set enableRazorpaySubscription to enable.'
      );
    }

    const result = await PaymentService.verifySubscriptionPayment(subscriptionId, verifyPayload);
    if (!result.success) {
      throw new Error(result.error ?? 'Subscription activation failed');
    }
  }

  static async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        await dataAccess.subscriptions.updateSubscription(subscriptionId, {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason,
        });
      },
      { context: { operation: 'cancelSubscription', subscriptionId }, userFacing: false }
    );
  }

  /**
   * Product renewal is implemented as a new checkout (same plan or upgrade). Hook this after UX in Phase 4+.
   */
  static async renewSubscription(_subscriptionId: string): Promise<UserSubscription> {
    throw new Error(
      'Renewal is handled through plan selection and checkout; create a new subscription and complete payment.'
    );
  }

  static async createPaymentTransaction(
    data: CreatePaymentTransactionData
  ): Promise<PaymentTransaction> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.createPaymentTransaction(data),
      { context: { operation: 'createPaymentTransaction' }, userFacing: false }
    );
  }

  static async updatePaymentTransaction(
    id: string,
    data: UpdatePaymentTransactionData
  ): Promise<void> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.updatePaymentTransaction(id, data),
      { context: { operation: 'updatePaymentTransaction', id }, userFacing: false }
    );
  }

  static async getPaymentTransactionsByUser(userId: string): Promise<PaymentTransaction[]> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.getPaymentTransactionsByUser(userId),
      { context: { operation: 'getPaymentTransactionsByUser', userId }, userFacing: false }
    );
  }

  static async getLatestSubscriptionPayment(
    userId: string,
    subscriptionId?: string
  ): Promise<PaymentTransaction | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const rows = await dataAccess.subscriptions.getPaymentTransactionsByUser(userId);
        const subscriptionRows = rows.filter((row) => {
          const flow = row.metadata?.flow;
          const isSubscriptionFlow =
            flow === 'customer_subscription' || row.subscriptionId != null;
          if (!isSubscriptionFlow) return false;
          if (subscriptionId && row.subscriptionId !== subscriptionId) return false;
          return true;
        });
        return subscriptionRows[0] ?? null;
      },
      { context: { operation: 'getLatestSubscriptionPayment', userId }, userFacing: false }
    );
  }

  static async getPaymentTransactionByOrderId(
    orderId: string
  ): Promise<PaymentTransaction | null> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.getPaymentTransactionByOrderId(orderId),
      { context: { operation: 'getPaymentTransactionByOrderId', orderId }, userFacing: false }
    );
  }

  static async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<void> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.updateSubscription(id, data),
      { context: { operation: 'updateSubscription', id }, userFacing: false }
    );
  }

  /** Server-side / scheduled jobs only; no-op in the mobile app. */
  static async checkExpiredSubscriptions(): Promise<void> {
    return Promise.resolve();
  }

  /** Server-side / scheduled jobs only; no-op in the mobile app. */
  static async sendRenewalReminders(): Promise<void> {
    return Promise.resolve();
  }
}
