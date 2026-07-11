import type { SubscriptionPlan, UserSubscription } from '../types/subscription.types';

export type ProfileSubscriptionVisualState =
  | 'active'
  | 'expiring_soon'
  | 'none'
  | 'hidden';

export type ProfileSubscriptionPanelModel = {
  visualState: ProfileSubscriptionVisualState;
  daysLeft: number | null;
  planName: string | null;
  endDate: Date | null;
  primaryCta: 'renew' | 'renew_now' | 'view_plans' | null;
  secondaryCta: 'details' | null;
};

const MS_PER_DAY = 86400000;

export function daysRemainingUntil(end: Date | null, now: Date = new Date()): number | null {
  if (!end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY));
}

export function getProfileSubscriptionPanelModel(input: {
  gatingEnabled: boolean;
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  now?: Date;
  expiringSoonDays?: number;
}): ProfileSubscriptionPanelModel {
  const {
    gatingEnabled,
    subscription,
    plan,
    now = new Date(),
    expiringSoonDays = 7,
  } = input;

  if (!gatingEnabled) {
    return {
      visualState: 'hidden',
      daysLeft: null,
      planName: null,
      endDate: null,
      primaryCta: null,
      secondaryCta: null,
    };
  }

  const endDate = subscription?.endDate ?? null;
  const daysLeft = daysRemainingUntil(endDate, now);
  const planName = plan?.name ?? null;

  if (subscription?.status === 'active') {
    if (daysLeft !== null && daysLeft <= expiringSoonDays) {
      return {
        visualState: 'expiring_soon',
        daysLeft,
        planName,
        endDate,
        primaryCta: 'renew_now',
        secondaryCta: null,
      };
    }
    return {
      visualState: 'active',
      daysLeft,
      planName,
      endDate,
      primaryCta: 'renew',
      secondaryCta: 'details',
    };
  }

  return {
    visualState: 'none',
    daysLeft,
    planName,
    endDate,
    primaryCta: 'view_plans',
    secondaryCta: null,
  };
}
