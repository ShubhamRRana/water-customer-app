import React, { memo, useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  AccessibilityRole,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import Typography from './Typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

function createButtonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      borderRadius: UI_CONFIG.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.accent,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    small: {
      paddingHorizontal: 27,
      paddingVertical: 11,
    },
    medium: {
      paddingHorizontal: 27,
      paddingVertical: 11,
    },
    large: {
      paddingHorizontal: 32,
      paddingVertical: 14,
    },
    disabled: {
      backgroundColor: colors.disabled,
      borderColor: colors.disabled,
      shadowOpacity: 0.2,
    },
    text: {
      fontWeight: '600',
      fontSize: 18,
    },
    primaryText: {
      color: colors.textLight,
    },
    secondaryText: {
      color: colors.accent,
    },
    outlineText: {
      color: colors.accent,
    },
    smallText: {
      fontSize: 18,
    },
    mediumText: {
      fontSize: 18,
    },
    largeText: {
      fontSize: 18,
    },
    disabledText: {
      color: colors.textSecondary,
    },
  });
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityRole,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createButtonStyles(colors), [colors]);

  const buttonStyle = useMemo(
    () => [
      styles.button,
      styles[variant],
      styles[size],
      disabled && styles.disabled,
      style,
    ],
    [styles, variant, size, disabled, style]
  );

  const textStyle = useMemo(
    () => [styles.text, styles[`${variant}Text`], styles[`${size}Text`], disabled && styles.disabledText],
    [styles, variant, size, disabled]
  );

  const indicatorColor = useMemo(
    () => (variant === 'primary' ? colors.textLight : colors.accent),
    [colors.accent, colors.textLight, variant]
  );

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={accessibilityRole ?? 'button'}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <Typography variant="body" style={textStyle}>
          {title}
        </Typography>
      )}
    </TouchableOpacity>
  );
};

export default memo(Button);
