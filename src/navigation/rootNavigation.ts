import type { NavigationContainerRef, NavigatorScreenParams } from '@react-navigation/native';
import type { PaymentResultParams } from '../types/razorpay.types';

/** Period context for society trip payment settlement (month view uses month 0–11; year view ignores month). */
export type SocietyPaymentCompletePeriod = {
  periodType: 'month' | 'year';
  year: number;
  month: number;
  /** When settling a single agency collectively, its name is provided. */
  agencyName?: string;
};

export function societyPaymentPeriodKey(p: SocietyPaymentCompletePeriod): string {
  if (p.periodType === 'year') return `y:${p.year}`;
  return `m:${p.year}-${p.month}`;
}

/** Composite key for per-agency (collective) settlement, e.g. `m:2026-2|abc agency`. */
export function societyAgencyPaymentPeriodKey(p: SocietyPaymentCompletePeriod): string {
  const base = societyPaymentPeriodKey(p);
  const agency = (p.agencyName ?? '').trim().toLowerCase();
  return `${base}|${agency}`;
}

export type AppStackParamList = {
  Home: undefined;
  SubscriptionComingSoon: undefined;
  Orders: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Booking: undefined;
  AddTrip: undefined;
  TripDetails: undefined;
  AgencyTripBreakdown: SocietyPaymentCompletePeriod & { agencyName: string };
  OrderTracking: { orderId: string };
  SavedAddresses: undefined;
  PastOrders: undefined;
  SubscriptionPlans: { required?: boolean } | undefined;
  SubscriptionStatus: undefined;
  PaySubscription: {
    subscriptionId: string;
    planId: string;
    planName: string;
  };
  PaymentResult: PaymentResultParams;
  PaymentHistory: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<AppStackParamList> | undefined;
};

/**
 * Resets the root navigator to `targetRoute` unless it is already the active
 * root-level route. Must compare against the root stack route (Auth/Main), not
 * `getCurrentRoute()` — that returns the deepest focused route (e.g.
 * "SavedAddresses"), which never equals a root route name and would reset the
 * stack on every auth-user update, kicking the user back to Home.
 */
export function syncRootRoute(
  nav: Pick<NavigationContainerRef<RootStackParamList>, 'getRootState' | 'reset'>,
  targetRoute: keyof RootStackParamList
): void {
  const rootState = nav.getRootState() as
    | { index: number; routes: { name: string }[] }
    | undefined;
  const currentRootRoute = rootState?.routes[rootState.index]?.name;

  if (currentRootRoute !== targetRoute) {
    nav.reset({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  }
}
