import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';

/**
 * Card component props
 */
interface CardProps {
  /** Content to display inside the card */
  children: React.ReactNode;
  /** Additional styles to apply to the card */
  style?: StyleProp<ViewStyle>;
  /** Optional callback when card is pressed (makes card pressable) */
  onPress?: () => void;
  /** Padding size for the card content */
  padding?: 'small' | 'medium' | 'large';
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility role (e.g. 'button') */
  accessibilityRole?: 'button' | 'link' | 'none';
}

/**
 * Reusable Card component with optional press functionality
 * 
 * Provides a consistent card container with shadow, rounded corners, and configurable padding.
 * Can be made pressable by providing an onPress callback.
 * 
 * @example
 * ```tsx
 * <Card padding="medium" onPress={handlePress}>
 *   <Typography>Card Content</Typography>
 * </Card>
 * ```
 */
const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padding = 'medium',
  accessibilityLabel,
  accessibilityRole,
}) => {
  const cardStyle = [
    styles.card,
    styles[`${padding}Padding`],
    onPress && styles.pressable,
    style,
  ];

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: UI_CONFIG.borderRadius.lg,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  pressable: {
    // Additional styles for pressable cards if needed
  },
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

export default Card;
