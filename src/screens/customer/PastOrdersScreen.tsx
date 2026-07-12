import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCustomerBookingsQuery } from '../../hooks/queries';
import { useAuthStore } from '../../store/authStore';
import {
  Typography,
  CustomerMenuDrawer,
  MonthYearFilterRow,
  ScreenLoading,
  ScreenEmpty,
} from '../../components/common';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';
import { UI_CONFIG } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { PricingUtils } from '../../utils/pricing';
import {
  calculateMonthlyData,
  calculateDailyBreakdown,
} from '../../utils/reportCalculations';
import { errorLogger } from '../../utils/errorLogger';
import { exportReportToExcel } from '../../utils/excelExport';
import Card from '../../components/common/Card';
import { formatDateTime } from '../../utils/dateUtils';
import {
  getBookingPaymentChip,
  getBookingPaymentChipLabel,
} from '../../utils/paymentDisplay';
import type { Booking } from '../../types';

type PastOrdersScreenNavigationProp = StackNavigationProp<AppStackParamList, 'PastOrders'>;

interface PastOrdersScreenProps {
  navigation: PastOrdersScreenNavigationProp;
}

const PastOrdersScreen: React.FC<PastOrdersScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createPastOrdersStyles(colors), [colors]);
  const { user, logout, customerAccountKind } = useAuthStore();
  const {
    data: bookings = [],
    isPending: isLoading,
    refetch: refetchBookings,
  } = useCustomerBookingsQuery(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, []);

  const loadReportData = async () => {
    try {
      await refetchBookings();
    } catch (error) {
      errorLogger.medium('Failed to load past orders', error, { userId: user?.id });
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'PastOrders') {
      // Already on PastOrders, just close menu
      return;
    }
    navigation.navigate(route);
  };


  const monthlyData = calculateMonthlyData(bookings, selectedYear, selectedMonth);
  const totalRevenue = monthlyData.totalRevenue;
  const totalOrders = monthlyData.totalOrders;
  const dailyBreakdown = calculateDailyBreakdown(bookings, selectedYear, selectedMonth);

  const monthlyOrders = useMemo(() => {
    return bookings
      .filter((booking) => {
        const date = booking.scheduledFor || booking.createdAt;
        const d = date instanceof Date ? date : new Date(date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      })
      .sort((a, b) => {
        const aDate = a.scheduledFor || a.createdAt;
        const bDate = b.scheduledFor || b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [bookings, selectedYear, selectedMonth]);

  const getPaymentChipColor = (booking: Booking) => {
    const chip = getBookingPaymentChip(booking);
    switch (chip) {
      case 'paid':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'unpaid':
        return colors.warning;
      case 'cod':
        return colors.secondary;
      case 'refunded':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      await exportReportToExcel(
        'month',
        selectedYear,
        selectedMonth,
        totalRevenue,
        totalOrders,
        dailyBreakdown,
        [],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export report. Please try again.');
      errorLogger.medium('Failed to export report', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !bookings.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenLoading message="Loading past orders..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Open menu"
              accessibilityRole="button"
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.title}>
                Past Orders
              </Typography>
              <Typography variant="body" style={styles.subtitle}>
                Your order history & analytics
              </Typography>
            </View>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownloadExcel}
              activeOpacity={0.7}
              disabled={isExporting}
              accessibilityLabel="Download report"
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <MonthYearFilterRow
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          availableYears={availableYears}
        />

        {/* Summary */}
        <View style={styles.summarySection}>
          <Typography variant="h2" style={styles.summaryTitle}>
            {`Monthly Summary — ${monthLabels[selectedMonth]} ${selectedYear}`}
          </Typography>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <View style={styles.summaryValueContainer}>
                <Typography 
                  variant="h1" 
                  style={styles.summaryValue} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit 
                  minimumFontScale={0.6}
                >
                  {PricingUtils.formatPrice(totalRevenue)}
                </Typography>
              </View>
              <Typography variant="body" style={styles.summaryLabel}>
                Total Spent
              </Typography>
            </View>
            <View style={styles.summaryMetric}>
              <View style={styles.summaryValueContainer}>
                <Typography 
                  variant="h1" 
                  style={styles.summaryValue} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit 
                  minimumFontScale={0.6}
                >
                  {PricingUtils.formatNumber(totalOrders)}
                </Typography>
              </View>
              <Typography variant="body" style={styles.summaryLabel}>
                Total Orders
              </Typography>
            </View>
          </View>
        </View>

        <View style={styles.dailySection}>
          <View style={styles.dailyHeader}>
            <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderLeft]}>
              Day
            </Typography>
            <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderCenter]}>
              Spent
            </Typography>
            <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderRight]}>
              Orders
            </Typography>
          </View>
          {dailyBreakdown.map((item, index) => (
            <View key={index} style={styles.dailyRow}>
              <Typography variant="body" style={styles.dailyDay}>
                {item.day}
              </Typography>
              <Typography variant="body" style={styles.dailyRevenue}>
                {PricingUtils.formatPrice(item.revenue)}
              </Typography>
              <Typography variant="body" style={styles.dailyOrders}>
                {item.orders}
              </Typography>
            </View>
          ))}
        </View>

        <View style={styles.ordersSection}>
          <Typography variant="h3" style={styles.ordersSectionTitle}>
            Orders this month
          </Typography>
          {monthlyOrders.length === 0 ? (
            <ScreenEmpty
              icon="receipt-outline"
              title={`No orders in ${monthLabels[selectedMonth]} ${selectedYear}`}
              compact
            />
          ) : (
            monthlyOrders.map((booking) => (
              <Card
                key={booking.id}
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderTracking', { orderId: booking.id })}
              >
                <View style={styles.orderCardHeader}>
                  <Typography variant="body" style={styles.orderCardDate}>
                    {formatDateTime(booking.scheduledFor || booking.createdAt)}
                  </Typography>
                  <View style={[styles.paymentChip, { backgroundColor: getPaymentChipColor(booking) }]}>
                    <Typography variant="caption" style={styles.paymentChipText}>
                      {getBookingPaymentChipLabel(getBookingPaymentChip(booking))}
                    </Typography>
                  </View>
                </View>
                <Typography variant="body" style={styles.orderCardDetail}>
                  {booking.tankerSize}L · {booking.deliveryAddress.address}
                </Typography>
                <View style={styles.orderCardFooter}>
                  <Typography variant="body" style={styles.orderCardAmount}>
                    {booking.totalPrice > 0
                      ? PricingUtils.formatPrice(booking.totalPrice)
                      : 'Amount at delivery'}
                  </Typography>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="PastOrders"
        customerAccountKind={customerAccountKind}
        userName={user?.name}
      />
    </SafeAreaView>
  );
};

function createPastOrdersStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: UI_CONFIG.spacing.sm,
    marginRight: UI_CONFIG.spacing.md,
  },
  downloadButton: {
    padding: UI_CONFIG.spacing.sm,
    marginLeft: UI_CONFIG.spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: UI_CONFIG.fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: UI_CONFIG.spacing.xs,
  },
  subtitle: {
    fontSize: UI_CONFIG.fontSize.md,
    color: colors.textSecondary,
  },
  summarySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.lg,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: UI_CONFIG.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: UI_CONFIG.spacing.lg,
  },
  summaryMetrics: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  summaryMetric: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: UI_CONFIG.spacing.sm,
    maxWidth: '50%',
  },
  summaryValueContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: UI_CONFIG.spacing.xs,
    paddingHorizontal: UI_CONFIG.spacing.xs,
    minHeight: 40,
  },
  summaryValue: {
    fontSize: UI_CONFIG.fontSize.xxl, // was 28, nearest token 24 (16.7% diff)
    fontWeight: 'bold',
    color: colors.accent,
    textAlign: 'center',
    width: '100%',
  },
  summaryLabel: {
    fontSize: UI_CONFIG.fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  dailySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.lg,
  },
  dailyHeader: {
    flexDirection: 'row',
    paddingVertical: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  dailyHeaderText: {
    fontSize: UI_CONFIG.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  dailyHeaderLeft: {
    flex: 1,
    textAlign: 'left',
  },
  dailyHeaderCenter: {
    flex: 1,
    textAlign: 'center',
  },
  dailyHeaderRight: {
    flex: 1,
    textAlign: 'right',
  },
  dailyRow: {
    flexDirection: 'row',
    paddingVertical: UI_CONFIG.spacing.md,
    paddingHorizontal: UI_CONFIG.spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: UI_CONFIG.spacing.xs,
    alignItems: 'center',
  },
  dailyDay: {
    flex: 1,
    fontSize: UI_CONFIG.fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  dailyRevenue: {
    flex: 1,
    fontSize: UI_CONFIG.fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  dailyOrders: {
    flex: 1,
    fontSize: UI_CONFIG.fontSize.sm,
    color: colors.text,
    textAlign: 'right',
  },
  ordersSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.lg,
  },
  ordersSectionTitle: {
    fontSize: UI_CONFIG.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  emptyOrdersText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  orderCard: {
    marginBottom: UI_CONFIG.spacing.sm,
    padding: UI_CONFIG.spacing.md,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.sm,
  },
  orderCardDate: {
    fontSize: UI_CONFIG.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  paymentChip: {
    paddingHorizontal: UI_CONFIG.spacing.sm, // was 10, nearest token 8 (25% diff)
    paddingVertical: UI_CONFIG.spacing.xs,
    borderRadius: 12,
  },
  paymentChipText: {
    fontSize: UI_CONFIG.fontSize.xs, // was 11, nearest token 12 (8.3% diff)
    fontWeight: '600',
    color: colors.textLight,
  },
  orderCardDetail: {
    fontSize: UI_CONFIG.fontSize.sm,
    color: colors.text,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  orderCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCardAmount: {
    fontSize: UI_CONFIG.fontSize.md,
    fontWeight: '600',
    color: colors.accent,
  },
  bottomSpacing: {
    height: 40,
  },
  });
}

export default PastOrdersScreen;
