import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../../services/auth.service';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { AuthStackParamList } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Typography, Button, Card } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type ForgotPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
  route: ForgotPasswordScreenRouteProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (text: string) => {
    const sanitized = SanitizationUtils.sanitizePhone(text);
    setPhone(sanitized);
    if (sanitized) {
      const validation = ValidationUtils.validatePhone(sanitized);
      if (!validation.isValid && validation.error) {
        setErrors(prev => ({ ...prev, phone: validation.error }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next.phone;
          return next;
        });
      }
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    const sanitizedPhone = SanitizationUtils.sanitizePhone(phone);
    const phoneValidation = ValidationUtils.validatePhone(sanitizedPhone);
    if (!phoneValidation.isValid) {
      setErrors({ phone: phoneValidation.error || 'Invalid phone number' });
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    const result = await AuthService.requestPasswordResetOtpByPhone(sanitizedPhone);
    setIsSubmitting(false);
    if (result.success) {
      navigation.navigate('ResetPassword', { phone: AuthService.toE164Phone(sanitizedPhone) });
    } else {
      setErrors({ phone: result.error });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Typography variant="h1" style={styles.title}>
              Reset password
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Enter your phone number and we'll send an OTP to reset your password.
            </Typography>
          </View>

          <Card padding="large" style={styles.formCard}>
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Typography variant="body" style={styles.label}>
                  Phone Number
                </Typography>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  editable={!isSubmitting}
                />
                {errors.phone && (
                  <Typography variant="caption" style={styles.errorText}>
                    {errors.phone}
                  </Typography>
                )}
              </View>

              <Button
                title={isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                onPress={handleSubmit}
                variant="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
                style={styles.submitButton}
              />
            </View>
          </Card>

          <View style={styles.footer}>
            <Typography variant="body" style={styles.footerText}>
              Remember your password?{' '}
            </Typography>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Login')}
              disabled={isSubmitting}
            >
              <Typography variant="body" style={styles.linkText}>
                Sign In
              </Typography>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'PlayfairDisplay-Regular',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 24,
  },
  form: {
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    color: UI_CONFIG.colors.text,
  },
  inputError: {
    borderColor: UI_CONFIG.colors.error,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  linkText: {
    fontSize: 16,
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordScreen;
