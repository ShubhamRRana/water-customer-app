import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../../constants/config';
import Typography from './Typography';
import Button from './Button';

interface ScreenEmptyProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  /** Tighter layout for use inside cards or list empty rows. */
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Icon + title + optional subtitle and primary action (empty lists, not-found hints).
 */
const ScreenEmpty: React.FC<ScreenEmptyProps> = ({
  icon,
  title,
  message,
  compact = false,
  actionLabel,
  onAction,
}) => {
  const iconSize = compact ? 48 : 64;
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Ionicons
        name={icon}
        size={iconSize}
        color={UI_CONFIG.colors.textSecondary}
      />
      <Typography
        variant={compact ? 'body' : 'h3'}
        style={[styles.title, compact && styles.titleCompact]}
      >
        {title}
      </Typography>
      {message ? (
        <Typography
          variant={compact ? 'caption' : 'body'}
          style={[styles.message, compact && styles.messageCompact]}
        >
          {message}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.cta}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: UI_CONFIG.spacing.xxl,
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  wrapCompact: {
    paddingVertical: UI_CONFIG.spacing.xl,
  },
  title: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: UI_CONFIG.spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  titleCompact: {
    fontSize: UI_CONFIG.fontSize.md,
  },
  message: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: UI_CONFIG.spacing.sm,
    textAlign: 'center',
  },
  messageCompact: {
    marginTop: UI_CONFIG.spacing.sm,
  },
  cta: {
    marginTop: UI_CONFIG.spacing.md,
    minWidth: 160,
  },
});

export default ScreenEmpty;
