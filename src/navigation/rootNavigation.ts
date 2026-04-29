import type { NavigatorScreenParams } from '@react-navigation/native';

/** Period context for society trip payment settlement (month view uses month 0–11; year view ignores month). */
export type SocietyPaymentCompletePeriod = {
  periodType: 'month' | 'year';
  year: number;
  month: number;
};

export function societyPaymentPeriodKey(p: SocietyPaymentCompletePeriod): string {
  if (p.periodType === 'year') return `y:${p.year}`;
  return `m:${p.year}-${p.month}`;
}

export type AppStackParamList = {
  Home: undefined;
  SubscriptionComingSoon: undefined;
  Orders: undefined;
  Profile: undefined;
  Booking: undefined;
  AddTrip: undefined;
  TripDetails: undefined;
  SettlePaymentPlaceholder: SocietyPaymentCompletePeriod;
  OrderTracking: { orderId: string };
  SavedAddresses: undefined;
  PastOrders: undefined;
  SubscriptionPlans: undefined;
  SubscriptionStatus: undefined;
  Payment: {
    orderId: string;
    planName: string;
    amount: number;
    subscriptionId: string;
  };
  PaymentHistory: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<AppStackParamList> | undefined;
};
