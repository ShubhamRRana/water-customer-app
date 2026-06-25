jest.mock('../../lib/index', () => ({
  dataAccess: {
    subscriptions: {},
  },
}));

jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../../services/payment.service', () => ({
  PaymentService: {},
}));

jest.mock('../../utils/errorLogger', () => ({
  errorLogger: {
    medium: jest.fn(),
    low: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabaseClient';
import { SubscriptionService, computeYearlySavingsFromMonthly } from '../../services/subscription.service';
import type { SubscriptionPlan } from '../../types/subscription.types';

function mockPlan(
  overrides: Partial<SubscriptionPlan> & Pick<SubscriptionPlan, 'id' | 'name' | 'durationMonths'>
): SubscriptionPlan {
  return {
    description: null,
    price: 999,
    currency: 'INR',
    features: [],
    maxBookingsPerMonth: null,
    isActive: true,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SubscriptionService.filterPlansForAccountKind', () => {
  const plans: SubscriptionPlan[] = [
    mockPlan({
      id: 'ind-m',
      name: 'Individual Monthly',
      durationMonths: 1,
      accountKind: 'individual',
    }),
    mockPlan({
      id: 'soc-m',
      name: 'Society Monthly',
      durationMonths: 1,
      accountKind: 'society',
    }),
    mockPlan({
      id: 'soc-h',
      name: 'Society Half Yearly',
      durationMonths: 6,
      accountKind: 'society',
    }),
    mockPlan({
      id: 'soc-y',
      name: 'Society Yearly',
      durationMonths: 12,
      accountKind: 'society',
    }),
    mockPlan({
      id: 'soc-q',
      name: 'Society Quarterly',
      durationMonths: 3,
      accountKind: 'society',
    }),
    mockPlan({
      id: 'agency-m',
      name: 'Agency Monthly',
      durationMonths: 1,
      accountKind: 'agency',
    }),
    mockPlan({
      id: 'universal-m',
      name: 'Universal Monthly',
      durationMonths: 1,
      accountKind: null,
    }),
  ];

  it('excludes agency plans for society users and keeps only society 1/12 month plans', () => {
    const filtered = SubscriptionService.filterPlansForAccountKind(plans, 'society');

    expect(filtered.map((p) => p.id)).toEqual(['soc-m', 'soc-y']);
  });

  it('falls back to universal plans for society when no society-specific plans exist', () => {
    const withoutSociety = plans.filter((p) => p.accountKind !== 'society');
    const filtered = SubscriptionService.filterPlansForAccountKind(withoutSociety, 'society');

    expect(filtered.map((p) => p.id)).toEqual(['universal-m']);
  });

  it('excludes agency plans for individual users', () => {
    const filtered = SubscriptionService.filterPlansForAccountKind(plans, 'individual');

    expect(filtered.map((p) => p.id)).toEqual(['ind-m', 'universal-m']);
    expect(filtered.some((p) => p.accountKind === 'agency')).toBe(false);
  });

  it('excludes agency plans when account kind is not set', () => {
    const filtered = SubscriptionService.filterPlansForAccountKind(plans, null);

    expect(filtered.some((p) => p.accountKind === 'agency')).toBe(false);
    expect(filtered.length).toBe(plans.length - 1);
  });
});

describe('computeYearlySavingsFromMonthly', () => {
  it('returns savings breakdown for society monthly/yearly prices', () => {
    const result = computeYearlySavingsFromMonthly(2399, 24469);

    expect(result).toEqual({
      fullYearPrice: 28788,
      savingsAmount: 4319,
      discountPercent: 15,
    });
  });

  it('returns null when yearly price equals monthly × 12', () => {
    expect(computeYearlySavingsFromMonthly(1000, 12000)).toBeNull();
  });

  it('returns null when yearly price exceeds monthly × 12', () => {
    expect(computeYearlySavingsFromMonthly(100, 1500)).toBeNull();
  });
});

describe('SubscriptionService.provisionFreeTrial', () => {
  const mockInvoke = supabase.functions.invoke as jest.Mock;

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('returns success when trial is provisioned', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        subscriptionId: 'sub-trial-1',
        trialEndDate: '2026-07-25',
      },
      error: null,
    });

    const result = await SubscriptionService.provisionFreeTrial();

    expect(mockInvoke).toHaveBeenCalledWith('provision-free-trial-subscription', { body: {} });
    expect(result).toEqual({
      success: true,
      subscriptionId: 'sub-trial-1',
      trialEndDate: '2026-07-25',
      alreadyProvisioned: undefined,
    });
  });

  it('returns ineligible when edge function reports failure', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, reason: 'not_customer' },
      error: null,
    });

    const result = await SubscriptionService.provisionFreeTrial();

    expect(result).toEqual({ success: false, reason: 'not_customer' });
  });
});
