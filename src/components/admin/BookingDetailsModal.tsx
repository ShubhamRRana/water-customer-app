import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card } from '../common';
import { Booking, BookingStatus } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';
import { formatDateTime } from '../../utils/dateUtils';

export interface BookingDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking | null;
  getStatusColor: (status: BookingStatus) => string;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  visible,
  onClose,
  booking,
  getStatusColor,
}) => (
  <Modal
    visible={visible}
    animationType='slide'
    presentationStyle="pageSheet"
  >
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Typography variant="h2" style={styles.modalTitle}>
          Booking Details
        </Typography>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={UI_CONFIG.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {booking && (
        <ScrollView style={styles.modalContent}>
          <Card style={styles.detailCard}>
            <Typography variant="h3" style={styles.detailSectionTitle}>
              Customer Information
            </Typography>
            <View style={styles.detailItem}>
              <Typography variant="body" style={styles.detailLabel}>Name:</Typography>
              <Typography variant="body" style={styles.detailValue}>
                {booking.customerName}
              </Typography>
            </View>
            <View style={styles.detailItem}>
              <Typography variant="body" style={styles.detailLabel}>Phone:</Typography>
              <Typography variant="body" style={styles.detailValue}>
                {booking.customerPhone}
              </Typography>
            </View>
          </Card>

          <Card style={styles.detailCard}>
            <Typography variant="h3" style={styles.detailSectionTitle}>
              Booking Information
            </Typography>
            <View style={styles.detailItem}>
              <Typography variant="body" style={styles.detailLabel}>Booking ID:</Typography>
              <Typography variant="body" style={styles.detailValue}>
                #{booking.id.slice(-8)}
              </Typography>
            </View>
            <View style={styles.detailItem}>
              <Typography variant="body" style={styles.detailLabel}>Tanker Size:</Typography>
              <Typography variant="body" style={styles.detailValue}>
                {booking.tankerSize}L
              </Typography>
            </View>
            <View style={styles.detailItem}>
              <Typography variant="body" style={styles.detailLabel}>Status:</Typography>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Typography variant="caption" style={styles.statusText}>
                  {booking.status.replace('_', ' ').toUpperCase()}
                </Typography>
              </View>
            </View>
            {booking.status === 'delivered' && booking.deliveredAt && (
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Delivered At:</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {formatDateTime(booking.deliveredAt)}
                </Typography>
              </View>
            )}
            <View style={styles.detailItem}>
              <Typography variant="body" style={styles.detailLabel}>Total Price:</Typography>
              <Typography variant="body" style={styles.detailValue}>
                {PricingUtils.formatPrice(booking.totalPrice)}
              </Typography>
            </View>
          </Card>

          <Card style={styles.detailCard}>
            <Typography variant="h3" style={styles.detailSectionTitle}>
              Delivery Address
            </Typography>
            <Typography variant="body" style={styles.addressText}>
              {booking.deliveryAddress.address}
            </Typography>
          </Card>

          {booking.driverName && (
            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Driver Information
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Name:</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {booking.driverName}
                </Typography>
              </View>
              {booking.driverPhone && (
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Phone:</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {booking.driverPhone}
                  </Typography>
                </View>
              )}
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  closeButton: {
    padding: UI_CONFIG.spacing.sm,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  detailCard: {
    marginVertical: UI_CONFIG.spacing.sm,
    padding: UI_CONFIG.spacing.md,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
  },
  addressText: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.xs,
  },
  landmarkText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: UI_CONFIG.spacing.xs,
  },
});

export default BookingDetailsModal;
