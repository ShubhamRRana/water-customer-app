import React, { useMemo, useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types/index';
import { AuthScreenLayout } from '../../components/layouts';
import { Typography, Button, Card } from '../../components/common';
import { SUCCESS_MESSAGES } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { getErrorMessage } from '../../utils/errors';

type ForgotPasswordNav = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type ForgotPasswordRoute = RouteProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordNav;
  route: ForgotPasswordRoute;
}

function createForgotPasswordStyles(colors: ThemeColors) {
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
    successText: {
      color: colors.text,
      lineHeight: 22,
      marginBottom: 16,
    },
  });
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const accountKind = route.params?.accountKind ?? 'individual';
  const colors = useThemeColors();
  const styles = useMemo(() => createForgotPasswordStyles(colors), [colors]);
  const { requestPasswordReset, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const goSignIn = () => {
    if (accountKind === 'society') {
      navigation.navigate('SocietyLogin');
    } else {
      navigation.navigate('Login', { accountType: 'individual' });
    }
  };

  const handleEmailChange = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeEmail(text);
    setEmail(sanitized);
    if (sanitized) {
      const validation = ValidationUtils.validateEmail(sanitized);
      setEmailError(validation.isValid ? undefined : validation.error);
    } else {
      setEmailError(undefined);
    }
  };

  const handleSubmit = async () => {
    const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
    const emailValidation = ValidationUtils.validateEmail(sanitizedEmail, true);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error);
      return;
    }
    setEmailError(undefined);

    try {
      await requestPasswordReset(sanitizedEmail);
      setSent(true);
    } catch (error) {
      Alert.alert('Could not send reset link', getErrorMessage(error, 'Please try again later.'));
    }
  };

  return (
    <AuthScreenLayout
      watermarkIcon="key-outline"
      title={
        sent
          ? SUCCESS_MESSAGES.auth.forgotPasswordSentTitle
          : SUCCESS_MESSAGES.auth.forgotPasswordTitle
      }
      subtitle={
        sent
          ? SUCCESS_MESSAGES.auth.forgotPasswordSentMessage
          : SUCCESS_MESSAGES.auth.forgotPasswordSubtitle
      }
      backLabel="Sign in"
      onBack={goSignIn}
    >
      <Card padding="large" style={styles.formCard}>
        {sent ? (
          <>
            {email ? (
              <Typography variant="caption" style={{ color: colors.accent, marginBottom: 12, fontWeight: '600' }}>
                {email}
              </Typography>
            ) : null}
            <Typography variant="body" style={styles.successText}>
              Open the email on this device and tap the link. The app will open so you can set a new password.
            </Typography>
            <Button
              title={SUCCESS_MESSAGES.auth.forgotPasswordBackToSignIn}
              onPress={goSignIn}
              variant="primary"
            />
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.label}>
                Email address
              </Typography>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError ? (
                <Typography variant="caption" style={styles.errorText}>
                  {emailError}
                </Typography>
              ) : null}
            </View>
            <Button
              title={isLoading ? 'Sending…' : SUCCESS_MESSAGES.auth.forgotPasswordSubmit}
              onPress={handleSubmit}
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              style={styles.submitButton}
            />
          </>
        )}
      </Card>
    </AuthScreenLayout>
  );
};

export default ForgotPasswordScreen;
