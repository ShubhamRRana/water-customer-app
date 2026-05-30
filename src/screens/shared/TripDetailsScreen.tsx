import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import { Typography, CustomerMenuDrawer, ScreenLoading, ScreenEmpty } from '../../components/common';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';
import AppScreenHeader, {
  AppScreenHeaderTrailingSpacer,
} from '../../components/layouts/AppScreenHeader';
import { SocietyTrip } from '../../types';
import { type AppStackParamList } from '../../navigation/rootNavigation';
import { UI_CONFIG } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';
import { PricingUtils } from '../../utils/pricing';
import { SocietyTripService } from '../../services/societyTrip.service';
import { useRefreshControl } from '../../hooks/useRefreshControl';
import {
  buildTripsByAgency,
  filterTripsByPeriod,
  isAgencyPaymentComplete as computeAgencyPaymentComplete,
} from '../../utils/societyTripBreakdown';

type TripDetailsNavigationProp = StackNavigationProp<AppStackParamList, 'TripDetails'>;

interface TripDetailsScreenProps {
  navigation: TripDetailsNavigationProp;
}

const TripDetailsScreen: React.FC<TripDetailsScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createTripDetailsStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user, logout, customerAccountKind } = useAuthStore();
  const [trips, setTrips] = useState<SocietyTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [completedPaymentPeriods, setCompletedPaymentPeriods] = useState<
    { periodKey: string; completedAt: Date }[]
  >([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const periodTypeGliderAnim = useRef(new Animated.Value(0)).current;
  const monthGliderAnim = useRef(new Animated.Value(0)).current;
  const yearGliderAnim = useRef(new Animated.Value(0)).current;
  const [periodTypeOptionWidth, setPeriodTypeOptionWidth] = useState(0);
  const [monthOptionWidth, setMonthOptionWidth] = useState(0);
  const [yearOptionWidth, setYearOptionWidth] = useState(0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, []);

  useEffect(() => {
    if (periodTypeOptionWidth > 0) {
      Animated.spring(periodTypeGliderAnim, {
        toValue: periodType === 'month' ? 0 : periodTypeOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [periodType, periodTypeOptionWidth, periodTypeGliderAnim]);

  useEffect(() => {
    if (monthOptionWidth > 0) {
      Animated.spring(monthGliderAnim, {
        toValue: selectedMonth * monthOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [selectedMonth, monthOptionWidth, monthGliderAnim]);

  useEffect(() => {
    if (yearOptionWidth > 0) {
      const yearIndex = availableYears.indexOf(selectedYear);
      Animated.spring(yearGliderAnim, {
        toValue: yearIndex >= 0 ? yearIndex * yearOptionWidth : 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [selectedYear, yearOptionWidth, yearGliderAnim, availableYears]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, [periodType, selectedYear, selectedMonth]);

  const loadTripDetailsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [list, periods] = await Promise.all([
        SocietyTripService.listTripsForCustomer(user.id),
        SocietyTripService.listCompletedPaymentPeriods(user.id),
      ]);
      setTrips(list);
      setCompletedPaymentPeriods(periods);
    } catch (error) {
      errorLogger.medium('Failed to load society trips', error, { userId: user.id });
      throw error;
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      loadTripDetailsData()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [loadTripDetailsData]),
  );

  const openAgencyBreakdown = useCallback(
    (agencyName: string) => {
      setBreakdownVisible(false);
      navigation.navigate('AgencyTripBreakdown', {
        periodType,
        year: selectedYear,
        month: selectedMonth,
        agencyName,
      });
    },
    [navigation, periodType, selectedYear, selectedMonth],
  );

  const { refreshing, onRefresh } = useRefreshControl(
    useCallback(async () => {
      await loadTripDetailsData();
    }, [loadTripDetailsData]),
    {
      onError: () => Alert.alert('Error', 'Could not load trip details. Try again.'),
    },
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'TripDetails') {
      return;
    }
    navigation.navigate(route);
  };

  const openPhoto = (url: string) => {
    setPhotoPreviewUri(url);
  };

  const closePhotoPreview = () => {
    setPhotoPreviewUri(null);
  };

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const toggleTripSelected = useCallback((tripId: string) => {
    setSelectedIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId],
    );
  }, []);

  const performDelete = useCallback(
    async (tripIds: string[]) => {
      if (!user?.id || tripIds.length === 0) return;
      setDeleting(true);
      try {
        await SocietyTripService.deleteTripsForCustomer(user.id, tripIds);
        setTrips((prev) => prev.filter((t) => !tripIds.includes(t.id)));
        exitSelectionMode();
      } catch (error) {
        errorLogger.medium('Failed to delete society trips', error, {
          userId: user.id,
          count: tripIds.length,
        });
        Alert.alert('Error', 'Could not delete trip(s). Try again.');
      } finally {
        setDeleting(false);
      }
    },
    [user?.id, exitSelectionMode],
  );

  const confirmDeleteSingle = useCallback(
    (trip: SocietyTrip) => {
      Alert.alert(
        'Delete trip',
        `Remove this trip for ${trip.agencyName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => performDelete([trip.id]),
          },
        ],
      );
    },
    [performDelete],
  );

  const confirmDeleteSelected = useCallback(() => {
    const n = selectedIds.length;
    if (n === 0) return;
    Alert.alert(
      n === 1 ? 'Delete trip' : 'Delete trips',
      n === 1
        ? 'Remove this trip?'
        : `Remove ${n} trips? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(selectedIds),
        },
      ],
    );
  }, [performDelete, selectedIds]);

  const filteredTrips = useMemo(
    () => filterTripsByPeriod(trips, periodType, selectedYear, selectedMonth),
    [trips, periodType, selectedYear, selectedMonth],
  );

  const isAgencyPaymentComplete = useCallback(
    (agencyName: string) =>
      computeAgencyPaymentComplete(agencyName, filteredTrips, completedPaymentPeriods, {
        periodType,
        year: selectedYear,
        month: selectedMonth,
      }),
    [completedPaymentPeriods, periodType, selectedYear, selectedMonth, filteredTrips],
  );

  const tripsByAgency = useMemo(
    () =>
      buildTripsByAgency(filteredTrips, completedPaymentPeriods, {
        periodType,
        year: selectedYear,
        month: selectedMonth,
      }),
    [filteredTrips, completedPaymentPeriods, periodType, selectedYear, selectedMonth],
  );

  const paymentCompleteForCurrentPeriod = useMemo(() => {
    if (filteredTrips.length === 0 || tripsByAgency.length === 0) return false;
    return tripsByAgency.every((row) => isAgencyPaymentComplete(row.agencyName));
  }, [filteredTrips, tripsByAgency, isAgencyPaymentComplete]);

  const grandTotalAmount = useMemo(
    () =>
      filteredTrips.reduce((sum, t) => {
        if (t.tankerAmount != null && Number.isFinite(t.tankerAmount)) {
          return sum + t.tankerAmount;
        }
        return sum;
      }, 0),
    [filteredTrips],
  );

  const anyTripHasAmount = useMemo(
    () => filteredTrips.some((t) => t.tankerAmount != null && Number.isFinite(t.tankerAmount)),
    [filteredTrips],
  );

  if (isLoading && !trips.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenLoading message="Loading trip details…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AppScreenHeader
          left={{ type: 'menu', onPress: () => setMenuVisible(true) }}
          title={selectionMode ? 'Select trips' : 'Trip details'}
          subtitle={
            selectionMode
              ? `${selectedIds.length} selected`
              : `${filteredTrips.length} ${filteredTrips.length === 1 ? 'trip' : 'trips'} logged`
          }
          right={
            filteredTrips.length > 0 ? (
              selectionMode ? (
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={exitSelectionMode}
                  activeOpacity={0.7}
                  disabled={deleting}
                >
                  <Typography variant="body" style={styles.headerActionText}>
                    Cancel
                  </Typography>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={() => setSelectionMode(true)}
                  activeOpacity={0.7}
                >
                  <Typography variant="body" style={styles.headerActionText}>
                    Select
                  </Typography>
                </TouchableOpacity>
              )
            ) : (
              <AppScreenHeaderTrailingSpacer />
            )
          }
        />

        <View style={styles.periodTypeToggle}>
          <View style={styles.glassRadioGroup}>
            <TouchableOpacity
              style={styles.glassRadioOption}
              onPress={() => setPeriodType('month')}
              activeOpacity={0.8}
              onLayout={(e) => {
                if (periodTypeOptionWidth === 0) {
                  setPeriodTypeOptionWidth(e.nativeEvent.layout.width);
                }
              }}
            >
              <Typography
                variant="body"
                style={[
                  styles.glassRadioLabel,
                  periodType === 'month' && styles.glassRadioLabelActive,
                ]}
              >
                Month
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.glassRadioOption}
              onPress={() => setPeriodType('year')}
              activeOpacity={0.8}
            >
              <Typography
                variant="body"
                style={[
                  styles.glassRadioLabel,
                  periodType === 'year' && styles.glassRadioLabelActive,
                ]}
              >
                Year
              </Typography>
            </TouchableOpacity>
            {periodTypeOptionWidth > 0 ? (
              <Animated.View
                style={[
                  styles.glassGlider,
                  {
                    width: periodTypeOptionWidth,
                    transform: [{ translateX: periodTypeGliderAnim }],
                  },
                ]}
              />
            ) : null}
          </View>
        </View>

        {periodType === 'year' ? (
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.monthSelector}
              contentContainerStyle={styles.monthSelectorContent}
            >
              <View style={styles.glassRadioGroup}>
                {availableYears.map((year, index) => (
                  <TouchableOpacity
                    key={year}
                    style={styles.glassRadioOption}
                    onPress={() => setSelectedYear(year)}
                    activeOpacity={0.8}
                    onLayout={(e) => {
                      if (yearOptionWidth === 0 && index === 0) {
                        setYearOptionWidth(e.nativeEvent.layout.width);
                      }
                    }}
                  >
                    <Typography
                      variant="body"
                      style={[
                        styles.glassRadioLabel,
                        selectedYear === year && styles.glassRadioLabelActive,
                      ]}
                    >
                      {year}
                    </Typography>
                  </TouchableOpacity>
                ))}
                {yearOptionWidth > 0 ? (
                  <Animated.View
                    style={[
                      styles.glassGlider,
                      {
                        width: yearOptionWidth,
                        transform: [{ translateX: yearGliderAnim }],
                      },
                    ]}
                  />
                ) : null}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {periodType === 'month' ? (
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.monthSelector}
              contentContainerStyle={styles.monthSelectorContent}
            >
              <View style={styles.glassRadioGroup}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.glassRadioOption}
                    onPress={() => setSelectedMonth(index)}
                    activeOpacity={0.8}
                    onLayout={(e) => {
                      if (monthOptionWidth === 0 && index === 0) {
                        setMonthOptionWidth(e.nativeEvent.layout.width);
                      }
                    }}
                  >
                    <Typography
                      variant="body"
                      style={[
                        styles.glassRadioLabel,
                        selectedMonth === index && styles.glassRadioLabelActive,
                      ]}
                    >
                      {month}
                    </Typography>
                  </TouchableOpacity>
                ))}
                {monthOptionWidth > 0 ? (
                  <Animated.View
                    style={[
                      styles.glassGlider,
                      {
                        width: monthOptionWidth,
                        transform: [{ translateX: monthGliderAnim }],
                      },
                    ]}
                  />
                ) : null}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.summaryCardWrap}
          onPress={() => setBreakdownVisible(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Trip breakdown, show details"
        >
          <Card style={styles.summaryCard}>
            <View style={styles.summaryCardHeaderRow}>
              <Typography variant="caption" style={styles.summaryHeading}>
                Trip breakdown
              </Typography>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
            {paymentCompleteForCurrentPeriod ? (
              <View style={styles.paymentCompleteInline}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Typography variant="caption" style={styles.paymentCompleteInlineText}>
                  Payment Complete
                </Typography>
              </View>
            ) : null}
          </Card>
        </TouchableOpacity>

        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredTrips.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <Card style={styles.emptyState}>
              <ScreenEmpty
                compact
                icon="car-outline"
                title={trips.length === 0 ? 'No trips yet' : 'No trips in this period'}
                message={
                  trips.length === 0
                    ? 'Trips you add from Home appear here.'
                    : 'Try another month or year, or switch between Month and Year.'
                }
              />
            </Card>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            const multiPhoto = item.photoUrls.length > 1;

            const thumbScroll = (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={multiPhoto ? styles.thumbWrapMulti : styles.thumbWrapSingle}
                contentContainerStyle={styles.thumbStrip}
              >
                {item.photoUrls.length > 0 ? (
                  item.photoUrls.map((url) => (
                    <TouchableOpacity
                      key={`${item.id}-${url}`}
                      onPress={() => openPhoto(url)}
                      activeOpacity={0.85}
                      style={styles.thumbCell}
                    >
                      <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                      <View style={styles.thumbHint}>
                        <Ionicons name="expand-outline" size={14} color={colors.textLight} />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
              </ScrollView>
            );

            const tripInfoBlock = (
              <View style={[styles.tripInfo, multiPhoto && styles.tripInfoBelowPhotos]}>
                <Typography variant="body" style={styles.agencyName} numberOfLines={2}>
                  {item.agencyName}
                </Typography>
                <Typography variant="caption" style={styles.meta}>
                  {formatDateTime(item.scheduledAt)}
                </Typography>
                <Typography variant="caption" style={styles.meta}>
                  {item.tankerSizeLiters}L tanker
                </Typography>
                {item.tankerAmount != null ? (
                  <Typography variant="caption" style={styles.meta}>
                    Amount: {PricingUtils.formatPrice(item.tankerAmount)}
                  </Typography>
                ) : null}
              </View>
            );

            const deleteBtn = !selectionMode ? (
              <TouchableOpacity
                style={styles.tripDeleteBtn}
                onPress={() => confirmDeleteSingle(item)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Delete trip"
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            ) : null;

            const checkbox = selectionMode ? (
              <TouchableOpacity
                style={styles.selectCheckbox}
                onPress={() => toggleTripSelected(item.id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={isSelected ? colors.accent : colors.textSecondary}
                />
              </TouchableOpacity>
            ) : null;

            return (
              <Card style={[styles.tripCard, selectionMode && isSelected && styles.tripCardSelected]}>
                {multiPhoto ? (
                  <View style={styles.tripColumn}>
                    <View style={styles.tripRow}>
                      {checkbox}
                      {thumbScroll}
                      {deleteBtn}
                    </View>
                    {tripInfoBlock}
                  </View>
                ) : (
                  <View style={styles.tripRow}>
                    {checkbox}
                    {thumbScroll}
                    {tripInfoBlock}
                    {deleteBtn}
                  </View>
                )}
              </Card>
            );
          }}
        />

        {selectionMode && selectedIds.length > 0 ? (
          <View style={[styles.selectionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={[styles.selectionDeleteBtn, deleting && styles.selectionDeleteBtnDisabled]}
              onPress={confirmDeleteSelected}
              activeOpacity={0.85}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <Typography variant="body" style={styles.selectionDeleteText}>
                  Delete {selectedIds.length} {selectedIds.length === 1 ? 'trip' : 'trips'}
                </Typography>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="TripDetails"
        customerAccountKind={customerAccountKind}
      />

      <Modal
        visible={breakdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBreakdownVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.breakdownModalRoot}>
          <Pressable
            style={styles.breakdownModalBackdropFill}
            onPress={() => setBreakdownVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss breakdown"
          />
          <View style={[styles.breakdownModalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.breakdownModalHeader}>
              <Typography variant="h2" style={styles.breakdownModalTitle}>
                Trips by agency
              </Typography>
              <TouchableOpacity
                onPress={() => setBreakdownVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close breakdown"
              >
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.breakdownModalScroll} showsVerticalScrollIndicator={false}>
              {tripsByAgency.length > 0 ? (
                <View style={styles.agencyBreakdownList}>
                  {tripsByAgency.map((agency, index) => {
                    const agencyKey = agency.agencyName.toLowerCase();
                    const agencyComplete = isAgencyPaymentComplete(agency.agencyName);
                    const hasBillableAmount = agency.tripsWithAmount > 0;
                    const isLast = index === tripsByAgency.length - 1;
                    return (
                      <TouchableOpacity
                        key={agencyKey}
                        style={[
                          styles.agencyBreakdownRow,
                          !isLast && styles.agencyBreakdownRowDivider,
                        ]}
                        onPress={() => openAgencyBreakdown(agency.agencyName)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${agency.agencyName}, show breakdown`}
                      >
                        <View style={styles.agencySummaryRow}>
                          <View style={styles.agencySummaryInfo}>
                            <Typography
                              variant="body"
                              style={styles.agencyCardTitle}
                              numberOfLines={2}
                            >
                              {agency.agencyName}
                            </Typography>
                            <View style={styles.agencySummaryMetaRow}>
                              <Typography variant="body" style={styles.agencySummaryAmount}>
                                {hasBillableAmount
                                  ? PricingUtils.formatPrice(agency.amountSum)
                                  : '—'}
                              </Typography>
                              <Typography variant="caption" style={styles.agencySummaryTrips}>
                                {agency.count} {agency.count === 1 ? 'trip' : 'trips'}
                              </Typography>
                              {agencyComplete ? (
                                <View style={styles.agencyPaidBadge}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={14}
                                    color={colors.success}
                                  />
                                  <Typography
                                    variant="caption"
                                    style={styles.agencyPaymentCompleteText}
                                  >
                                    Paid
                                  </Typography>
                                </View>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {filteredTrips.length > 0 ? (
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <View style={styles.summaryColLeft}>
                    <Typography variant="body" style={[styles.summaryCellLeft, styles.summaryTotalStrong]}>
                      Total
                    </Typography>
                  </View>
                  <View style={styles.summaryColCenter}>
                    <Typography variant="body" style={[styles.summaryCellCenter, styles.summaryTotalStrong]}>
                      {anyTripHasAmount ? PricingUtils.formatPrice(grandTotalAmount) : '—'}
                    </Typography>
                  </View>
                  <View style={styles.summaryColRight}>
                    <Typography variant="body" style={[styles.summaryCellRight, styles.summaryTotalStrong]}>
                      {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'}
                    </Typography>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={photoPreviewUri != null}
        transparent
        animationType="fade"
        onRequestClose={closePhotoPreview}
        statusBarTranslucent
      >
        <Pressable style={styles.photoModalRoot} onPress={closePhotoPreview}>
          {photoPreviewUri ? (
            <View pointerEvents="none" style={styles.photoModalImage}>
              <Image
                source={{ uri: photoPreviewUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="contain"
              />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.photoModalClose, { top: insets.top + 8 }]}
            onPress={closePhotoPreview}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Ionicons name="close" size={28} color={colors.textLight} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

function createTripDetailsStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerAction: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerActionText: {
    color: colors.accent,
    fontWeight: '600',
  },
  periodTypeToggle: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingTop: UI_CONFIG.spacing.sm,
    paddingBottom: UI_CONFIG.spacing.sm,
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: UI_CONFIG.spacing.sm,
  },
  monthSelector: {
    paddingVertical: UI_CONFIG.spacing.sm,
  },
  monthSelectorContent: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  glassRadioGroup: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: colors.overlaySubtle,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  glassRadioOption: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 12.8,
    paddingHorizontal: 25.6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  glassRadioLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.text,
  },
  glassRadioLabelActive: {
    color: colors.text,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10,
    height: '100%',
  },
  summaryCardWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  summaryCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryHeading: {
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  paymentCompleteInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  paymentCompleteInlineText: {
    color: colors.success,
    fontWeight: '700',
  },
  agencyBreakdownList: {
    backgroundColor: colors.surface,
    borderRadius: UI_CONFIG.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  agencyBreakdownRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  agencyBreakdownRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  agencySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agencySummaryInfo: {
    flex: 1,
    minWidth: 0,
  },
  agencyCardTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  agencySummaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  agencySummaryAmount: {
    color: colors.accent,
    fontWeight: '700',
  },
  agencySummaryTrips: {
    color: colors.textSecondary,
  },
  agencyPaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agencyPaymentCompleteText: {
    color: colors.success,
    fontWeight: '700',
  },
  breakdownModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  breakdownModalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  breakdownModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '85%',
  },
  breakdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingRight: 4,
  },
  breakdownModalTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    marginRight: 12,
  },
  breakdownModalScroll: {
    maxHeight: 480,
  },
  summaryHeaderRow: {
    borderTopWidth: 0,
    paddingTop: 0,
    paddingBottom: 4,
  },
  summaryColHeading: {
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  /** Column wrappers: `Text` + flex + textAlign is unreliable when font weight differs row-to-row. */
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
  summaryTotalRow: {
    marginTop: 4,
    paddingTop: 10,
  },
  summaryTotalStrong: {
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  tripCard: {
    marginBottom: 12,
    padding: 14,
  },
  tripCardSelected: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tripColumn: {
    width: '100%',
  },
  selectCheckbox: {
    justifyContent: 'center',
    marginRight: 10,
    paddingTop: 2,
  },
  tripDeleteBtn: {
    paddingLeft: 4,
    paddingTop: 2,
  },
  /** Single thumbnail: shrink-wrap so text sits beside the image without a dead zone. */
  thumbWrapSingle: {
    maxWidth: 220,
    marginRight: 14,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  /** Multiple photos: strip uses space between checkbox and delete; text is below. */
  thumbWrapMulti: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  thumbStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  thumbCell: {
    position: 'relative',
    marginRight: 8,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },
  thumbEmpty: {
    opacity: 0.35,
  },
  thumbHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    padding: 2,
  },
  tripInfo: {
    flex: 1,
    minWidth: 0,
  },
  tripInfoBelowPhotos: {
    flex: 0,
    width: '100%',
    marginTop: 10,
  },
  agencyName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  meta: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    overflow: 'hidden',
  },
  photoModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    right: 20,
    zIndex: 2,
    padding: 4,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  selectionBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectionDeleteBtn: {
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  selectionDeleteBtnDisabled: {
    opacity: 0.7,
  },
  selectionDeleteText: {
    color: colors.textLight,
    fontWeight: '700',
  },
  });
}

export default TripDetailsScreen;
