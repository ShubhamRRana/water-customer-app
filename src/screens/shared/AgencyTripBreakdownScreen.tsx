import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Card, Typography, ScreenLoading, ScreenEmpty } from '../../components/common';
import AppScreenHeader from '../../components/layouts/AppScreenHeader';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import { PricingUtils } from '../../utils/pricing';
import { SocietyTripService } from '../../services/societyTrip.service';
import {
  buildTripsByAgency,
  filterTripsByPeriod,
  isAgencyPaymentComplete,
  type AgencyTripBreakdownRow,
  type CompletedPaymentPeriod,
} from '../../utils/societyTripBreakdown';

type Nav = StackNavigationProp<AppStackParamList, 'AgencyTripBreakdown'>;

interface Props {
  navigation: Nav;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const AgencyTripBreakdownScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<AppStackParamList, 'AgencyTripBreakdown'>>();
  const { periodType, year, month, agencyName } = route.params;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuthStore();

  const [trips, setTrips] = useState<AgencyTripBreakdownRow[] | null>(null);
  const [completedPaymentPeriods, setCompletedPaymentPeriods] = useState<CompletedPaymentPeriod[]>(
    [],
  );
  const [filteredTrips, setFilteredTrips] = useState<
    Awaited<ReturnType<typeof SocietyTripService.listTripsForCustomer>>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const periodLabel = useMemo(
    () => (periodType === 'year' ? `${year}` : `${MONTH_NAMES[month]} ${year}`),
    [periodType, year, month],
  );

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [list, periods] = await Promise.all([
        SocietyTripService.listTripsForCustomer(user.id),
        SocietyTripService.listCompletedPaymentPeriods(user.id),
      ]);
      const filtered = filterTripsByPeriod(list, periodType, year, month);
      setFilteredTrips(filtered);
      setCompletedPaymentPeriods(periods);
      setTrips(buildTripsByAgency(filtered, periods, { periodType, year, month }));
    } catch (error) {
      errorLogger.medium('Failed to load agency trip breakdown', error, { userId: user.id });
      throw error;
    }
  }, [user?.id, periodType, year, month]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      loadData()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [loadData]),
  );

  const agency = useMemo(() => {
    if (!trips) return null;
    const normalized = agencyName.trim().toLowerCase();
    return trips.find((a) => a.agencyName.trim().toLowerCase() === normalized) ?? null;
  }, [trips, agencyName]);

  const agencyComplete = useMemo(
    () =>
      isAgencyPaymentComplete(agencyName, filteredTrips, completedPaymentPeriods, {
        periodType,
        year,
        month,
      }),
    [agencyName, filteredTrips, completedPaymentPeriods, periodType, year, month],
  );

  if (isLoading && trips == null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenLoading message="Loading agency details…" />
      </SafeAreaView>
    );
  }

  const hasBillableAmount = agency != null && agency.tripsWithAmount > 0;
  const showPendingAmount =
    agency != null && agency.hasSettlement && agency.pendingTripsWithAmount > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppScreenHeader
        left={{ type: 'back', onPress: () => navigation.goBack() }}
        title={agencyName}
        subtitle={periodLabel}
      />
      {agency == null ? (
        <View style={styles.emptyWrap}>
          <ScreenEmpty
            icon="business-outline"
            title="No trips for this agency"
            message="There are no logged trips for this agency in the selected period."
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="body" style={styles.cardTitle} numberOfLines={2}>
                {agency.agencyName}
              </Typography>
              {agencyComplete ? (
                <View style={styles.paidBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Typography variant="caption" style={styles.paymentCompleteText}>
                    Paid
                  </Typography>
                </View>
              ) : null}
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryColLeft}>
                <Typography variant="caption" style={styles.summaryColHeading}>
                  Period total
                </Typography>
              </View>
              <View style={styles.summaryColCenter}>
                <Typography variant="body" style={styles.summaryCellCenter}>
                  {hasBillableAmount ? PricingUtils.formatPrice(agency.amountSum) : '—'}
                </Typography>
              </View>
              <View style={styles.summaryColRight}>
                <Typography variant="body" style={styles.summaryCellRight}>
                  {agency.count} {agency.count === 1 ? 'trip' : 'trips'}
                </Typography>
              </View>
            </View>

            <View style={[styles.summaryRow, styles.cardSubHeader]}>
              <View style={styles.summaryColLeft}>
                <Typography variant="caption" style={styles.summaryColHeading}>
                  Tanker size
                </Typography>
              </View>
              <View style={styles.summaryColCenter}>
                <Typography variant="caption" style={styles.summaryColHeading}>
                  Amount
                </Typography>
              </View>
              <View style={styles.summaryColRight}>
                <Typography variant="caption" style={styles.summaryColHeading}>
                  Trips
                </Typography>
              </View>
            </View>

            {agency.sizes.map((s) => (
              <View key={s.liters} style={styles.cardSizeRow}>
                <View style={styles.summaryColLeft}>
                  <Typography variant="body" style={styles.summaryCellLeft}>
                    {s.liters.toLocaleString()}L
                  </Typography>
                </View>
                <View style={styles.summaryColCenter}>
                  <Typography variant="body" style={styles.summaryCellCenter}>
                    {s.tripsWithAmount > 0 ? PricingUtils.formatPrice(s.amountSum) : '—'}
                  </Typography>
                </View>
                <View style={styles.summaryColRight}>
                  <Typography variant="body" style={styles.summaryCellRight}>
                    {s.count} {s.count === 1 ? 'trip' : 'trips'}
                  </Typography>
                </View>
              </View>
            ))}

            {showPendingAmount ? (
              <View style={styles.pendingRow}>
                <Typography variant="caption" style={styles.pendingLabel}>
                  Pending amount
                </Typography>
                <Typography variant="body" style={styles.pendingValue}>
                  {PricingUtils.formatPrice(agency.pendingAmountSum)}
                </Typography>
                {agency.pendingCount > 0 ? (
                  <Typography variant="caption" style={styles.pendingMeta}>
                    {agency.pendingCount} {agency.pendingCount === 1 ? 'trip' : 'trips'} after
                    settlement
                  </Typography>
                ) : null}
              </View>
            ) : null}

            {agencyComplete ? (
              <View style={styles.settleRow}>
                <View style={styles.paymentComplete}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Typography variant="body" style={styles.paymentCompleteText}>
                    Payment Complete
                  </Typography>
                </View>
              </View>
            ) : null}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    card: {
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 10,
    },
    cardTitle: {
      flex: 1,
      fontWeight: '700',
      color: colors.text,
    },
    paidBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    cardSubHeader: {
      marginTop: 8,
      paddingTop: 8,
    },
    cardSizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    summaryColLeft: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    summaryColCenter: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryColRight: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    summaryColHeading: {
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    summaryCellLeft: {
      color: colors.text,
      fontWeight: '600',
    },
    summaryCellCenter: {
      color: colors.accent,
      fontWeight: '600',
    },
    summaryCellRight: {
      color: colors.textSecondary,
    },
    pendingRow: {
      marginTop: 10,
      paddingTop: 10,
      paddingBottom: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    pendingLabel: {
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    pendingValue: {
      color: colors.warning,
      fontWeight: '700',
    },
    pendingMeta: {
      color: colors.textSecondary,
      marginTop: 4,
    },
    settleRow: {
      alignItems: 'stretch',
      paddingTop: 12,
      marginTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    paymentComplete: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    paymentCompleteText: {
      color: colors.success,
      fontWeight: '700',
    },
  });
}

export default AgencyTripBreakdownScreen;
