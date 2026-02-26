import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  TextInput,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { Typography, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import BookingCard from '../../components/admin/BookingCard';
import BookingDetailsModal from '../../components/admin/BookingDetailsModal';
import StatusUpdateModal from '../../components/admin/StatusUpdateModal';
import { Booking, BookingStatus } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type AllBookingsScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Bookings'>;

const AllBookingsScreen: React.FC = () => {
  const navigation = useNavigation<AllBookingsScreenNavigationProp>();
  const { bookings, fetchAllBookings, updateBookingStatus, isLoading } = useBookingStore();
  const { user: currentAdmin, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      await fetchAllBookings();
    } catch (error) {
            Alert.alert('Error', 'Failed to load bookings. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  // Memoize filtered bookings to avoid recalculating on every render
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Filter by admin's agency (only show bookings for this admin's agency)
    if (currentAdmin) {
      filtered = filtered.filter(booking => 
        booking.agencyId === currentAdmin.id
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerPhone.includes(query) ||
        booking.deliveryAddress.address.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    return filtered;
  }, [bookings, searchQuery, statusFilter, currentAdmin]);

  // Memoize filter counts to avoid recalculating on every render
  const filterCounts = useMemo(() => {
    // First filter by admin's agency
    const adminBookings = currentAdmin 
      ? bookings.filter(booking => booking.agencyId === currentAdmin.id)
      : [];
    
    return {
      all: adminBookings.length,
      pending: adminBookings.filter(booking => booking.status === 'pending').length,
      accepted: adminBookings.filter(booking => booking.status === 'accepted').length,
      in_transit: adminBookings.filter(booking => booking.status === 'in_transit').length,
      delivered: adminBookings.filter(booking => booking.status === 'delivered').length,
      cancelled: adminBookings.filter(booking => booking.status === 'cancelled').length,
    };
  }, [bookings, currentAdmin]);

  const filterButtons = useMemo(() => [
    { key: 'all', label: 'All', icon: 'list-outline', count: filterCounts.all },
    { key: 'pending', label: 'Pending', icon: 'time-outline', count: filterCounts.pending },
    { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline', count: filterCounts.accepted },
    { key: 'in_transit', label: 'In Transit', icon: 'car-outline', count: filterCounts.in_transit },
    { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline', count: filterCounts.delivered },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', count: filterCounts.cancelled },
  ], [filterCounts]);

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

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      setShowStatusModal(false);
      setSelectedBooking(null);
      Alert.alert('Success', 'Booking status updated successfully');
    } catch (error) {
            Alert.alert('Error', 'Failed to update booking status. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: 'Bookings' | 'Drivers' | 'Vehicles' | 'Reports' | 'Profile') => {
    if (route === 'Bookings') {
      // Already on Bookings, just close menu
      return;
    }
    navigation.navigate(route);
  };

  const openBookingDetails = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  }, []);

  const keyExtractor = useCallback((item: Booking) => item.id, []);

  const renderItem = useCallback(({ item }: { item: Booking }) => (
    <BookingCard 
      booking={item}
      onPress={openBookingDetails}
      getStatusColor={getStatusColor}
      getStatusIcon={getStatusIcon}
    />
  ), [openBookingDetails, getStatusColor, getStatusIcon]);

  const listEmptyComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={UI_CONFIG.colors.textSecondary} />
      <Typography variant="h3" style={styles.emptyTitle}>
        {searchQuery || statusFilter !== 'all' ? 'No matching bookings' : 'No bookings yet'}
      </Typography>
      <Typography variant="body" style={styles.emptyText}>
        {searchQuery || statusFilter !== 'all' 
          ? 'Try adjusting your search or filter' 
          : 'Bookings will appear here once customers start placing orders'
        }
      </Typography>
    </View>
  ), [searchQuery, statusFilter]);


  const StatusFilterButton: React.FC<{ filter: { key: string; label: string; icon: string; count: number } }> = ({ filter }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        statusFilter === filter.key && styles.filterButtonActive
      ]}
      onPress={() => setStatusFilter(filter.key as BookingStatus | 'all')}
    >
      <Ionicons 
        name={filter.icon as any} 
        size={16} 
        color={statusFilter === filter.key ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.primary} 
      />
      <Typography 
        variant="caption" 
        style={[
          styles.filterButtonText,
          statusFilter === filter.key && styles.filterButtonTextActive
        ]}
      >
        {filter.label}
      </Typography>
      <View style={[
        styles.countBadge,
        statusFilter === filter.key && styles.countBadgeActive
      ]}>
        <Typography variant="caption" style={[
          styles.countText,
          statusFilter === filter.key && styles.countTextActive
        ]}>
          {filter.count}
        </Typography>
      </View>
    </TouchableOpacity>
  );


  if (isLoading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
              All Bookings
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
            </Typography>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={UI_CONFIG.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bookings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={UI_CONFIG.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={UI_CONFIG.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filterButtons.map((filter) => (
            <StatusFilterButton key={filter.key} filter={filter} />
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.bookingsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={listEmptyComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />

      <BookingDetailsModal 
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        booking={selectedBooking}
        getStatusColor={getStatusColor}
      />
      <StatusUpdateModal 
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        bookingId={selectedBooking?.id || null}
        onStatusUpdate={handleStatusUpdate}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
      />
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Bookings"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.background,
    borderRadius: 12,
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: UI_CONFIG.spacing.sm,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  filterSection: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
    minHeight: 60,
  },
  filterContainer: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    marginRight: UI_CONFIG.spacing.sm,
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
  bookingsList: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingTop: UI_CONFIG.spacing.md,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginTop: UI_CONFIG.spacing.md,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
});

export default AllBookingsScreen;
