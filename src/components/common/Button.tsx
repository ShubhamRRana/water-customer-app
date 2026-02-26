import React, { memo, useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import Typography from './Typography';

/**
 * Button component props
 */
interface ButtonProps {
  /** Button text to display */
  title: string;
  /** Callback function called when button is pressed */
  onPress: () => void;
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in loading state (shows spinner) */
  loading?: boolean;
  /** Additional styles to apply to the button */
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable Button component with multiple variants and sizes
 * 
 * Supports primary, secondary, and outline variants with loading and disabled states.
 * 
 * @example
 * ```tsx
 * <Button 
 *   title="Submit" 
 *   onPress={handleSubmit} 
 *   variant="primary" 
 *   loading={isSubmitting}
 * />
 * ```
 */
const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  const buttonStyle = useMemo(() => [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ], [variant, size, disabled, style]);

  const textStyle = useMemo(() => [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
  ], [variant, size, disabled]);

  const indicatorColor = useMemo(() => 
    variant === 'primary' || variant === 'secondary' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.primary,
    [variant]
  );

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={indicatorColor}
          size="small"
        />
      ) : (
        <Typography variant="body" style={textStyle}>{title}</Typography>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_CONFIG.colors.primary,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 6,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  // Variants
  primary: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  secondary: {
    backgroundColor: UI_CONFIG.colors.secondary,
    borderColor: UI_CONFIG.colors.secondary,
  },
  outline: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
  },
  // Sizes
  small: {
    paddingHorizontal: 27,
    paddingVertical: 11,
  },
  medium: {
    paddingHorizontal: 27,
    paddingVertical: 11,
  },
  large: {
    paddingHorizontal: 27,
    paddingVertical: 11,
  },
  // States
  disabled: {
    backgroundColor: UI_CONFIG.colors.disabled,
    borderColor: UI_CONFIG.colors.disabled,
    shadowOpacity: 0.3,
  },
  // Text styles
  text: {
    fontWeight: '600',
    fontSize: 18,
  },
  primaryText: {
    color: UI_CONFIG.colors.textLight,
  },
  secondaryText: {
    color: UI_CONFIG.colors.textLight,
  },
  outlineText: {
    color: UI_CONFIG.colors.primary,
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
    color: UI_CONFIG.colors.textSecondary,
  },
});

export default memo(Button);
