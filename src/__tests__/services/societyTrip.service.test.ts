/**
 * Society trip service — subscription gating
 */

import { ERROR_MESSAGES } from '../../constants/config';
import { supabase } from '../../lib/supabaseClient';
import { SocietyTripService } from '../../services/societyTrip.service';
import { SubscriptionService } from '../../services/subscription.service';

jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../services/subscription.service', () => ({
  SubscriptionService: {
    hasActiveSubscription: jest.fn().mockResolvedValue(true),
  },
}));

const mockFrom = supabase.from as jest.Mock;

describe('SocietyTripService.createTrip', () => {
  const baseInput = {
    customerId: 'cust-1',
    agencyName: 'Agency',
    scheduledAt: new Date('2026-06-01T10:00:00Z'),
    tankerSizeLiters: 10000,
    tankerAmount: 5000,
    photoUrls: ['https://example.com/p.jpg'],
  };

  beforeEach(() => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    (SubscriptionService.hasActiveSubscription as jest.Mock).mockResolvedValue(true);
  });

  it('throws SUBSCRIPTION_REQUIRED when user has no active subscription', async () => {
    (SubscriptionService.hasActiveSubscription as jest.Mock).mockResolvedValueOnce(false);

    await expect(SocietyTripService.createTrip(baseInput)).rejects.toThrow(
      ERROR_MESSAGES.societyTrip.subscriptionRequired
    );

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('inserts when subscription is active', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });

    await SocietyTripService.createTrip(baseInput);

    expect(SubscriptionService.hasActiveSubscription).toHaveBeenCalledWith(baseInput.customerId);
    expect(mockFrom).toHaveBeenCalledWith('society_trips');
    expect(insert).toHaveBeenCalled();
  });
});
