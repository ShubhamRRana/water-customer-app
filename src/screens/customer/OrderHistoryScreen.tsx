import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useBookingStore } from '../../store/bookingStore';
import { isCustomerUser } from '../../types';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography, CustomerMenuDrawer } from '../../components/common';
import { Booking, BookingStatus } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { PricingUtils } from '../../utils/pricing';
import { UI_CONFIG } from '../../constants/config';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';

type OrderHistoryScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'Orders'>;

interface OrderHistoryScreenProps {
  navigation: OrderHistoryScreenNavigationProp;
}

const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const { bookings, isLoading, fetchCustomerBookings, cancelBooking } = useBookingStore();
  
  const [refreshing, setRefreshing] = useState(false);
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

  useEffect(() => {
    if (user?.id) {
      loadBookings();
    }
  }, [user?.id]);

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

  const loadBookings = async () => {
    if (!user?.id) return;
    try {
      await fetchCustomerBookings(user.id);
    } catch (error) {
      errorLogger.medium('Failed to load customer bookings', error, { userId: user.id });
      Alert.alert('Error', 'Failed to load your orders. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBookings();
    } catch (error) {
      errorLogger.medium('Failed to refresh customer bookings', error, { userId: user?.id });
      // Error already handled in loadBookings, no need to show alert again
    } finally {
      setRefreshing(false);
    }
  };

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

  const handleCancelBooking = useCallback((booking: Booking) => {
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
              await cancelBooking(booking.id, 'Cancelled by customer');
              Alert.alert('Success', 'Booking cancelled successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const getStatusColor = useCallback((status: BookingStatus) => {
    switch (status) {
      case 'pending': return UI_CONFIG.colors.warning;
      case 'accepted': return UI_CONFIG.colors.primary;
      case 'in_transit': return UI_CONFIG.colors.secondary;
      case 'delivered': return UI_CONFIG.colors.success;
      case 'cancelled': return UI_CONFIG.colors.error;
      default: return UI_CONFIG.colors.textSecondary;
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
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Loading your orders...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  const handleMenuNavigate = (route: 'Home' | 'Orders' | 'Profile' | 'PastOrders') => {
    if (route === 'Orders') {
      // Already on Orders, just close menu
      return;
    }
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Typography variant="h2" style={styles.title}>Order History</Typography>
          <Typography variant="body" style={styles.subtitle}>{bookings.length} total orders</Typography>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={UI_CONFIG.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={UI_CONFIG.colors.textSecondary} />
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
                color={selectedFilter === filter.key ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.primary} 
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
                  <Typography variant="body" style={styles.orderId}>Order #{booking.id.slice(-6)}</Typography>
                  <Typography variant="caption" style={styles.orderDate}>{formatDate(booking.scheduledFor || booking.createdAt)}</Typography>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Ionicons 
                    name={getStatusIcon(booking.status)} 
                    size={16} 
                    color={UI_CONFIG.colors.textLight} 
                    style={styles.statusIcon}
                  />
                  <Typography variant="caption" style={styles.statusText}>{getStatusText(booking.status)}</Typography>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="water" size={16} color={UI_CONFIG.colors.primary} />
                  <Typography variant="body" style={styles.detailText}>
                    {booking.tankerSize}L Tanker
                  </Typography>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color={UI_CONFIG.colors.success} />
                  <Typography variant="body" style={styles.detailText}>
                    {booking.deliveryAddress.address}
                  </Typography>
                </View>
                {user && isCustomerUser(user) && user.savedAddresses && user.savedAddresses.length > 0 && (() => {
                  const defaultAddress = user.savedAddresses.find(addr => addr.isDefault) || user.savedAddresses[0];
                  return defaultAddress && defaultAddress.address !== booking.deliveryAddress.address ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="home" size={16} color={UI_CONFIG.colors.primary} />
                      <Typography variant="body" style={styles.detailText}>
                        Profile: {defaultAddress.address}
                      </Typography>
                    </View>
                  ) : null;
                })()}
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color={UI_CONFIG.colors.warning} />
                  {booking.totalPrice > 0 ? (
                    <Typography variant="body" style={styles.detailText}>{PricingUtils.formatPrice(booking.totalPrice)}</Typography>
                  ) : (
                    <Typography variant="body" style={[styles.detailText, { fontStyle: 'italic', color: UI_CONFIG.colors.textSecondary }]}>
                      To be determined
                    </Typography>
                  )}
                </View>
                {booking.status === 'delivered' && booking.deliveredAt && (
                  <View style={styles.detailRow}>
                    <Ionicons name="checkmark-circle" size={16} color={UI_CONFIG.colors.success} />
                    <Typography variant="body" style={styles.detailText}>
                      Delivered: {formatDate(booking.deliveredAt)}
                    </Typography>
                  </View>
                )}
              </View>

              {booking.driverName && (
                <View style={styles.driverInfo}>
                  <Ionicons name="person" size={16} color={UI_CONFIG.colors.secondary} />
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
                    <Ionicons name="close-outline" size={16} color={UI_CONFIG.colors.error} />
                    <Typography variant="caption" style={[styles.actionText, styles.cancelText]}>Cancel</Typography>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
        )}
        style={styles.ordersContainer}
        contentContainerStyle={filteredBookings.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="h3" style={styles.emptyStateText}>
              {searchQuery || selectedFilter !== 'all' ? 'No matching orders' : 'No orders yet'}
            </Typography>
            <Typography variant="body" style={styles.emptyStateSubtext}>
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filter' 
                : 'Book your first tanker to get started'
              }
            </Typography>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    marginLeft: 12,
  },
  filterSection: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
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
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: UI_CONFIG.colors.primary,
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
  },
  countBadge: {
    backgroundColor: UI_CONFIG.colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
  },
  countTextActive: {
    color: UI_CONFIG.colors.textLight,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
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
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
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
    color: UI_CONFIG.colors.textLight,
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
    color: UI_CONFIG.colors.text,
    marginLeft: 8,
    flex: 1,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  driverText: {
    fontSize: 14,
    color: UI_CONFIG.colors.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  driverPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginLeft: 8,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: UI_CONFIG.colors.background,
    borderRadius: 16,
  },
  cancelButton: {
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: UI_CONFIG.colors.primary,
    marginLeft: 4,
  },
  cancelText: {
    color: UI_CONFIG.colors.error,
  },
});

export default OrderHistoryScreen;