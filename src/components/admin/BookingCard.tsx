import React, { memo, useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card } from '../common';
import { Booking, BookingStatus, isCustomerUser } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';
import { UserService } from '../../services/user.service';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';

export interface BookingCardProps {
  booking: Booking;
  onPress: (booking: Booking) => void;
  getStatusColor: (status: BookingStatus) => string;
  getStatusIcon: (status: BookingStatus) => string;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onPress,
  getStatusColor,
  getStatusIcon,
}) => {
  const [customerProfileAddress, setCustomerProfileAddress] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerAddress = async () => {
      try {
        const customer = await UserService.getUserById(booking.customerId);
        if (customer && isCustomerUser(customer) && customer.savedAddresses && customer.savedAddresses.length > 0) {
          const defaultAddress = customer.savedAddresses.find(addr => addr.isDefault) || customer.savedAddresses[0];
          if (defaultAddress && defaultAddress.address !== booking.deliveryAddress.address) {
            setCustomerProfileAddress(defaultAddress.address);
          }
        }
      } catch (error) {
        // Profile address is optional, but log for debugging
        errorLogger.low('Failed to fetch customer profile address', error, { 
          bookingId: booking.id, 
          customerId: booking.customerId 
        });
      }
    };
    fetchCustomerAddress();
  }, [booking.customerId, booking.deliveryAddress.address]);

  const statusColor = useMemo(() => getStatusColor(booking.status), [booking.status, getStatusColor]);
  const statusIcon = useMemo(() => getStatusIcon(booking.status), [booking.status, getStatusIcon]);
  const formattedDate = useMemo(() => {
    return formatDateTime(booking.createdAt);
  }, [booking.createdAt]);
  const formattedDeliveredDate = useMemo(() => {
    if (!booking.deliveredAt) return null;
    return formatDateTime(booking.deliveredAt);
  }, [booking.deliveredAt]);
  const bookingIdShort = useMemo(() => booking.id.slice(-8), [booking.id]);
  const statusText = useMemo(() => booking.status.replace('_', ' ').toUpperCase(), [booking.status]);

  return (
  <Card style={styles.bookingCard}>
    <TouchableOpacity 
      onPress={() => onPress(booking)}
      activeOpacity={0.7}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Typography variant="h3" style={styles.customerName}>
            {booking.customerName}
          </Typography>
          <Typography variant="caption" style={styles.bookingId}>
            #{bookingIdShort}
          </Typography>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons 
            name={statusIcon as any} 
            size={16} 
            color={UI_CONFIG.colors.textLight} 
          />
          <Typography variant="caption" style={styles.statusText}>
            {statusText}
          </Typography>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="water-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {booking.tankerSize}L Tanker
          </Typography>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {booking.deliveryAddress.address}
          </Typography>
        </View>
        
        {customerProfileAddress && (
          <View style={styles.detailRow}>
            <Ionicons name="home-outline" size={16} color={UI_CONFIG.colors.primary} />
            <Typography variant="body" style={styles.detailText}>
              Profile: {customerProfileAddress}
            </Typography>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {PricingUtils.formatPrice(booking.totalPrice)}
          </Typography>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {formattedDate}
          </Typography>
        </View>
        {booking.status === 'delivered' && formattedDeliveredDate && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle" size={16} color={UI_CONFIG.colors.success} />
            <Typography variant="body" style={styles.detailText}>
              Delivered: {formattedDeliveredDate}
            </Typography>
          </View>
        )}
      </View>

      {booking.driverName && (
        <View style={styles.driverInfo}>
          <Typography variant="caption" style={styles.driverLabel}>
            Driver: {booking.driverName}
          </Typography>
        </View>
      )}
    </TouchableOpacity>
  </Card>
  );
};

export default memo(BookingCard);

const styles = StyleSheet.create({
  bookingCard: {
    marginBottom: UI_CONFIG.spacing.md,
    padding: UI_CONFIG.spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: UI_CONFIG.spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  bookingId: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
    marginLeft: 4,
  },
  bookingDetails: {
    marginBottom: UI_CONFIG.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    marginLeft: UI_CONFIG.spacing.sm,
  },
  driverInfo: {
    paddingTop: UI_CONFIG.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.background,
  },
  driverLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
});

