import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useBookingStore } from '../../store/bookingStore';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography } from '../../components/common';
import { Booking, BookingStatus } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { PricingUtils } from '../../utils/pricing';
import { UI_CONFIG } from '../../constants/config';
import { LocationTrackingService, DriverLocation } from '../../services/locationTracking.service';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';

const { width } = Dimensions.get('window');

type OrderTrackingScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'OrderTracking'>;
type OrderTrackingScreenRouteProp = RouteProp<CustomerStackParamList, 'OrderTracking'>;

interface OrderTrackingScreenProps {
  navigation: OrderTrackingScreenNavigationProp;
  route: OrderTrackingScreenRouteProp;
}

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { getBookingById, isLoading } = useBookingStore();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<BookingStatus>('pending');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    loadBooking();
    
    // Subscribe to real-time booking updates
    useBookingStore.getState().subscribeToBooking(orderId);
    
    // Subscribe to real-time location updates for this booking
    let unsubscribeLocation: (() => void) | null = null;
    
    const setupLocationTracking = async () => {
      try {
        // Get initial location if available
        const initialLocation = await LocationTrackingService.getBookingLocation(orderId);
        if (initialLocation) {
          setDriverLocation(initialLocation);
        }
        
        // Subscribe to real-time location updates
        unsubscribeLocation = LocationTrackingService.subscribeToBookingLocation(
          orderId,
          (location) => {
            if (location) {
              setDriverLocation(location);
            }
          }
        );
      } catch (error) {
        errorLogger.medium('Failed to setup location tracking', error, { orderId });
      }
    };
    
    setupLocationTracking();

    return () => {
      useBookingStore.getState().unsubscribeFromBooking();
      if (unsubscribeLocation) {
        unsubscribeLocation();
      }
    };
  }, [orderId]);

  const loadBooking = async () => {
    try {
      const bookingData = await getBookingById(orderId);
      if (bookingData) {
        setBooking(bookingData);
        setTrackingStatus(bookingData.status);
        
        // Calculate estimated delivery time
        if (bookingData.distance) {
          const estimatedTime = PricingUtils.calculateDeliveryTime(bookingData.distance);
          setEstimatedDeliveryTime(estimatedTime);
        }
        
        // Load driver location if booking is in transit
        if (bookingData.status === 'in_transit' || bookingData.status === 'accepted') {
          try {
            const location = await LocationTrackingService.getBookingLocation(orderId);
            if (location) {
              setDriverLocation(location);
            }
          } catch (error) {
            errorLogger.medium('Failed to load driver location', error, { orderId, status: bookingData.status });
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
    }
  };
  
  // Subscribe to booking updates from store
  useEffect(() => {
    const unsubscribe = useBookingStore.subscribe((state, prevState) => {
      const currentBooking = state.currentBooking;
      if (currentBooking && currentBooking.id === orderId) {
        setBooking(currentBooking);
        setTrackingStatus(currentBooking.status);
        
        // Update estimated delivery time if distance changed
        if (currentBooking.distance) {
          const estimatedTime = PricingUtils.calculateDeliveryTime(currentBooking.distance);
          setEstimatedDeliveryTime(estimatedTime);
        }
      }
    });
    
    return unsubscribe;
  }, [orderId]);

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
      case 'pending': return 'Order Placed';
      case 'accepted': return 'Driver Assigned';
      case 'in_transit': return 'On the Way';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getStatusDescription = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'Your order has been placed and we\'re looking for a driver';
      case 'accepted': return 'A driver has been assigned and will arrive soon';
      case 'in_transit': return 'Your water tanker is on the way to your location';
      case 'delivered': return 'Your water tanker has been delivered successfully';
      case 'cancelled': return 'This order has been cancelled';
      default: return 'Status unknown';
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'in_transit': return 'car-outline';
      case 'delivered': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
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

  const handleCallDriver = () => {
    if (booking?.driverPhone) {
      Alert.alert(
        'Call Driver',
        `Call ${booking.driverName} at ${booking.driverPhone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // In a real app, you would use Linking to make a phone call
            Alert.alert('Calling...', `Calling ${booking.driverPhone}`);
          }},
        ]
      );
    }
  };

  const handleCancelOrder = () => {
    if (!booking?.canCancel) {
      Alert.alert('Cannot Cancel', 'This order cannot be cancelled as it has already been accepted by a driver.');
      return;
    }

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Order Cancelled', 'Your order has been cancelled successfully');
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Loading order details...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
        <Typography variant="h3" style={styles.title}>Order Details</Typography>
        <View style={{ width: 24 }} />
      </View>

      {/* Order Status */}
      <View style={styles.statusSection}>
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(trackingStatus) }]}>
              <Ionicons name={getStatusIcon(trackingStatus)} size={32} color={UI_CONFIG.colors.textLight} />
            </View>
            <View style={styles.statusInfo}>
              <Typography variant="h3" style={styles.statusTitle}>{getStatusText(trackingStatus)}</Typography>
              <Typography variant="body" style={styles.statusDescription}>{getStatusDescription(trackingStatus)}</Typography>
            </View>
          </View>
          
          {estimatedDeliveryTime && trackingStatus === 'in_transit' && (
            <View style={styles.estimatedTime}>
              <Ionicons name="time-outline" size={16} color={UI_CONFIG.colors.primary} />
              <Typography variant="body" style={styles.estimatedTimeText}>
                Estimated delivery: {formatTime(estimatedDeliveryTime)}
              </Typography>
            </View>
          )}
        </Card>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Order Details</Typography>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Typography variant="body" style={styles.detailLabel}>Order ID</Typography>
            <Typography variant="body" style={styles.detailValue}>#{booking.id.slice(-6)}</Typography>
          </View>
          <View style={styles.detailRow}>
            <Typography variant="body" style={styles.detailLabel}>Tanker Size</Typography>
            <Typography variant="body" style={styles.detailValue}>
              {booking.tankerSize}L
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Typography variant="body" style={styles.detailLabel}>Total Amount</Typography>
            {booking.totalPrice > 0 ? (
              <Typography variant="body" style={styles.detailValue}>{PricingUtils.formatPrice(booking.totalPrice)}</Typography>
            ) : (
              <Typography variant="body" style={[styles.detailValue, { fontStyle: 'italic', color: UI_CONFIG.colors.textSecondary }]}>
                To be determined
              </Typography>
            )}
          </View>
          <View style={styles.detailRow}>
            <Typography variant="body" style={styles.detailLabel}>Order Date</Typography>
            <Typography variant="body" style={styles.detailValue}>{formatDate(booking.createdAt)}</Typography>
          </View>
          {booking.scheduledFor && (
            <View style={styles.detailRow}>
              <Typography variant="body" style={styles.detailLabel}>Scheduled For</Typography>
              <Typography variant="body" style={styles.detailValue}>{formatDate(booking.scheduledFor)}</Typography>
            </View>
          )}
          {booking.status === 'delivered' && booking.deliveredAt && (
            <View style={styles.detailRow}>
              <Typography variant="body" style={styles.detailLabel}>Delivered At</Typography>
              <Typography variant="body" style={styles.detailValue}>{formatDate(booking.deliveredAt)}</Typography>
            </View>
          )}
        </Card>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Delivery Address</Typography>
        <Card style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={20} color={UI_CONFIG.colors.success} />
            <Typography variant="body" style={styles.addressTitle}>Delivery Location</Typography>
          </View>
          <Typography variant="body" style={styles.addressText}>{booking.deliveryAddress.address}</Typography>
        </Card>
      </View>

      {/* Driver Information */}
      {booking.driverName && (
        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>Driver Information</Typography>
          <Card style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color={UI_CONFIG.colors.secondary} />
              </View>
              <View style={styles.driverInfo}>
                <Typography variant="body" style={styles.driverName}>{booking.driverName}</Typography>
                {booking.driverPhone && (
                  <Typography variant="caption" style={styles.driverPhone}>{booking.driverPhone}</Typography>
                )}
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                <Ionicons name="call" size={20} color={UI_CONFIG.colors.success} />
              </TouchableOpacity>
            </View>
            
            {driverLocation && (
              <View style={styles.locationInfo}>
                <Ionicons name="navigate" size={16} color={UI_CONFIG.colors.primary} />
                <Typography variant="caption" style={styles.locationText}>Driver is on the way</Typography>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <View style={styles.actionsContainer}>
          {booking.canCancel && trackingStatus === 'pending' && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
              <Ionicons name="close-outline" size={20} color={UI_CONFIG.colors.error} />
              <Typography variant="body" style={styles.cancelButtonText}>Cancel Order</Typography>
            </TouchableOpacity>
          )}
        </View>
      </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  estimatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  estimatedTimeText: {
    fontSize: 16,
    color: UI_CONFIG.colors.primary,
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
    color: UI_CONFIG.colors.text,
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
    color: UI_CONFIG.colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
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
    color: UI_CONFIG.colors.text,
    marginLeft: 8,
  },
  addressText: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
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
    backgroundColor: UI_CONFIG.colors.background,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  callButton: {
    padding: 12,
    backgroundColor: UI_CONFIG.colors.background,
    borderRadius: 24,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  locationText: {
    fontSize: 14,
    color: UI_CONFIG.colors.primary,
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
    color: UI_CONFIG.colors.textSecondary,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.primary,
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
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.error,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.error,
    marginLeft: 8,
  },
});

export default OrderTrackingScreen;