import {
  daysRemainingUntil,
  getProfileSubscriptionPanelModel,
} from '../../utils/profileSubscriptionPanel';
import type { SubscriptionPlan, UserSubscription } from '../../types/subscription.types';

const plan = {
  id: 'plan-1',
  name: 'Individual Monthly',
  description: null,
  durationMonths: 1,
  price: 100,
  currency: 'INR',
  features: [],
  maxBookingsPerMonth: null,
  isActive: true,
  displayOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
} as SubscriptionPlan;

function makeSub(overrides: Partial<UserSubscription>): UserSubscription {
  return {
    id: 'sub-1',
    userId: 'u1',
    planId: 'plan-1',
    status: 'active',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-01'),
    autoRenew: false,
    cancelledAt: null,
    cancellationReason: null,
    trialEndDate: null,
    isTrial: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('daysRemainingUntil', () => {
  it('returns null when end is null', () => {
    expect(daysRemainingUntil(null)).toBeNull();
  });

  it('returns ceil days remaining', () => {
    const now = new Date('2026-07-12T00:00:00Z');
    const end = new Date('2026-07-17T00:00:00Z');
    expect(daysRemainingUntil(end, now)).toBe(5);
  });
});

describe('getProfileSubscriptionPanelModel', () => {
  const now = new Date('2026-07-12T00:00:00Z');

  it('returns hidden when gating is disabled', () => {
    const model = getProfileSubscriptionPanelModel({
      gatingEnabled: false,
      subscription: makeSub({}),
      plan,
      now,
    });
    expect(model.visualState).toBe('hidden');
    expect(model.primaryCta).toBeNull();
  });

  it('returns active when status active and more than 7 days left', () => {
    const model = getProfileSubscriptionPanelModel({
      gatingEnabled: true,
      subscription: makeSub({ endDate: new Date('2026-08-01T00:00:00Z') }),
      plan,
      now,
    });
    expect(model.visualState).toBe('active');
    expect(model.planName).toBe('Individual Monthly');
    expect(model.primaryCta).toBe('renew');
    expect(model.secondaryCta).toBe('details');
    expect(model.daysLeft).toBeGreaterThan(7);
  });

  it('returns expiring_soon when active and ≤7 days left', () => {
    const model = getProfileSubscriptionPanelModel({
      gatingEnabled: true,
      subscription: makeSub({ endDate: new Date('2026-07-17T00:00:00Z') }),
      plan,
      now,
    });
    expect(model.visualState).toBe('expiring_soon');
    expect(model.daysLeft).toBe(5);
    expect(model.primaryCta).toBe('renew_now');
    expect(model.secondaryCta).toBeNull();
  });

  it('returns none when subscription missing', () => {
    const model = getProfileSubscriptionPanelModel({
      gatingEnabled: true,
      subscription: null,
      plan: null,
      now,
    });
    expect(model.visualState).toBe('none');
    expect(model.primaryCta).toBe('view_plans');
    expect(model.secondaryCta).toBeNull();
  });

  it('returns none when status expired or cancelled', () => {
    for (const status of ['expired', 'cancelled'] as const) {
      const model = getProfileSubscriptionPanelModel({
        gatingEnabled: true,
        subscription: makeSub({ status }),
        plan,
        now,
      });
      expect(model.visualState).toBe('none');
      expect(model.primaryCta).toBe('view_plans');
    }
  });
});
