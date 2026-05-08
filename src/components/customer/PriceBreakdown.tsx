import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Card from '../common/Card';
import { Typography } from '../common';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { PricingUtils } from '../../utils/pricing';

interface PriceBreakdownProps {
  agencyName?: string;
  vehicleCapacity?: number;
  vehicleNumber?: string;
  basePrice: number;
  totalPrice: number;
}

function createPriceBreakdownStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    pendingText: {
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
  });
}

const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  agencyName,
  vehicleCapacity,
  vehicleNumber,
  basePrice,
  totalPrice,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createPriceBreakdownStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Typography variant="h3" style={styles.sectionTitle}>
        Price Breakdown
      </Typography>
      <Card style={styles.priceCard}>
        {agencyName && (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>
              Agency
            </Typography>
            <Typography variant="body" style={styles.priceValue}>
              {agencyName}
            </Typography>
          </View>
        )}
        {vehicleCapacity ? (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>
              Vehicle Capacity
            </Typography>
            <Typography variant="body" style={styles.priceValue}>
              {vehicleCapacity}L
            </Typography>
          </View>
        ) : null}
        {vehicleNumber ? (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>
              Vehicle Number
            </Typography>
            <Typography variant="body" style={styles.priceValue}>
              {vehicleNumber}
            </Typography>
          </View>
        ) : null}
        {basePrice > 0 ? (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>
              Unit Price
            </Typography>
            <Typography variant="body" style={styles.priceValue}>
              {PricingUtils.formatPrice(basePrice)}
            </Typography>
          </View>
        ) : (
          <View style={styles.priceRow}>
            <Typography variant="body" style={styles.priceLabel}>
              Unit Price
            </Typography>
            <Typography variant="body" style={[styles.priceValue, styles.pendingText]}>
              To be determined
            </Typography>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Typography variant="h3" style={styles.totalLabel}>
            Total Amount
          </Typography>
          {totalPrice > 0 ? (
            <Typography variant="h3" style={styles.totalValue}>
              {PricingUtils.formatPrice(totalPrice)}
            </Typography>
          ) : (
            <Typography variant="h3" style={[styles.totalValue, styles.pendingText]}>
              To be determined
            </Typography>
          )}
        </View>
      </Card>
    </View>
  );
};

export default PriceBreakdown;
