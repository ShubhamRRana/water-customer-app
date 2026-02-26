import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';

interface DeliverySummaryProps {
  agencyName?: string;
  quantity: number;
  vehicleCapacity?: number;
  vehicleNumber?: string;
  amount: number;
  date?: string;
  time?: string;
  timePeriod?: 'AM' | 'PM';
  address?: string;
}

const DeliverySummary: React.FC<DeliverySummaryProps> = ({
  agencyName,
  quantity,
  vehicleCapacity,
  vehicleNumber,
  amount,
  date,
  time,
  timePeriod,
  address,
}) => {
  const formatDateTime = () => {
    if (!date || !time) return 'Not set';
    return `${date} at ${time} ${timePeriod || 'PM'}`;
  };

  return (
    <View style={styles.section}>
      <Typography variant="h3" style={styles.sectionTitle}>Delivery Information</Typography>
      <Card style={styles.summaryCard}>
        {agencyName ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelContainer}>
              <Ionicons name="business-outline" size={18} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.summaryLabel}>Agency</Typography>
            </View>
            <Typography variant="body" style={styles.summaryValue}>{agencyName}</Typography>
          </View>
        ) : null}
        
        {(vehicleCapacity !== undefined && vehicleCapacity !== null && vehicleCapacity > 0) ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelContainer}>
              <Ionicons name="water-outline" size={18} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.summaryLabel}>Tanker Capacity</Typography>
            </View>
            <Typography variant="body" style={styles.summaryValue}>{`${vehicleCapacity}L`}</Typography>
          </View>
        ) : null}

        {vehicleNumber ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelContainer}>
              <Ionicons name="car-outline" size={18} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.summaryLabel}>Vehicle Number</Typography>
            </View>
            <Typography variant="body" style={styles.summaryValue}>{vehicleNumber}</Typography>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelContainer}>
            <Ionicons name="cube-outline" size={18} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="body" style={styles.summaryLabel}>Quantity</Typography>
          </View>
          <Typography variant="body" style={styles.summaryValue}>{`${quantity} tanker${quantity !== 1 ? 's' : ''}`}</Typography>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelContainer}>
            <Ionicons name="cash-outline" size={18} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="body" style={styles.summaryLabel}>Total Amount</Typography>
          </View>
          {amount > 0 ? (
            <Typography variant="body" style={[styles.summaryValue, styles.amountValue]}>
              {PricingUtils.formatPrice(amount)}
            </Typography>
          ) : (
            <Typography variant="body" style={[styles.summaryValue, styles.amountValue, styles.pendingText]}>
              To be determined at delivery
            </Typography>
          )}
        </View>

        {(date || time) ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelContainer}>
              <Ionicons name="time-outline" size={18} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.summaryLabel}>Delivery Date & Time</Typography>
            </View>
            <Typography variant="body" style={styles.summaryValue}>{formatDateTime()}</Typography>
          </View>
        ) : null}

        {address ? (
          <View style={[styles.summaryRow, styles.addressRow]}>
            <View style={styles.summaryLabelContainer}>
              <Ionicons name="location-outline" size={18} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.summaryLabel}>Delivery Address</Typography>
            </View>
            <Typography variant="body" style={styles.addressValue}>{address}</Typography>
          </View>
        ) : null}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
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
  summaryCard: {
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  addressRow: {
    borderBottomWidth: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  summaryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginLeft: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.primary,
  },
  addressValue: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    marginTop: 8,
    textAlign: 'left',
    width: '100%',
  },
  pendingText: {
    fontStyle: 'italic',
    color: UI_CONFIG.colors.textSecondary,
  },
});

export default DeliverySummary;

