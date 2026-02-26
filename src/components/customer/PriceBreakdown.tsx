import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import Card from '../common/Card';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';

interface PriceBreakdownProps {
  agencyName?: string;
  vehicleCapacity?: number;
  vehicleNumber?: string;
  basePrice: number;
  totalPrice: number;
}

const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  agencyName,
  vehicleCapacity,
  vehicleNumber,
  basePrice,
  totalPrice,
}) => {
  return (
    <View style={styles.section}>
      <Typography variant="h3" style={styles.sectionTitle}>Price Breakdown</Typography>
      <Card style={styles.priceCard}>
        {agencyName && (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>Agency</Typography>
            <Typography variant="body" style={styles.priceValue}>{agencyName}</Typography>
          </View>
        )}
        {vehicleCapacity && (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>Vehicle Capacity</Typography>
            <Typography variant="body" style={styles.priceValue}>{vehicleCapacity}L</Typography>
          </View>
        )}
        {vehicleNumber && (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>Vehicle Number</Typography>
            <Typography variant="body" style={styles.priceValue}>{vehicleNumber}</Typography>
          </View>
        )}
        {basePrice > 0 ? (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>Unit Price</Typography>
            <Typography variant="body" style={styles.priceValue}>{PricingUtils.formatPrice(basePrice)}</Typography>
          </View>
        ) : (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>Unit Price</Typography>
            <Typography variant="body" style={[styles.priceValue, styles.pendingText]}>To be determined</Typography>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Typography variant="h3" style={styles.totalLabel}>Total Amount</Typography>
          {totalPrice > 0 ? (
            <Typography variant="h3" style={styles.totalValue}>{PricingUtils.formatPrice(totalPrice)}</Typography>
          ) : (
            <Typography variant="h3" style={[styles.totalValue, styles.pendingText]}>To be determined</Typography>
          )}
        </View>
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
  priceCard: {
    marginBottom: 8,
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
  pendingText: {
    color: UI_CONFIG.colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default PriceBreakdown;

