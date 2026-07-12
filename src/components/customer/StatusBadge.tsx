import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BookingStatus } from '../../types';

export function getStatusColor(status: BookingStatus, colors: ThemeColors) {
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

function createStatusBadgeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    pillIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    icon: {
      marginRight: 4,
    },
    text: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textLight,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
  });
}

interface StatusBadgeProps {
  status: BookingStatus;
  variant?: 'pill' | 'pill-icon' | 'avatar';
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'pill', label, icon }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStatusBadgeStyles(colors), [colors]);
  const backgroundColor = getStatusColor(status, colors);

  if (variant === 'avatar') {
    return (
      <View style={[styles.avatar, { backgroundColor }]}>
        {icon && <Ionicons name={icon} size={32} color={colors.textLight} />}
      </View>
    );
  }

  if (variant === 'pill-icon') {
    return (
      <View style={[styles.pillIcon, { backgroundColor }]}>
        {icon && <Ionicons name={icon} size={16} color={colors.textLight} style={styles.icon} />}
        <Typography variant="caption" style={styles.text}>
          {label}
        </Typography>
      </View>
    );
  }

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Typography variant="caption" style={styles.text}>
        {label}
      </Typography>
    </View>
  );
};

export default StatusBadge;
