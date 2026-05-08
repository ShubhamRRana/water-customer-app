import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { useCustomerBookingsQuery, useCancelBookingMutation } from '../../hooks/queries';
import Card from '../../components/common/Card';
import { Typography, CustomerMenuDrawer, ScreenLoading, ScreenEmpty } from '../../components/common';
import { useRefreshControl } from '../../hooks/useRefreshControl';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';
import AppScreenHeader from '../../components/layouts/AppScreenHeader';
import { Booking, BookingStatus } from '../../types';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { PricingUtils } from '../../utils/pricing';
import { UI_CONFIG } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';

type OrderHistoryScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Orders'>;

interface OrderHistoryScreenProps {
  navigation: OrderHistoryScreenNavigationProp;
}

const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createOrderHistoryStyles(colors), [colors]);
  const { user, logout, customerAccountKind } = useAuthStore();
  const {
    data: bookings = [],
    isPending: isLoading,
    refetch: refetchBookings,
  } = useCustomerBookingsQuery(user?.id);
  const cancelBookingMutation = useCancelBookingMutation();
  
  const refetchBookingsSafe = useCallback(() => refetchBookings(), [refetchBookings]);
  const { refreshing, onRefresh } = useRefreshControl(refetchBookingsSafe, {
    onError: (error) => {
      errorLogger.medium('Failed to refresh customer bookings', error, { userId: user?.id });
      Alert.alert('Error', 'Failed to load your orders. Please try again.');
    },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<BookingStatus | 'all'>('all');
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.id.toLowerCase().includes(query) ||
        booking.deliveryAddress.address.toLowerCase().includes(query) ||
        booking.customerName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === selectedFilter);
    }

    return filtered;
  }, [bookings, searchQuery, selectedFilter]);

  // Calculate counts for each filter
  const filterCounts = useMemo(() => {
    return {
      all: bookings.length,
      pending: bookings.filter(booking => booking.status === 'pending').length,
      accepted: bookings.filter(booking => booking.status === 'accepted').length,
      in_transit: bookings.filter(booking => booking.status === 'in_transit').length,
      delivered: bookings.filter(booking => booking.status === 'delivered').length,
      cancelled: bookings.filter(booking => booking.status === 'cancelled').length,
    };
  }, [bookings]);

  const filterButtons = useMemo(() => [
    { key: 'all', label: 'All', icon: 'list-outline', count: filterCounts.all },
    { key: 'pending', label: 'Pending', icon: 'time-outline', count: filterCounts.pending },
    { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline', count: filterCounts.accepted },
    { key: 'in_transit', label: 'In Transit', icon: 'car-outline', count: filterCounts.in_transit },
    { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline', count: filterCounts.delivered },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', count: filterCounts.cancelled },
  ], [filterCounts]);

  const handleCancelBooking = useCallback(
    (booking: Booking) => {
      if (!user?.id) return;
      if (!booking.canCancel) {
        Alert.alert('Cannot Cancel', 'This booking cannot be cancelled as it has already been accepted by a driver.');
        return;
      }

      Alert.alert(
        'Cancel Booking',
        `Are you sure you want to cancel order #${booking.id.slice(-6)}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelBookingMutation.mutateAsync({
                  bookingId: booking.id,
                  reason: 'Cancelled by customer',
                  customerId: user.id,
                });
                Alert.alert('Success', 'Booking cancelled successfully');
              } catch {
                Alert.alert('Error', 'Failed to cancel booking. Please try again.');
              }
            },
          },
        ]
      );
    },
    [user?.id, cancelBookingMutation],
  );

  const getStatusColor = useCallback((status: BookingStatus) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.accent;
      case 'in_transit': return colors.secondary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  }, []);

  const getStatusText = useCallback((status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  }, []);

  const getStatusIcon = useCallback((status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'in_transit': return 'car-outline';
      case 'delivered': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  }, []);

  const formatDate = useCallback((date: Date | string) => {
    return formatDateTime(date);
  }, []);


  if (isLoading && !bookings.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenLoading message="Loading your orders..." />
      </SafeAreaView>
    );
  }

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'Orders') {
      // Already on Orders, just close menu
      return;
    }
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <AppScreenHeader
        left={{ type: 'menu', onPress: () => setMenuVisible(true) }}
        title="Order History"
        subtitle={`${bookings.length} total orders`}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filterButtons.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.key as BookingStatus | 'all')}
            >
              <Ionicons 
                name={filter.icon as any} 
                size={16} 
                color={selectedFilter === filter.key ? colors.textLight : colors.text} 
              />
              <Typography variant="caption" style={[
                styles.filterButtonText,
                selectedFilter === filter.key && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Typography>
              <View style={[
                styles.countBadge,
                selectedFilter === filter.key && styles.countBadgeActive
              ]}>
                <Typography variant="caption" style={[
                  styles.countText,
                  selectedFilter === filter.key && styles.countTextActive
                ]}>
                  {filter.count}
                </Typography>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>


      {/* Orders List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item: booking }) => (
          <Card 
            style={styles.orderCard}
            onPress={() => navigation.navigate('OrderTracking', { orderId: booking.id })}
          >
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Typography variant="caption" style={styles.orderDate}>{formatDate(booking.scheduledFor || booking.createdAt)}</Typography>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Ionicons 
                    name={getStatusIcon(booking.status)} 
                    size={16} 
                    color={colors.textLight} 
                    style={styles.statusIcon}
                  />
                  <Typography variant="caption" style={styles.statusText}>{getStatusText(booking.status)}</Typography>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="water" size={16} color={colors.accent} />
                  <Typography variant="body" style={styles.detailText}>
                    {booking.tankerSize}L Tanker
                  </Typography>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color={colors.warning} />
                  {booking.totalPrice > 0 ? (
                    <Typography variant="body" style={styles.detailText}>{PricingUtils.formatPrice(booking.totalPrice)}</Typography>
                  ) : (
                    <Typography variant="body" style={[styles.detailText, { fontStyle: 'italic', color: colors.textSecondary }]}>
                      To be determined
                    </Typography>
                  )}
                </View>
                {booking.status === 'delivered' && booking.deliveredAt && (
                  <View style={styles.detailRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Typography variant="body" style={styles.detailText}>
                      Delivered: {formatDate(booking.deliveredAt)}
                    </Typography>
                  </View>
                )}
              </View>

              {booking.driverName && (
                <View style={styles.driverInfo}>
                  <Ionicons name="person" size={16} color={colors.textLight} />
                  <Typography variant="body" style={styles.driverText}>Driver: {booking.driverName}</Typography>
                  {booking.driverPhone && (
                    <Typography variant="caption" style={styles.driverPhone}>{booking.driverPhone}</Typography>
                  )}
                </View>
              )}

              {booking.canCancel && booking.status === 'pending' && (
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleCancelBooking(booking)}
                  >
                    <Ionicons name="close-outline" size={16} color={colors.error} />
                    <Typography variant="caption" style={[styles.actionText, styles.cancelText]}>Cancel</Typography>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
        )}
        style={styles.ordersContainer}
        contentContainerStyle={filteredBookings.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <ScreenEmpty
            icon="receipt-outline"
            title={
              searchQuery || selectedFilter !== 'all'
                ? 'No matching orders'
                : 'No orders yet'
            }
            message={
              searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Book your first tanker to get started'
            }
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
      </View>
      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Orders"
        customerAccountKind={customerAccountKind}
      />
    </SafeAreaView>
  );
};

function createOrderHistoryStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  filterSection: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 60,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: colors.textLight,
  },
  countBadge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: colors.overlayMedium,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  countTextActive: {
    color: colors.textLight,
  },
  ordersContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  orderCard: {
    marginBottom: 16,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  driverText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 8,
    fontWeight: '500',
  },
  driverPhone: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 8,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  cancelButton: {
    backgroundColor: colors.surfaceLight,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 4,
  },
  cancelText: {
    color: colors.error,
  },
  });
}

export default OrderHistoryScreen;