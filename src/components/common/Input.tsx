import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import Typography from './Typography';

/**
 * Input component props
 * Extends React Native's TextInputProps with additional styling and error handling
 */
interface InputProps extends TextInputProps {
  /** Optional label text displayed above the input */
  label?: string;
  /** Error message to display below the input */
  error?: string;
  /** Additional styles for the container */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Reusable Input component with label and error display
 * 
 * Extends React Native's TextInput with consistent styling, label support, and error handling.
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   value={email}
 *   onChangeText={setEmail}
 *   error={emailError}
 *   keyboardType="email-address"
 * />
 * ```
 */
const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Typography variant="body" style={styles.label}>{label}</Typography>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={UI_CONFIG.colors.textSecondary}
        {...props}
      />
      {error && <Typography variant="caption" style={styles.errorText}>{error}</Typography>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: UI_CONFIG.fontSize.md,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: UI_CONFIG.borderRadius.lg,
    padding: UI_CONFIG.spacing.md,
    fontSize: UI_CONFIG.fontSize.md,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    color: UI_CONFIG.colors.text,
  },
  inputError: {
    borderColor: UI_CONFIG.colors.error,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    fontSize: UI_CONFIG.fontSize.sm,
    marginTop: 4,
  },
});

export default Input;
