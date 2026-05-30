import { describe, expect, it } from '@jest/globals';
import {
  societyAgencyPaymentPeriodKey,
  societyPaymentPeriodKey,
} from '../../navigation/rootNavigation';

describe('societyPaymentPeriodKey', () => {
  it('builds a month key (month index 0-11)', () => {
    expect(societyPaymentPeriodKey({ periodType: 'month', year: 2026, month: 2 })).toBe('m:2026-2');
  });

  it('builds a year key and ignores month', () => {
    expect(societyPaymentPeriodKey({ periodType: 'year', year: 2026, month: 5 })).toBe('y:2026');
  });
});

describe('societyAgencyPaymentPeriodKey', () => {
  it('appends a normalized agency to a month key', () => {
    expect(
      societyAgencyPaymentPeriodKey({
        periodType: 'month',
        year: 2026,
        month: 2,
        agencyName: '  ABC Agency ',
      }),
    ).toBe('m:2026-2|abc agency');
  });

  it('appends agency to a year key', () => {
    expect(
      societyAgencyPaymentPeriodKey({
        periodType: 'year',
        year: 2026,
        month: 5,
        agencyName: 'XYZ',
      }),
    ).toBe('y:2026|xyz');
  });
});
