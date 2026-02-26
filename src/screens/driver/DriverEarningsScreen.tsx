import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, LoadingSpinner } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { DriverDashboardStats, Booking } from '../../types';
import { PricingUtils } from '../../utils/pricing';
import { errorLogger } from '../../utils/errorLogger';


const DriverEarningsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { isLoading, fetchDriverBookings, fetchDriverBookingsForEarnings } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [earningsStats, setEarningsStats] = useState<DriverDashboardStats | null>(null);

  const calculateEarningsStats = useCallback(async () => {
    if (!user?.id) {
      setEarningsStats({
        totalEarnings: 0,
        completedOrders: 0,
        pendingOrders: 0,
        activeOrders: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        averageRating: 0,
        totalRatings: 0,
        isOnline: true,
        lastActiveAt: new Date(),
      });
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch earnings with date filtering - optimized server-side queries
    const [todayBookings, weeklyBookings, monthlyBookings, totalBookings] = await Promise.all([
      fetchDriverBookingsForEarnings(user.id, { startDate: today }),
      fetchDriverBookingsForEarnings(user.id, { startDate: weekStart }),
      fetchDriverBookingsForEarnings(user.id, { startDate: monthStart }),
      fetchDriverBookingsForEarnings(user.id), // All completed bookings
    ]);

    // Fetch order counts (lightweight queries with limits)
    await Promise.all([
      fetchDriverBookings(user.id, { status: ['pending'], limit: 100 }),
      fetchDriverBookings(user.id, { status: ['accepted', 'in_transit'], limit: 100 }),
    ]);

    // Get counts from store after fetching
    const { bookings } = useBookingStore.getState();
    const pendingCount = bookings.filter(b => b.status === 'pending' && b.driverId === user.id).length;
    const activeCount = bookings.filter(b => 
      (b.status === 'accepted' || b.status === 'in_transit') && b.driverId === user.id
    ).length;

    // Calculate earnings from pre-filtered results
    const todayEarnings = todayBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const weeklyEarnings = weeklyBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const monthlyEarnings = monthlyBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const totalEarnings = totalBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

    setEarningsStats({
      totalEarnings,
      completedOrders: totalBookings.length,
      pendingOrders: pendingCount,
      activeOrders: activeCount,
      todayEarnings,
      weeklyEarnings,
      monthlyEarnings,
      averageRating: 4.8, // Mock rating
      totalRatings: totalBookings.length,
      isOnline: true,
      lastActiveAt: new Date(),
    });
  }, [user?.id, fetchDriverBookingsForEarnings, fetchDriverBookings]);

  const loadDriverData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Calculate earnings with optimized date-filtered queries
      await calculateEarningsStats();
    } catch (error) {
      errorLogger.medium('Failed to load driver earnings data', error, { userId: user.id });
    }
  }, [user?.id, calculateEarningsStats]);

  useEffect(() => {
    if (user?.id) {
      loadDriverData();
    }
  }, [user?.id, loadDriverData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadDriverData();
      }
    }, [user?.id, loadDriverData])
  );

  // Note: Removed the useEffect that recalculated on bookings change
  // Earnings are now calculated on-demand with optimized queries

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverData();
    setRefreshing(false);
  };

  const formatCurrency = useCallback((amount: number) => {
    return PricingUtils.formatPrice(amount);
  }, []);

  if (isLoading && !earningsStats) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Typography variant="body" style={styles.loadingText}>
          Loading earnings data...
        </Typography>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="h1" style={styles.headerTitle}>
          Earnings
        </Typography>
        <Typography variant="body" style={styles.headerSubtitle}>
          Track your delivery earnings
        </Typography>
      </View>

      {/* Earnings Cards */}
      <View style={styles.earningsContainer}>
        {/* Today's Earnings */}
        <Card style={styles.earningsCard}>
          <View style={styles.earningsCardHeader}>
            <Ionicons name="sunny-outline" size={24} color={UI_CONFIG.colors.warning} />
            <Typography variant="h3" style={styles.earningsCardTitle}>
              Today
            </Typography>
          </View>
          <Typography variant="h1" style={styles.earningsCardAmount}>
            {formatCurrency(earningsStats?.todayEarnings || 0)}
          </Typography>
        </Card>

        {/* This Week's Earnings */}
        <Card style={styles.earningsCard}>
          <View style={styles.earningsCardHeader}>
            <Ionicons name="calendar-outline" size={24} color={UI_CONFIG.colors.accent} />
            <Typography variant="h3" style={styles.earningsCardTitle}>
              This Week
            </Typography>
          </View>
          <Typography variant="h1" style={styles.earningsCardAmount}>
            {formatCurrency(earningsStats?.weeklyEarnings || 0)}
          </Typography>
        </Card>

        {/* This Month's Earnings */}
        <Card style={styles.earningsCard}>
          <View style={styles.earningsCardHeader}>
            <Ionicons name="calendar-number-outline" size={24} color={UI_CONFIG.colors.success} />
            <Typography variant="h3" style={styles.earningsCardTitle}>
              This Month
            </Typography>
          </View>
          <Typography variant="h1" style={styles.earningsCardAmount}>
            {formatCurrency(earningsStats?.monthlyEarnings || 0)}
          </Typography>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerTitle: {
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: UI_CONFIG.colors.textSecondary,
  },
  earningsContainer: {
    padding: 24,
    gap: 16,
  },
  earningsCard: {
    padding: 20,
    marginBottom: 0,
  },
  earningsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  earningsCardTitle: {
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  earningsCardAmount: {
    color: UI_CONFIG.colors.text,
    fontWeight: '700',
  },
});

export default DriverEarningsScreen;