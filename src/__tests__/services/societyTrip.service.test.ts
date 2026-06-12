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

  it('inserts when subscription is active', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });

    await SocietyTripService.createTrip(baseInput);

    expect(mockFrom).toHaveBeenCalledWith('society_trips');
    expect(insert).toHaveBeenCalled();
  });

  it('rejects when subscription is inactive and gating is enabled', async () => {
    (SubscriptionService.hasActiveSubscription as jest.Mock).mockResolvedValueOnce(false);
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });

    await expect(SocietyTripService.createTrip(baseInput)).rejects.toThrow(
      ERROR_MESSAGES.societyTrip.subscriptionRequired
    );
  });
});
