import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: 'small' | 'medium' | 'large';
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}

function createCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: UI_CONFIG.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    pressable: {},
    smallPadding: {
      padding: UI_CONFIG.spacing.sm,
    },
    mediumPadding: {
      padding: UI_CONFIG.spacing.md,
    },
    largePadding: {
      padding: UI_CONFIG.spacing.lg,
    },
  });
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padding = 'medium',
  accessibilityLabel,
  accessibilityRole,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createCardStyles(colors), [colors]);

  const cardStyle = [styles.card, styles[`${padding}Padding`], onPress && styles.pressable, style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

export default Card;
