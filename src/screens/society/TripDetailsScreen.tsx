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
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography, CustomerMenuDrawer, Button } from '../../components/common';
import { SocietyTrip } from '../../types';
import { societyPaymentPeriodKey, type CustomerStackParamList } from '../../navigation/rootNavigation';
import { BOOKING_CONFIG, UI_CONFIG } from '../../constants/config';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';
import { PricingUtils } from '../../utils/pricing';
import { SocietyTripService } from '../../services/societyTrip.service';

type TripDetailsNavigationProp = StackNavigationProp<CustomerStackParamList, 'TripDetails'>;

interface TripDetailsScreenProps {
  navigation: TripDetailsNavigationProp;
}

function filterTripsByPeriod(
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

const TripDetailsScreen: React.FC<TripDetailsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, customerAccountKind } = useAuthStore();
  const [trips, setTrips] = useState<SocietyTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [tankerBreakdownVisible, setTankerBreakdownVisible] = useState(false);
  const [completedPaymentPeriodKeys, setCompletedPaymentPeriodKeys] = useState<string[]>([]);
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
      const [list, keys] = await Promise.all([
        SocietyTripService.listTripsForCustomer(user.id),
        SocietyTripService.listCompletedPaymentPeriodKeys(user.id),
      ]);
      setTrips(list);
      setCompletedPaymentPeriodKeys(keys);
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

  const paymentCompleteForCurrentPeriod = useMemo(() => {
    const key = societyPaymentPeriodKey({
      periodType,
      year: selectedYear,
      month: selectedMonth,
    });
    return completedPaymentPeriodKeys.includes(key);
  }, [completedPaymentPeriodKeys, periodType, selectedYear, selectedMonth]);

  const openSettlePayment = useCallback(() => {
    setTankerBreakdownVisible(false);
    navigation.navigate('SettlePaymentPlaceholder', {
      periodType,
      year: selectedYear,
      month: selectedMonth,
    });
  }, [navigation, periodType, selectedYear, selectedMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTripDetailsData();
    } catch {
      Alert.alert('Error', 'Could not load trip details. Try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (
    route: 'Home' | 'Orders' | 'Profile' | 'PastOrders' | 'TripDetails',
  ) => {
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

  const tripsByTankerSize = useMemo(() => {
    const bucket = new Map<
      number,
      { count: number; amountSum: number; tripsWithAmount: number }
    >();
    for (const t of filteredTrips) {
      const prev = bucket.get(t.tankerSizeLiters) ?? {
        count: 0,
        amountSum: 0,
        tripsWithAmount: 0,
      };
      prev.count += 1;
      if (t.tankerAmount != null && Number.isFinite(t.tankerAmount)) {
        prev.amountSum += t.tankerAmount;
        prev.tripsWithAmount += 1;
      }
      bucket.set(t.tankerSizeLiters, prev);
    }
    const defaultSizes = BOOKING_CONFIG.defaultTankerSizes.map((d) => d.size);
    const allLiters = [...new Set([...defaultSizes, ...bucket.keys()])].sort((a, b) => a - b);
    return allLiters.map((liters) => {
      const b = bucket.get(liters);
      return {
        liters,
        count: b?.count ?? 0,
        amountSum: b?.amountSum ?? 0,
        tripsWithAmount: b?.tripsWithAmount ?? 0,
      };
    });
  }, [filteredTrips]);

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
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading trip details…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="h2" style={styles.title}>
              {selectionMode ? 'Select trips' : 'Trip details'}
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {selectionMode
                ? `${selectedIds.length} selected`
                : `${filteredTrips.length} ${filteredTrips.length === 1 ? 'trip' : 'trips'} logged`}
            </Typography>
          </View>
          {filteredTrips.length > 0 ? (
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
            <View style={styles.headerActionPlaceholder} />
          )}
        </View>

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
          onPress={() => setTankerBreakdownVisible(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Trips by tanker size, show breakdown"
        >
          <Card style={styles.summaryCard}>
            <View style={styles.summaryCardHeaderRow}>
              <Typography variant="caption" style={styles.summaryHeading}>
                Trips by tanker size
              </Typography>
              <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
            </View>
            {paymentCompleteForCurrentPeriod ? (
              <View style={styles.paymentCompleteInline}>
                <Ionicons name="checkmark-circle" size={18} color={UI_CONFIG.colors.success} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI_CONFIG.colors.accent} />
          }
          ListEmptyComponent={
            <Card style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyTitle}>
                {trips.length === 0 ? 'No trips yet' : 'No trips in this period'}
              </Typography>
              <Typography variant="caption" style={styles.emptySubtext}>
                {trips.length === 0
                  ? 'Trips you add from Home appear here.'
                  : 'Try another month or year, or switch between Month and Year.'}
              </Typography>
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
                        <Ionicons name="expand-outline" size={14} color={UI_CONFIG.colors.textLight} />
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
                <Ionicons name="trash-outline" size={22} color={UI_CONFIG.colors.error} />
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
                  color={isSelected ? UI_CONFIG.colors.accent : UI_CONFIG.colors.textSecondary}
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
                <ActivityIndicator color={UI_CONFIG.colors.textLight} />
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
        visible={tankerBreakdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTankerBreakdownVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.breakdownModalRoot}>
          <Pressable
            style={styles.breakdownModalBackdropFill}
            onPress={() => setTankerBreakdownVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss breakdown"
          />
          <View style={[styles.breakdownModalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.breakdownModalHeader}>
              <Typography variant="h2" style={styles.breakdownModalTitle}>
                Trips by tanker size
              </Typography>
              <TouchableOpacity
                onPress={() => setTankerBreakdownVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close breakdown"
              >
                <Ionicons name="close" size={26} color={UI_CONFIG.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.breakdownModalScroll} showsVerticalScrollIndicator={false}>
              {tripsByTankerSize.map(({ liters, count, amountSum, tripsWithAmount }) => (
                <View key={liters} style={styles.summaryRow}>
                  <View style={styles.summaryColLeft}>
                    <Typography variant="body" style={styles.summaryCellLeft}>
                      {liters.toLocaleString()}L
                    </Typography>
                  </View>
                  <View style={styles.summaryColCenter}>
                    <Typography variant="body" style={styles.summaryCellCenter}>
                      {count > 0 && tripsWithAmount > 0
                        ? PricingUtils.formatPrice(amountSum)
                        : '—'}
                    </Typography>
                  </View>
                  <View style={styles.summaryColRight}>
                    <Typography variant="body" style={styles.summaryCellRight}>
                      {count} {count === 1 ? 'trip' : 'trips'}
                    </Typography>
                  </View>
                </View>
              ))}
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
            {paymentCompleteForCurrentPeriod ? (
              <View style={styles.settlePaymentFooter}>
                <View style={styles.paymentCompleteBanner}>
                  <Ionicons name="checkmark-circle" size={22} color={UI_CONFIG.colors.success} />
                  <Typography variant="body" style={styles.paymentCompleteBannerText}>
                    Payment Complete
                  </Typography>
                </View>
              </View>
            ) : (
              <View style={styles.settlePaymentFooter}>
                <Button
                  title="Settle Payment"
                  onPress={openSettlePayment}
                  variant="primary"
                  style={styles.settlePaymentButton}
                />
              </View>
            )}
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
            <Ionicons name="close" size={28} color={UI_CONFIG.colors.textLight} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerAction: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerActionPlaceholder: {
    minWidth: 64,
  },
  headerActionText: {
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
  },
  title: {
    color: UI_CONFIG.colors.text,
    fontWeight: '700',
  },
  subtitle: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 4,
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
    backgroundColor: UI_CONFIG.colors.overlaySubtle,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: UI_CONFIG.colors.shadow,
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
    color: UI_CONFIG.colors.text,
  },
  glassRadioLabelActive: {
    color: UI_CONFIG.colors.text,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: UI_CONFIG.colors.accent,
    shadowColor: UI_CONFIG.colors.accent,
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
    color: UI_CONFIG.colors.textSecondary,
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
    color: UI_CONFIG.colors.success,
    fontWeight: '700',
  },
  settlePaymentFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_CONFIG.colors.border,
  },
  settlePaymentButton: {
    alignSelf: 'stretch',
  },
  paymentCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  paymentCompleteBannerText: {
    color: UI_CONFIG.colors.success,
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
    backgroundColor: UI_CONFIG.colors.surface,
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
    color: UI_CONFIG.colors.text,
    fontWeight: '700',
    marginRight: 12,
  },
  breakdownModalScroll: {
    maxHeight: 480,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_CONFIG.colors.border,
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
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  summaryCellCenter: {
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
  },
  summaryCellRight: {
    color: UI_CONFIG.colors.textSecondary,
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
    borderColor: UI_CONFIG.colors.accent,
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
    backgroundColor: UI_CONFIG.colors.surfaceLight,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 6,
  },
  meta: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    paddingHorizontal: 16,
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
    backgroundColor: UI_CONFIG.colors.surface,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  selectionDeleteBtn: {
    backgroundColor: UI_CONFIG.colors.error,
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
    color: UI_CONFIG.colors.textLight,
    fontWeight: '700',
  },
});

export default TripDetailsScreen;
