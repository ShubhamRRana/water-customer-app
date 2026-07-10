import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useCustomerBookingsQuery } from '../../hooks/queries';
import { getErrorMessage } from '../../utils/errors';
import { isCustomerUser } from '../../types';
import Card from '../../components/common/Card';
import { Typography, CustomerMenuDrawer, ScreenLoading, ScreenEmpty } from '../../components/common';
import { useRefreshControl } from '../../hooks/useRefreshControl';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';
import AppScreenHeader from '../../components/layouts/AppScreenHeader';
import { BookingStatus } from '../../types';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { SUCCESS_MESSAGES } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { PricingUtils } from '../../utils/pricing';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';
import SubscriptionExpiryBanner from '../../components/customer/SubscriptionExpiryBanner';

type CustomerHomeScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Home'>;

interface CustomerHomeScreenProps {}

function createCustomerHomeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
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
      color: colors.text,
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
      color: colors.text,
      marginBottom: 4,
    },
    orderDate: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textLight,
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
      color: colors.text,
    },
    orderPrice: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accent,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    deliveryAddress: {
      fontSize: 14,
      color: colors.textSecondary,
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
      color: colors.accent,
      marginLeft: 8,
      flex: 1,
      fontStyle: 'italic',
    },
    deliveredDate: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    emptyState: {
      overflow: 'hidden',
    },
    errorContainer: {
      margin: 20,
      padding: 16,
      backgroundColor: colors.surfaceLight,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
    },
    errorText: {
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
    },
    welcomeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
    },
    welcomeBannerText: {
      flex: 1,
      color: colors.text,
      lineHeight: 22,
      paddingRight: 8,
    },
  });
}

