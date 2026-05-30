import { SocietyTrip } from '../types';
import { societyAgencyPaymentPeriodKey } from '../navigation/rootNavigation';

export type CompletedPaymentPeriod = { periodKey: string; completedAt: Date };

export type PeriodContext = {
  periodType: 'month' | 'year';
  year: number;
  month: number;
};

export type AgencyTankerSizeRow = {
  liters: number;
  count: number;
  amountSum: number;
  tripsWithAmount: number;
};

export type AgencyTripBreakdownRow = {
  agencyName: string;
  count: number;
  amountSum: number;
  tripsWithAmount: number;
  sizes: AgencyTankerSizeRow[];
  hasSettlement: boolean;
  pendingAmountSum: number;
  pendingTripsWithAmount: number;
  pendingCount: number;
};

export function filterTripsByPeriod(
  list: SocietyTrip[],
  periodType: 'month' | 'year',
  year: number,
  month: number,
): SocietyTrip[] {
  if (periodType === 'year') {
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return list.filter((t) => {
      const d = new Date(t.scheduledAt);
      return d >= start && d <= end;
    });
  }
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return list.filter((t) => {
    const d = new Date(t.scheduledAt);
    return d >= monthStart && d <= monthEnd;
  });
}

export function isAgencyPaymentComplete(
  agencyName: string,
  filteredTrips: SocietyTrip[],
  completedPaymentPeriods: CompletedPaymentPeriod[],
  period: PeriodContext,
): boolean {
  const key = societyAgencyPaymentPeriodKey({
    periodType: period.periodType,
    year: period.year,
    month: period.month,
    agencyName,
  });
  const row = completedPaymentPeriods.find((p) => p.periodKey === key);
  if (!row) return false;
  const normalizedAgency = agencyName.trim().toLowerCase();
  return !filteredTrips.some(
    (t) =>
      t.agencyName.trim().toLowerCase() === normalizedAgency &&
      t.createdAt > row.completedAt,
  );
}

export function buildTripsByAgency(
  filteredTrips: SocietyTrip[],
  completedPaymentPeriods: CompletedPaymentPeriod[],
  period: PeriodContext,
): AgencyTripBreakdownRow[] {
  const bucket = new Map<
    string,
    {
      agencyName: string;
      count: number;
      amountSum: number;
      tripsWithAmount: number;
      sizes: Map<number, AgencyTankerSizeRow>;
    }
  >();
  for (const t of filteredTrips) {
    const agencyName = t.agencyName.trim();
    const key = agencyName.toLowerCase();
    const prev = bucket.get(key) ?? {
      agencyName,
      count: 0,
      amountSum: 0,
      tripsWithAmount: 0,
      sizes: new Map<number, AgencyTankerSizeRow>(),
    };
    const hasAmount = t.tankerAmount != null && Number.isFinite(t.tankerAmount);
    prev.count += 1;
    if (hasAmount) {
      prev.amountSum += t.tankerAmount as number;
      prev.tripsWithAmount += 1;
    }
    const size = prev.sizes.get(t.tankerSizeLiters) ?? {
      liters: t.tankerSizeLiters,
      count: 0,
      amountSum: 0,
      tripsWithAmount: 0,
    };
    size.count += 1;
    if (hasAmount) {
      size.amountSum += t.tankerAmount as number;
      size.tripsWithAmount += 1;
    }
    prev.sizes.set(t.tankerSizeLiters, size);
    bucket.set(key, prev);
  }
  return [...bucket.values()]
    .map((a) => {
      const settlementKey = societyAgencyPaymentPeriodKey({
        periodType: period.periodType,
        year: period.year,
        month: period.month,
        agencyName: a.agencyName,
      });
      const settlement = completedPaymentPeriods.find((p) => p.periodKey === settlementKey);
      const normalizedAgency = a.agencyName.trim().toLowerCase();
      const agencyTrips = filteredTrips.filter(
        (t) => t.agencyName.trim().toLowerCase() === normalizedAgency,
      );

      let pendingAmountSum = 0;
      let pendingTripsWithAmount = 0;
      let pendingCount = 0;
      if (settlement) {
        for (const t of agencyTrips) {
          if (t.createdAt > settlement.completedAt) {
            pendingCount += 1;
            if (t.tankerAmount != null && Number.isFinite(t.tankerAmount)) {
              pendingAmountSum += t.tankerAmount;
              pendingTripsWithAmount += 1;
            }
          }
        }
      }

      return {
        agencyName: a.agencyName,
        count: a.count,
        amountSum: a.amountSum,
        tripsWithAmount: a.tripsWithAmount,
        sizes: [...a.sizes.values()].sort((x, y) => x.liters - y.liters),
        hasSettlement: settlement != null,
        pendingAmountSum,
        pendingTripsWithAmount,
        pendingCount,
      };
    })
    .sort((a, b) => a.agencyName.localeCompare(b.agencyName));
}
