import { describe, expect, it } from '@jest/globals';
import {
  isTripPaymentPending,
  isTripWithinDeleteWindow,
  SOCIETY_TRIP_DELETE_WINDOW_MS,
} from '../../utils/societyTripBreakdown';
import type { SocietyTrip } from '../../types';

function makeTrip(overrides: Partial<SocietyTrip> = {}): SocietyTrip {
  return {
    id: 'trip-1',
    customerId: 'cust-1',
    agencyName: 'Test Agency',
    scheduledAt: new Date('2026-06-01T10:00:00Z'),
    tankerSizeLiters: 10000,
    tankerAmount: 5000,
    photoUrls: [],
    createdAt: new Date('2026-06-01T09:00:00Z'),
    ...overrides,
  };
}

const period = { periodType: 'month' as const, year: 2026, month: 5 };

describe('isTripPaymentPending', () => {
  it('returns true when no settlement exists for agency+period', () => {
    const trip = makeTrip();
    expect(isTripPaymentPending(trip, [], period)).toBe(true);
  });

  it('returns false when settlement exists and trip was created before settlement', () => {
    const trip = makeTrip({ createdAt: new Date('2026-06-01T08:00:00Z') });
    const completedPaymentPeriods = [
      {
        periodKey: 'm:2026-5|test agency',
        completedAt: new Date('2026-06-01T09:00:00Z'),
      },
    ];
    expect(isTripPaymentPending(trip, completedPaymentPeriods, period)).toBe(false);
  });

  it('returns true when settlement exists but trip was created after settlement', () => {
    const trip = makeTrip({ createdAt: new Date('2026-06-01T10:00:00Z') });
    const completedPaymentPeriods = [
      {
        periodKey: 'm:2026-5|test agency',
        completedAt: new Date('2026-06-01T09:00:00Z'),
      },
    ];
    expect(isTripPaymentPending(trip, completedPaymentPeriods, period)).toBe(true);
  });
});

describe('isTripWithinDeleteWindow', () => {
  const now = new Date('2026-06-01T12:00:00Z');

  it('returns true for a trip created 30 minutes ago', () => {
    const trip = makeTrip({
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    });
    expect(isTripWithinDeleteWindow(trip, now)).toBe(true);
  });

  it('returns false for a trip created 61 minutes ago', () => {
    const trip = makeTrip({
      createdAt: new Date(now.getTime() - 61 * 60 * 1000),
    });
    expect(isTripWithinDeleteWindow(trip, now)).toBe(false);
  });

  it('returns false at exactly the 1-hour boundary', () => {
    const trip = makeTrip({
      createdAt: new Date(now.getTime() - SOCIETY_TRIP_DELETE_WINDOW_MS),
    });
    expect(isTripWithinDeleteWindow(trip, now)).toBe(false);
  });
});