function getStatusColor(status: BookingStatus, colors: ThemeColors) {
  switch (status) {
    case 'pending':
      return colors.warning;
    case 'accepted':
      return colors.accent;
    case 'in_transit':
      return colors.secondary;
    case 'delivered':
      return colors.success;
    case 'cancelled':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = () => {
  const navigation = useNavigation<CustomerHomeScreenNavigationProp>();
  const colors = useThemeColors();
  const styles = useMemo(() => createCustomerHomeStyles(colors), [colors]);
  const { user, logout, customerAccountKind, showPostRegisterWelcome, dismissPostRegisterWelcome } = useAuthStore();
  const {
    data: bookings = [],
    isPending: bookingsLoading,
    error: bookingsQueryError,
    refetch: refetchBookings,
  } = useCustomerBookingsQuery(user?.id);
  const bookingError = bookingsQueryError
    ? getErrorMessage(bookingsQueryError, 'Failed to load bookings')
    : null;

  const [menuVisible, setMenuVisible] = useState(false);

  const refetchBookingsSafe = useCallback(() => refetchBookings(), [refetchBookings]);
  const { refreshing, onRefresh } = useRefreshControl(refetchBookingsSafe, {
    onError: (error) => {
      errorLogger.medium('Failed to refresh customer data', error, { userId: user?.id });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'Home') {
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

  const handleAddTrip = () => {
    try {
      navigation.navigate('AddTrip');
    } catch (error) {
      Alert.alert('Navigation Error', 'Unable to open Add trip. Please try again.');
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'in_transit':
        return 'In Transit';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const recentBookings = bookings
    .sort((a, b) => {
      try {
        const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : new Date(a.createdAt);
        const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : new Date(b.createdAt);

        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        return 0;
      }
    })
    .slice(0, 10);

  const formatDate = (date: Date | string) => {
    return formatDateTime(date);
  };

  const formatPrice = (price: number) => {
    return PricingUtils.formatPrice(price);
  };

  if (bookingsLoading && !bookings.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenLoading message="Loading your dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <AppScreenHeader
          left={{ type: 'menu', onPress: () => setMenuVisible(true) }}
          subtitle={`Good ${getGreeting()},`}
          title={`Hi, ${user?.name || 'User'}`}
          subtitleFirst
        />

        {showPostRegisterWelcome ? (
          <View style={styles.welcomeBanner}>
            <Typography variant="body" style={styles.welcomeBannerText}>
              {SUCCESS_MESSAGES.auth.welcomeAfterRegister}
            </Typography>
            <TouchableOpacity
              onPress={dismissPostRegisterWelcome}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Dismiss welcome message"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : null}

        <SubscriptionExpiryBanner navigation={navigation} userId={user?.id} />

        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Quick Actions
          </Typography>
          {customerAccountKind === 'society' ? (
            <View style={styles.quickActions}>
              <Card style={styles.actionCard} onPress={handleAddTrip}>
                <View style={styles.actionContent}>
                  <Ionicons name="car-sport" size={32} color={colors.secondary} />
                  <Typography variant="body" style={styles.actionText}>
                    Add trip
                  </Typography>
                </View>
              </Card>
              <Card style={styles.actionCard} onPress={handleBookTanker}>
                <View style={styles.actionContent}>
                  <Ionicons name="calendar" size={32} color={colors.accent} />
                  <Typography variant="body" style={styles.actionText}>
                    Create booking
                  </Typography>
                </View>
              </Card>
            </View>
          ) : (
            <View style={styles.quickActions}>
              <Card style={styles.actionCard} onPress={handleBookTanker}>
                <View style={styles.actionContent}>
                  <Ionicons name="add-circle" size={32} color={colors.accent} />
                  <Typography variant="body" style={styles.actionText}>
                    Book Tanker
                  </Typography>
                </View>
              </Card>
              <Card style={styles.actionCard} onPress={() => navigation.navigate('SavedAddresses')}>
                <View style={styles.actionContent}>
                  <Ionicons name="location" size={32} color={colors.success} />
                  <Typography variant="body" style={styles.actionText}>
                    Saved Addresses
                  </Typography>
                </View>
              </Card>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Recent Orders
          </Typography>
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <Card key={booking.id} style={styles.orderCard}>
                <View style={styles.orderDetails}>
                  <Typography variant="body" style={styles.tankerSize}>
                    {booking.tankerSize}L Tanker
                  </Typography>
                  {booking.totalPrice > 0 ? (
                    <Typography variant="body" style={styles.orderPrice}>
                      {formatPrice(booking.totalPrice)}
                    </Typography>
                  ) : (
                    <Typography
                      variant="body"
                      style={[styles.orderPrice, { fontStyle: 'italic', color: colors.textSecondary }]}
                    >
                      To be determined
                    </Typography>
                  )}
                </View>
                <View style={styles.addressRow}>
                  <Ionicons name="location" size={16} color={colors.success} />
                  <Typography variant="caption" style={styles.deliveryAddress}>
                    {booking.deliveryAddress.address}
                  </Typography>
                </View>
                {user &&
                isCustomerUser(user) &&
                user.savedAddresses &&
                user.savedAddresses.length > 0 &&
                (() => {
                  const defaultAddress = user.savedAddresses.find((addr) => addr.isDefault) || user.savedAddresses[0];
                  return defaultAddress && defaultAddress.address !== booking.deliveryAddress.address ? (
                    <View style={styles.profileAddressRow}>
                      <Ionicons name="home" size={16} color={colors.accent} />
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
                      : booking.scheduledFor ? `Scheduled: ${formatDate(booking.scheduledFor)}` : `Placed: ${formatDate(booking.createdAt)}`}
                  </Typography>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status, colors) }]}>
                    <Typography variant="caption" style={styles.statusText}>
                      {getStatusText(booking.status)}
                    </Typography>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyState}>
              <ScreenEmpty
                compact
                icon="receipt-outline"
                title="No orders yet"
                message="Book your first tanker to get started"
              />
            </Card>
          )}
        </View>

        {bookingError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{bookingError}</Text>
          </View>
        )}
      </ScrollView>
      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Home"
        customerAccountKind={customerAccountKind}
        userName={user?.name}
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

export default CustomerHomeScreen;
