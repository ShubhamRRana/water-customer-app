/**
 * Post-login subscription gate tests
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../services/subscription.service', () => ({
  SubscriptionService: {
    provisionFreeTrial: jest.fn(),
    hasActiveSubscription: jest.fn(),
  },
}));

jest.mock('../../utils/subscriptionGating', () => ({
  isSubscriptionGatingEnabled: jest.fn(() => true),
}));

jest.mock('../../utils/errorLogger', () => ({
  errorLogger: {
    low: jest.fn(),
  },
}));

import { SubscriptionService } from '../../services/subscription.service';
import { isSubscriptionGatingEnabled } from '../../utils/subscriptionGating';
import { resolveSubscriptionAccess } from '../../utils/postLoginSubscriptionGate';

const mockedIsSubscriptionGatingEnabled = jest.mocked(isSubscriptionGatingEnabled);
const mockedProvisionFreeTrial = jest.mocked(SubscriptionService.provisionFreeTrial);
const mockedHasActiveSubscription = jest.mocked(SubscriptionService.hasActiveSubscription);

describe('resolveSubscriptionAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsSubscriptionGatingEnabled.mockReturnValue(true);
    mockedProvisionFreeTrial.mockResolvedValue({ success: true });
    mockedHasActiveSubscription.mockResolvedValue(true);
  });

  it('returns allowed when subscription gating is disabled', async () => {
    mockedIsSubscriptionGatingEnabled.mockReturnValue(false);

    const result = await resolveSubscriptionAccess('user-1');

    expect(result).toBe('allowed');
    expect(mockedProvisionFreeTrial).not.toHaveBeenCalled();
    expect(mockedHasActiveSubscription).not.toHaveBeenCalled();
  });

  it('awaits trial provisioning before checking active subscription', async () => {
    const order: string[] = [];
    mockedProvisionFreeTrial.mockImplementation(async () => {
      order.push('provision');
      return { success: true };
    });
    mockedHasActiveSubscription.mockImplementation(async () => {
      order.push('check');
      return true;
    });

    await resolveSubscriptionAccess('user-1');

    expect(order).toEqual(['provision', 'check']);
    expect(mockedHasActiveSubscription).toHaveBeenCalledWith('user-1');
  });

  it('returns allowed when user has active subscription or trial', async () => {
    mockedHasActiveSubscription.mockResolvedValue(true);

    const result = await resolveSubscriptionAccess('user-1');

    expect(result).toBe('allowed');
  });

  it('returns required when user has no active subscription or trial', async () => {
    mockedHasActiveSubscription.mockResolvedValue(false);

    const result = await resolveSubscriptionAccess('user-1');

    expect(result).toBe('required');
  });

  it('returns allowed when subscription check fails', async () => {
    mockedHasActiveSubscription.mockRejectedValue(new Error('network'));

    const result = await resolveSubscriptionAccess('user-1');

    expect(result).toBe('allowed');
  });
});
