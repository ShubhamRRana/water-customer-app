import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { ERROR_MESSAGES } from '../../constants/config';
import { handleError } from '../../utils/errorHandler';
import { getErrorMessage } from '../../utils/errors';
import { AuthStackParamList } from '../../types/index';
import { Typography, Button, Card } from '../../components/common';
import { AuthScreenLayout } from '../../components/layouts';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';

type SocietyLoginNavigationProp = StackNavigationProp<AuthStackParamList, 'SocietyLogin'>;

interface Props {
  navigation: SocietyLoginNavigationProp;
}

function createSocietyLoginStyles(colors: ThemeColors) {
  return StyleSheet.create({
    formCard: { marginBottom: 24 },
    form: { marginBottom: 0 },
    inputContainer: { marginBottom: 20 },
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
    passwordInput: { flex: 1, paddingRight: 50 },
    eyeIcon: { position: 'absolute', right: 16, padding: 4 },
    inputError: { borderColor: colors.error },
    errorText: { color: colors.error, fontSize: 14, marginTop: 4 },
    submitButton: { marginTop: 16 },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    footerText: { fontSize: 16, color: colors.textSecondary },
    linkText: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });
}

const SocietyLoginScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createSocietyLoginStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { loginWithCredentialsAndRole, isLoading } = useAuthStore();

  const handleEmailChange = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeEmail(text);
    setEmail(sanitized);

    if (sanitized) {
      const validation = ValidationUtils.validateEmail(sanitized);
      const errMsg = validation.error;
      if (!validation.isValid && errMsg) {
        setErrors(prev => ({ ...prev, email: errMsg }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      }
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);

    if (text) {
      const validation = ValidationUtils.validatePassword(text);
      const errMsg = validation.error;
      if (!validation.isValid && errMsg) {
        setErrors(prev => ({ ...prev, password: errMsg }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next.password;
          return next;
        });
      }
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
  };

  const handleLogin = async () => {
    const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
    const emailValidation = ValidationUtils.validateEmail(sanitizedEmail);
    const passwordValidation = ValidationUtils.validatePassword(password);

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      setErrors({
        ...(emailValidation.error && { email: emailValidation.error }),
        ...(passwordValidation.error && { password: passwordValidation.error }),
      });
      return;
    }

    setErrors({});

    try {
      await loginWithCredentialsAndRole(sanitizedEmail, password, 'customer', 'society');
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Login failed');
      const isRoleMismatch =
        errorMessage.includes('not found with selected role') ||
        errorMessage.includes('User not found with selected role');

      handleError(error, {
        context: { operation: 'society_login', email: sanitizedEmail, preferredRole: 'customer' },
        userFacing: true,
        ...(isRoleMismatch && { alertMessage: ERROR_MESSAGES.auth.roleMismatch }),
      });
    }
  };

  return (
    <AuthScreenLayout
      watermarkIcon="business-outline"
      title="Society sign in"
      subtitle="Use your society account to coordinate water orders for your community"
      backLabel="Account type"
      onBack={() => navigation.navigate('RoleSelection')}
      bottomNotice="Reset password is not available yet. Please keep your password safe."
    >
      <Card padding="large" style={styles.formCard}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>
              Email address
            </Typography>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email ? (
              <Typography variant="caption" style={styles.errorText}>
                {errors.email}
              </Typography>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>
              Password
            </Typography>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
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

          <Button
            title={isLoading ? 'Signing in…' : 'Sign in to society account'}
            onPress={handleLogin}
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
            style={styles.submitButton}
          />
        </View>
      </Card>

      <View style={styles.footer}>
        <Typography variant="body" style={styles.footerText}>
          New to TankerHub?{' '}
        </Typography>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Register', { accountKind: 'society' })}
        >
          <Typography variant="body" style={styles.linkText}>
            Create an account
          </Typography>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
};

export default SocietyLoginScreen;
