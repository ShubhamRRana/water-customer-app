import { dataAccess } from '../lib/index';
import type {
  SubscriptionPlan,
  UserSubscription,
  PaymentTransaction,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  CreatePaymentTransactionData,
  UpdatePaymentTransactionData,
} from '../types/subscription.types';
import { handleAsyncOperationWithRethrow } from '../utils/errorHandler';
import { PaytmService } from './paytm.service';

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

  static async createSubscription(data: CreateSubscriptionData): Promise<UserSubscription> {
    return handleAsyncOperationWithRethrow(
      () => dataAccess.subscriptions.createSubscription(data),
      { context: { operation: 'createSubscription' }, userFacing: false }
    );
  }

  /**
   * Confirms payment with Paytm via Edge Function (`verify-payment`), which activates the subscription when successful.
   */
  static async activateSubscription(
    _subscriptionId: string,
    gatewayOrderId: string
  ): Promise<void> {
    await PaytmService.verifyTransaction(gatewayOrderId);
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
