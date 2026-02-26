import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { Typography, AdminMenuDrawer } from '../../components/common';
import { AdminRoute } from '../../components/common/AdminMenuDrawer';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import {
  calculateMonthlyData,
  calculateDailyBreakdown,
  calculateYearlyData,
  calculateMonthlyBreakdown,
} from '../../utils/reportCalculations';
import { errorLogger } from '../../utils/errorLogger';
import { exportReportToExcel } from '../../utils/excelExport';

type ReportsScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Reports'>;

const { width } = Dimensions.get('window');

const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const { bookings, fetchAllBookings } = useBookingStore();
  const { logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Animation values for glass gliders
  const periodTypeGliderAnim = useRef(new Animated.Value(0)).current;
  const monthGliderAnim = useRef(new Animated.Value(0)).current;
  const yearGliderAnim = useRef(new Animated.Value(0)).current;
  
  // Width measurements for glider positioning
  const [periodTypeOptionWidth, setPeriodTypeOptionWidth] = useState(0);
  const [monthOptionWidth, setMonthOptionWidth] = useState(0);
  const [yearOptionWidth, setYearOptionWidth] = useState(0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Generate year options (current year + 4 previous years)
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  const availableYears = getAvailableYears();

  useEffect(() => {
    loadReportData();
  }, []);

  // Animate glider when periodType changes
  useEffect(() => {
    if (periodTypeOptionWidth > 0) {
      Animated.spring(periodTypeGliderAnim, {
        toValue: periodType === 'month' ? 0 : periodTypeOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [periodType, periodTypeOptionWidth]);

  // Animate glider when selectedMonth changes
  useEffect(() => {
    if (monthOptionWidth > 0) {
      Animated.spring(monthGliderAnim, {
        toValue: selectedMonth * monthOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [selectedMonth, monthOptionWidth]);

  // Animate glider when selectedYear changes
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
  }, [selectedYear, yearOptionWidth]);


  const loadReportData = async () => {
    try {
      await fetchAllBookings();
    } catch (error) {
          }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const monthlyData = periodType === 'month' 
    ? calculateMonthlyData(bookings, selectedYear, selectedMonth)
    : calculateYearlyData(bookings, selectedYear);
  const totalRevenue = monthlyData.totalRevenue;
  const totalOrders = monthlyData.totalOrders;
  const dailyBreakdown = periodType === 'month' 
    ? calculateDailyBreakdown(bookings, selectedYear, selectedMonth)
    : [];
  const monthlyBreakdown = periodType === 'year' 
    ? calculateMonthlyBreakdown(bookings, selectedYear)
    : [];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: AdminRoute) => {
    if (route === 'Reports') {
      // Already on Reports, just close menu
      return;
    }
    navigation.navigate(route);
  };

  const handleDownloadExcel = async () => {
    try {
      await exportReportToExcel(
        periodType,
        selectedYear,
        selectedMonth,
        totalRevenue,
        totalOrders,
        dailyBreakdown,
        monthlyBreakdown
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
              <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.title}>
                Reports & Analytics
              </Typography>
              <Typography variant="body" style={styles.subtitle}>
                Comprehensive business insights
              </Typography>
            </View>
            <TouchableOpacity 
              style={styles.downloadButton} 
              onPress={handleDownloadExcel}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Type Toggle */}
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
                  periodType === 'month' && styles.glassRadioLabelActive
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
                  periodType === 'year' && styles.glassRadioLabelActive
                ]}
              >
                Year
              </Typography>
            </TouchableOpacity>
            {periodTypeOptionWidth > 0 && (
              <Animated.View
                style={[
                  styles.glassGlider,
                  {
                    width: periodTypeOptionWidth,
                    transform: [{
                      translateX: periodTypeGliderAnim,
                    }],
                  },
                ]}
              />
            )}
          </View>
        </View>

        {/* Month Selector */}
        {periodType === 'month' && (
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
                        selectedMonth === index && styles.glassRadioLabelActive
                      ]}
                    >
                      {month}
                    </Typography>
                  </TouchableOpacity>
                ))}
                {monthOptionWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.glassGlider,
                      {
                        width: monthOptionWidth,
                        transform: [{
                          translateX: monthGliderAnim,
                        }],
                      },
                    ]}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Year Selector */}
        {periodType === 'year' && (
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
                        selectedYear === year && styles.glassRadioLabelActive
                      ]}
                    >
                      {year}
                    </Typography>
                  </TouchableOpacity>
                ))}
                {yearOptionWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.glassGlider,
                      {
                        width: yearOptionWidth,
                        transform: [{
                          translateX: yearGliderAnim,
                        }],
                      },
                    ]}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summarySection}>
          <Typography variant="h2" style={styles.summaryTitle}>
            {periodType === 'month' ? 'Monthly Summary' : `Yearly Summary - ${selectedYear}`}
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
                Total Revenue
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

        {/* Daily Breakdown - Month View */}
        {periodType === 'month' && (
          <View style={styles.dailySection}>
            <View style={styles.dailyHeader}>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderLeft]}>
                Day
              </Typography>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderCenter]}>
                Revenue
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
        )}

        {/* Monthly Breakdown - Year View */}
        {periodType === 'year' && (
          <View style={styles.dailySection}>
            <View style={styles.dailyHeader}>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderLeft]}>
                Month
              </Typography>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderCenter]}>
                Revenue
              </Typography>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderRight]}>
                Orders
              </Typography>
            </View>
            {monthlyBreakdown.map((item, index) => (
              <View key={index} style={styles.dailyRow}>
                <Typography variant="body" style={styles.dailyDay}>
                  {item.month}
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
        )}

      </ScrollView>
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Reports"
      />
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
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  periodTypeToggle: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: UI_CONFIG.spacing.md,
  },
  monthSelector: {
    paddingVertical: UI_CONFIG.spacing.md,
  },
  monthSelectorContent: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  glassRadioGroup: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
    height: '100%',
  },
  summarySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.lg,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
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
    color: UI_CONFIG.colors.primary,
    textAlign: 'center',
    width: '100%',
  },
  summaryLabel: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
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
    borderBottomColor: UI_CONFIG.colors.border,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  dailyHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
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
    backgroundColor: UI_CONFIG.colors.background,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  dailyDay: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.primary,
  },
  dailyRevenue: {
    flex: 1,
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    textAlign: 'center',
  },
  dailyOrders: {
    flex: 1,
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    textAlign: 'right',
  },
});

export default ReportsScreen;