import React, { useMemo, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types/index';
import { AuthScreenLayout } from '../../components/layouts';
import { Typography, Button, Card } from '../../components/common';
import { SUCCESS_MESSAGES } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils } from '../../utils';
import { getErrorMessage } from '../../utils/errors';

type SetNewPasswordNav = StackNavigationProp<AuthStackParamList, 'SetNewPassword'>;

interface Props {
  navigation: SetNewPasswordNav;
}

function createSetNewPasswordStyles(colors: ThemeColors) {
  return StyleSheet.create({
    formCard: {
      marginBottom: 24,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    passwordInput: {
      flex: 1,
      paddingRight: 50,
    },
    eyeIcon: {
      position: 'absolute',
      right: 16,
      padding: 4,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 4,
    },
    submitButton: {
      marginTop: 8,
    },
  });
}

const SetNewPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createSetNewPasswordStyles(colors), [colors]);
  const { updatePassword, isLoading, customerAccountKind } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const goSignIn = () => {
    if (customerAccountKind === 'society') {
      navigation.navigate('SocietyLogin');
    } else {
      navigation.navigate('Login', { accountType: 'individual' });
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text) {
      const validation = ValidationUtils.validatePassword(text);
      const errMsg = validation.error;
      if (!validation.isValid && errMsg) {
        setErrors((prev) => ({ ...prev, password: errMsg }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.password;
          return next;
        });
      }
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text) {
      const validation = ValidationUtils.validateConfirmPassword(password, text);
      const errMsg = validation.error;
      if (!validation.isValid && errMsg) {
        setErrors((prev) => ({ ...prev, confirmPassword: errMsg }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.confirmPassword;
          return next;
        });
      }
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    const passwordValidation = ValidationUtils.validatePassword(password);
    const confirmValidation = ValidationUtils.validateConfirmPassword(password, confirmPassword);

    if (!passwordValidation.isValid || !confirmValidation.isValid) {
      setErrors({
        ...(passwordValidation.error && { password: passwordValidation.error }),
        ...(confirmValidation.error && { confirmPassword: confirmValidation.error }),
      });
      return;
    }
    setErrors({});

    try {
      await updatePassword(password);
      Alert.alert('Password updated', SUCCESS_MESSAGES.auth.setNewPasswordSuccess, [
        { text: 'Sign in', onPress: goSignIn },
      ]);
    } catch (error) {
      Alert.alert('Could not update password', getErrorMessage(error, 'Please try again.'));
    }
  };

  return (
    <AuthScreenLayout
      watermarkIcon="lock-closed-outline"
      title={SUCCESS_MESSAGES.auth.setNewPasswordTitle}
      subtitle={SUCCESS_MESSAGES.auth.setNewPasswordSubtitle}
      backLabel="Sign in"
      onBack={goSignIn}
    >
      <Card padding="large" style={styles.formCard}>
        <View style={styles.inputContainer}>
          <Typography variant="body" style={styles.label}>
            New password
          </Typography>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Typography variant="caption" style={styles.errorText}>
              {errors.password}
            </Typography>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Typography variant="body" style={styles.label}>
            Confirm new password
          </Typography>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                errors.confirmPassword && styles.inputError,
              ]}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              accessibilityRole="button"
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Typography variant="caption" style={styles.errorText}>
              {errors.confirmPassword}
            </Typography>
          ) : null}
        </View>

        <Button
          title={isLoading ? 'Updating…' : SUCCESS_MESSAGES.auth.setNewPasswordSubmit}
          onPress={handleSubmit}
          variant="primary"
          disabled={isLoading}
          loading={isLoading}
          style={styles.submitButton}
        />
      </Card>
    </AuthScreenLayout>
  );
};

export default SetNewPasswordScreen;
