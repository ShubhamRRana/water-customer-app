import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useUserStore } from '../../store/userStore';
import { isCustomerUser } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography, CustomerMenuDrawer } from '../../components/common';
import { Booking, BookingStatus } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';

type CustomerHomeScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'Home'>;

interface CustomerHomeScreenProps {
}

const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = () => {
  const navigation = useNavigation<CustomerHomeScreenNavigationProp>();
  const { user, logout } = useAuthStore();
  const { 
    bookings, 
    isLoading: bookingsLoading, 
    fetchCustomerBookings,
    error: bookingError 
  } = useBookingStore();
  const { 
    isLoading: userLoading, 
    updateUser,
    error: userError 
  } = useUserStore();

  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadCustomerData();
    }
  }, [user?.id]);

  const loadCustomerData = async () => {
    if (!user?.id) return;
    
    try {
      await fetchCustomerBookings(user.id);
    } catch (error) {
      errorLogger.medium('Failed to load customer bookings', error, { userId: user.id });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCustomerData();
    } catch (error) {
      errorLogger.medium('Failed to refresh customer data', error, { userId: user?.id });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: 'Home' | 'Orders' | 'Profile' | 'PastOrders') => {
    if (route === 'Home') {
      // Already on Home, just close menu
      return;
    }
    try {
      navigation.navigate(route);
    } catch (error) {
      Alert.alert('Navigation Error', 'Unable to navigate. Please try again.');
    }
  };

  const handleBookTanker = () => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Booking');
      } else {
        Alert.alert('Error', 'Navigation is not available. Please try again.');
      }
    } catch (error) {
      Alert.alert('Navigation Error', 'Unable to navigate to booking screen. Please try again.');
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return UI_CONFIG.colors.warning;
      case 'accepted': return UI_CONFIG.colors.primary;
      case 'in_transit': return UI_CONFIG.colors.secondary;
      case 'delivered': return UI_CONFIG.colors.success;
      case 'cancelled': return UI_CONFIG.colors.error;
      default: return UI_CONFIG.colors.textSecondary;
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const recentBookings = bookings
    .sort((a, b) => {
      try {
        const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : new Date(a.createdAt);
        const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : new Date(b.createdAt);
        
        // Handle invalid dates by putting them at the end
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
                return 0;
      }
    })
    .slice(0, 3);

  const formatDate = (date: Date | string) => {
    return formatDateTime(date);
  };

  const formatPrice = (price: number) => {
    return PricingUtils.formatPrice(price);
  };

  if (bookingsLoading && !bookings.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Loading your dashboard...</Typography>
        </View>
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
          >
            <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="body" style={styles.greeting}>Good {getGreeting()},</Typography>
            <Typography variant="h2" style={styles.userName}>Hi, {user?.name || 'User'}</Typography>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Quick Actions</Typography>
        <View style={styles.quickActions}>
          <Card style={styles.actionCard} onPress={handleBookTanker}>
            <View style={styles.actionContent}>
              <Ionicons name="add-circle" size={32} color={UI_CONFIG.colors.primary} />
              <Typography variant="body" style={styles.actionText}>Book Tanker</Typography>
            </View>
          </Card>
          <Card style={styles.actionCard} onPress={() => navigation.navigate('SavedAddresses')}>
            <View style={styles.actionContent}>
              <Ionicons name="location" size={32} color={UI_CONFIG.colors.success} />
              <Typography variant="body" style={styles.actionText}>Saved Addresses</Typography>
            </View>
          </Card>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Recent Orders</Typography>
        {recentBookings.length > 0 ? (
          recentBookings.map((booking) => (
            <Card 
              key={booking.id} 
              style={styles.orderCard}
            >
              <View style={styles.orderDetails}>
                <Typography variant="body" style={styles.tankerSize}>
                  {booking.tankerSize}L Tanker
                </Typography>
                {booking.totalPrice > 0 ? (
                  <Typography variant="body" style={styles.orderPrice}>{formatPrice(booking.totalPrice)}</Typography>
                ) : (
                  <Typography variant="body" style={[styles.orderPrice, { fontStyle: 'italic', color: UI_CONFIG.colors.textSecondary }]}>
                    To be determined
                  </Typography>
                )}
              </View>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={16} color={UI_CONFIG.colors.success} />
                <Typography variant="caption" style={styles.deliveryAddress}>
                  {booking.deliveryAddress.address}
                </Typography>
              </View>
              {user && isCustomerUser(user) && user.savedAddresses && user.savedAddresses.length > 0 && (() => {
                const defaultAddress = user.savedAddresses.find(addr => addr.isDefault) || user.savedAddresses[0];
                return defaultAddress && defaultAddress.address !== booking.deliveryAddress.address ? (
                  <View style={styles.profileAddressRow}>
                    <Ionicons name="home" size={16} color={UI_CONFIG.colors.primary} />
                    <Typography variant="caption" style={styles.profileAddress}>
                      Profile: {defaultAddress.address}
                    </Typography>
                  </View>
                ) : null;
              })()}
              <View style={styles.orderFooter}>
                <Typography variant="caption" style={styles.deliveredDate}>
                  {booking.status === 'delivered' && booking.deliveredAt 
                    ? `Delivered: ${formatDate(booking.deliveredAt)}` 
                    : `Delivery Date: ${formatDate(booking.scheduledFor || booking.createdAt)}`}
                </Typography>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Typography variant="caption" style={styles.statusText}>{getStatusText(booking.status)}</Typography>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="body" style={styles.emptyStateText}>No orders yet</Typography>
            <Typography variant="caption" style={styles.emptyStateSubtext}>Book your first tanker to get started</Typography>
          </Card>
        )}
      </View>

      {/* Error Messages */}
      {(bookingError || userError) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {bookingError || userError}
          </Text>
        </View>
      )}
      </ScrollView>
      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Home"
      />
    </SafeAreaView>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
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
    backgroundColor: UI_CONFIG.colors.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
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
  greeting: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 20,
  },
  actionContent: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  orderCard: {
    marginBottom: 12,
    padding: 16,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tankerSize: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  deliveryAddress: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  profileAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  profileAddress: {
    fontSize: 12,
    color: UI_CONFIG.colors.primary,
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  deliveredDate: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: UI_CONFIG.colors.error,
  },
  errorText: {
    fontSize: 14,
    color: UI_CONFIG.colors.error,
    textAlign: 'center',
  },
});

export default CustomerHomeScreen;