import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useBookingByIdQuery, useBookingRealtimeSubscription, useCancelBookingMutation } from '../../hooks/queries';
import Card from '../../components/common/Card';
import { Typography, ScreenLoading, ScreenError, ScreenEmpty } from '../../components/common';
import { BookingStatus } from '../../types';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { PricingUtils } from '../../utils/pricing';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { LocationTrackingService, DriverLocation } from '../../services/locationTracking.service';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';
import Button from '../../components/common/Button';
import {
  canPayBookingOnline,
  getBookingPaymentStatusLabel,
} from '../../utils/paymentDisplay';

type OrderTrackingScreenNavigationProp = StackNavigationProp<AppStackParamList, 'OrderTracking'>;
type OrderTrackingScreenRouteProp = RouteProp<AppStackParamList, 'OrderTracking'>;

interface OrderTrackingScreenProps {
  navigation: OrderTrackingScreenNavigationProp;
  route: OrderTrackingScreenRouteProp;
}

function createOrderTrackingStyles(colors: ThemeColors) {
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    statusSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    statusCard: {
      padding: 20,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    statusInfo: {
      flex: 1,
    },
    statusTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    statusDescription: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    estimatedTime: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    estimatedTimeText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 8,
      fontWeight: '500',
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    detailsCard: {
      padding: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    detailLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    addressCard: {
      padding: 16,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    addressTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
    },
    addressText: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
    },
    landmarkText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    driverCard: {
      padding: 16,
    },
    driverHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    driverAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    driverInfo: {
      flex: 1,
    },
    driverName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    driverPhone: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    callButton: {
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 24,
    },
    locationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    locationText: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 8,
      fontWeight: '500',
    },
    priceCard: {
      padding: 16,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    priceLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    priceValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
      paddingTop: 16,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.accent,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.error,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error,
      marginLeft: 8,
    },
    payButton: {
      marginTop: 12,
    },
    paymentIdText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
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

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const colors = useThemeColors();
  const styles = useMemo(() => createOrderTrackingStyles(colors), [colors]);
  const { user } = useAuthStore();
  const cancelBookingMutation = useCancelBookingMutation();
  const {
    data: booking,
    isPending,
    isError,
    refetch,
  } = useBookingByIdQuery(orderId);

  useBookingRealtimeSubscription(orderId, booking?.customerId ?? user?.id);

  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    let unsubscribeLocation: (() => void) | null = null;

    const setupLocationTracking = async () => {
      try {
        const initialLocation = await LocationTrackingService.getBookingLocation(orderId);
        if (initialLocation) {
          setDriverLocation(initialLocation);
        }

        unsubscribeLocation = LocationTrackingService.subscribeToBookingLocation(orderId, (location) => {
          if (location) {
            setDriverLocation(location);
          }
        });
      } catch (error) {
        errorLogger.medium('Failed to setup location tracking', error, { orderId });
      }
    };

    setupLocationTracking();

    return () => {
      if (unsubscribeLocation) {
        unsubscribeLocation();
      }
    };
  }, [orderId]);

  const estimatedDeliveryTime = booking?.distance ? PricingUtils.calculateDeliveryTime(booking.distance) : null;
  const trackingStatus: BookingStatus = booking?.status ?? 'pending';

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'Order Placed';
      case 'accepted':
        return 'Driver Assigned';
      case 'in_transit':
        return 'On the Way';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getStatusDescription = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return "Your order has been placed and we're looking for a driver";
      case 'accepted':
        return 'A driver has been assigned and will arrive soon';
      case 'in_transit':
        return 'Your water tanker is on the way to your location';
      case 'delivered':
        return 'Your water tanker has been delivered successfully';
      case 'cancelled':
        return 'This order has been cancelled';
      default:
        return 'Status unknown';
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'in_transit':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-done-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const formatDate = (date: Date | string) => {
    return formatDateTime(date);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleCallDriver = useCallback(() => {
    if (booking?.driverPhone) {
      Linking.openURL(`tel:${booking.driverPhone}`).catch(() => {
        Alert.alert('Error', 'Could not open the phone dialer.');
      });
    }
  }, [booking?.driverPhone]);

  const handleCancelOrder = useCallback(() => {
    if (!booking?.canCancel) {
      Alert.alert(
        'Cannot Cancel',
        'This order cannot be cancelled as it has already been accepted by a driver.'
      );
      return;
    }

    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBookingMutation.mutateAsync({
              bookingId: orderId,
              reason: 'customer_cancelled',
              customerId: user?.id ?? '',
            });
            Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Could not cancel the order. Please try again.');
          }
        },
      },
    ]);
  }, [booking?.canCancel, cancelBookingMutation, orderId, user?.id, navigation]);

  if (isPending) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenLoading message="Loading order details..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenError message="Failed to load order." onRetry={() => refetch()} retryLabel="Tap to retry" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenEmpty
          icon="receipt-outline"
          title="Order not found."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.title}>
            Order Details
          </Typography>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statusSection}>
          <Card style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View
                style={[styles.statusIconContainer, { backgroundColor: getStatusColor(trackingStatus, colors) }]}
              >
                <Ionicons name={getStatusIcon(trackingStatus)} size={32} color={colors.textLight} />
              </View>
              <View style={styles.statusInfo}>
                <Typography variant="h3" style={styles.statusTitle}>
                  {getStatusText(trackingStatus)}
                </Typography>
                <Typography variant="body" style={styles.statusDescription}>
                  {getStatusDescription(trackingStatus)}
                </Typography>
              </View>
            </View>

            {estimatedDeliveryTime && trackingStatus === 'in_transit' && (
              <View style={styles.estimatedTime}>
                <Ionicons name="time-outline" size={16} color={colors.accent} />
                <Typography variant="body" style={styles.estimatedTimeText}>
                  Estimated delivery: {formatTime(estimatedDeliveryTime)}
                </Typography>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Order Details
          </Typography>
          <Card style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Typography variant="body" style={styles.detailLabel}>
                Order ID
              </Typography>
              <Typography variant="body" style={styles.detailValue}>
                #{booking.id.slice(-6)}
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Typography variant="body" style={styles.detailLabel}>
                Tanker Size
              </Typography>
              <Typography variant="body" style={styles.detailValue}>
                {booking.tankerSize}L
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Typography variant="body" style={styles.detailLabel}>
                Total Amount
              </Typography>
              {booking.totalPrice > 0 ? (
                <Typography variant="body" style={styles.detailValue}>
                  {PricingUtils.formatPrice(booking.totalPrice)}
                </Typography>
              ) : (
                <Typography
                  variant="body"
                  style={[styles.detailValue, { fontStyle: 'italic', color: colors.textSecondary }]}
                >
                  To be determined
                </Typography>
              )}
            </View>
            <View style={styles.detailRow}>
              <Typography variant="body" style={styles.detailLabel}>
                Order Date
              </Typography>
              <Typography variant="body" style={styles.detailValue}>
                {formatDate(booking.createdAt)}
              </Typography>
            </View>
            {booking.scheduledFor && (
              <View style={styles.detailRow}>
                <Typography variant="body" style={styles.detailLabel}>
                  Scheduled For
                </Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {formatDate(booking.scheduledFor)}
                </Typography>
              </View>
            )}
            {booking.status === 'delivered' && booking.deliveredAt && (
              <View style={styles.detailRow}>
                <Typography variant="body" style={styles.detailLabel}>
                  Delivered At
                </Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {formatDate(booking.deliveredAt)}
                </Typography>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Payment
          </Typography>
          <Card style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Typography variant="body" style={styles.detailLabel}>
                Status
              </Typography>
              <Typography variant="body" style={styles.detailValue}>
                {getBookingPaymentStatusLabel(booking)}
              </Typography>
            </View>
            {booking.paymentId && booking.paymentId.startsWith('pay_') && (
              <View style={styles.detailRow}>
                <Typography variant="body" style={styles.detailLabel}>
                  Razorpay ID
                </Typography>
                <Typography variant="body" style={[styles.detailValue, styles.paymentIdText]} numberOfLines={1}>
                  {booking.paymentId}
                </Typography>
              </View>
            )}
            {canPayBookingOnline(booking) && (
              <Button
                title="Pay now"
                onPress={() => navigation.navigate('PayBooking', { bookingId: booking.id })}
                style={styles.payButton}
              />
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Delivery Address
          </Typography>
          <Card style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Ionicons name="location" size={20} color={colors.success} />
              <Typography variant="body" style={styles.addressTitle}>
                Delivery Location
              </Typography>
            </View>
            <Typography variant="body" style={styles.addressText}>
              {booking.deliveryAddress.address}
            </Typography>
          </Card>
        </View>

        {booking.driverName && (
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Driver Information
            </Typography>
            <Card style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={24} color={colors.secondary} />
                </View>
                <View style={styles.driverInfo}>
                  <Typography variant="body" style={styles.driverName}>
                    {booking.driverName}
                  </Typography>
                  {booking.driverPhone && (
                    <Typography variant="caption" style={styles.driverPhone}>
                      {booking.driverPhone}
                    </Typography>
                  )}
                </View>
                <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                  <Ionicons name="call" size={20} color={colors.success} />
                </TouchableOpacity>
              </View>

              {driverLocation && (
                <View style={styles.locationInfo}>
                  <Ionicons name="navigate" size={16} color={colors.accent} />
                  <Typography variant="caption" style={styles.locationText}>
                    Driver is on the way
                  </Typography>
                </View>
              )}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.actionsContainer}>
            {booking.canCancel && trackingStatus === 'pending' && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
                <Ionicons name="close-outline" size={20} color={colors.error} />
                <Typography variant="body" style={styles.cancelButtonText}>
                  Cancel Order
                </Typography>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderTrackingScreen;
