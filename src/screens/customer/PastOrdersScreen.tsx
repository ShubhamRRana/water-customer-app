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
import { Typography, CustomerMenuDrawer, MonthYearFilterRow } from '../../components/common';
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

type PastOrdersScreenNavigationProp = StackNavigationProp<AppStackParamList, 'PastOrders'>;

interface PastOrdersScreenProps {
  navigation: PastOrdersScreenNavigationProp;
}

const PastOrdersScreen: React.FC<PastOrdersScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createPastOrdersStyles(colors), [colors]);
  const { user, logout, customerAccountKind } = useAuthStore();
  const { data: bookings = [], refetch: refetchBookings } = useCustomerBookingsQuery(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
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

  const handleDownloadExcel = async () => {
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
    }
  };

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
    padding: 8,
    marginRight: 12,
  },
  downloadButton: {
    padding: 8,
    marginLeft: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summarySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.lg,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
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
    paddingHorizontal: 8,
    maxWidth: '50%',
  },
  summaryValueContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.accent,
    textAlign: 'center',
    width: '100%',
  },
  summaryLabel: {
    fontSize: 14,
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
    fontSize: 14,
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
    marginBottom: 4,
    alignItems: 'center',
  },
  dailyDay: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  dailyRevenue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  dailyOrders: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 40,
  },
  });
}

export default PastOrdersScreen;
