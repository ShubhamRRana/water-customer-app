/**
 * Subscription billing and payment transaction types (align with migrations 024/025).
 */

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'paused';

export type PaymentTransactionStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  durationMonths: number;
  price: number;
  currency: string;
  features: string[];
  maxBookingsPerMonth: number | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date | null;
  endDate: Date | null;
  autoRenew: boolean;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  trialEndDate: Date | null;
  isTrial: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  paymentGateway: string;
  gatewayOrderId: string | null;
  gatewayTransactionId: string | null;
  gatewayResponseCode: string | null;
  gatewayResponseMessage: string | null;
  status: PaymentTransactionStatus;
  paymentMethod: string | null;
  bankName: string | null;
  metadata: Record<string, unknown>;
  initiatedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  status?: SubscriptionStatus;
  autoRenew?: boolean;
  isTrial?: boolean;
  trialEndDate?: Date | null;
}

export interface UpdateSubscriptionData {
  status?: SubscriptionStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  autoRenew?: boolean;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  trialEndDate?: Date | null;
  isTrial?: boolean;
}

export interface CreatePaymentTransactionData {
  userId: string;
  subscriptionId?: string | null;
  amount: number;
  currency?: string;
  gatewayOrderId?: string | null;
  status?: PaymentTransactionStatus;
  paymentGateway?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaymentTransactionData {
  subscriptionId?: string | null;
  amount?: number;
  currency?: string;
  gatewayOrderId?: string | null;
  gatewayTransactionId?: string | null;
  gatewayResponseCode?: string | null;
  gatewayResponseMessage?: string | null;
  status?: PaymentTransactionStatus;
  paymentMethod?: string | null;
  bankName?: string | null;
  metadata?: Record<string, unknown>;
  initiatedAt?: Date;
  completedAt?: Date | null;
}
