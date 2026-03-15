import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../../services/auth.service';
import { ValidationUtils } from '../../utils';
import { SUCCESS_MESSAGES, UI_CONFIG } from '../../constants/config';
import { AuthStackParamList } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Typography, Button, Card } from '../../components/common';

type ResetPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

interface Props {
  navigation: ResetPasswordScreenNavigationProp;
  route: ResetPasswordScreenRouteProp;
}

type Step = 'otp' | 'success';

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialPhone = route.params?.phone ?? '';
  const [phone, setPhone] = useState(initialPhone);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
    otp?: string;
    form?: string;
  }>({});
  const [step, setStep] = useState<Step>('otp');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
  }, [initialPhone]);

  const handleNewPasswordChange = (text: string) => {
    setNewPassword(text);
    if (text) {
      const validation = ValidationUtils.validatePassword(text);
      if (!validation.isValid && validation.error) {
        setErrors(prev => ({ ...prev, newPassword: validation.error }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next.newPassword;
          if (next.confirmPassword && text !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
          else if (next.confirmPassword && text === confirmPassword) delete next.confirmPassword;
          return next;
        });
      }
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.newPassword;
        return next;
      });
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text) {
      if (text !== newPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next.confirmPassword;
          return next;
        });
      }
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
  };

  const handleVerifyAndReset = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setErrors(prev => ({ ...prev, otp: 'Please enter the OTP sent to your phone.' }));
      return;
    }

    const passwordValidation = ValidationUtils.validatePassword(newPassword.trim());
    if (!passwordValidation.isValid) {
      setErrors(prev => ({ ...prev, newPassword: passwordValidation.error, otp: undefined }));
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.', otp: undefined }));
      return;
    }

    setErrors(prev => {
      const next = { ...prev };
      delete next.otp;
      delete next.newPassword;
      delete next.confirmPassword;
      return next;
    });
    setIsSubmitting(true);
    const result = await AuthService.verifyOtpAndUpdatePasswordByPhone(phone, trimmedOtp, newPassword.trim());
    setIsSubmitting(false);

    if (result.success) {
      await AuthService.logout();
      setStep('success');
    } else {
      setErrors({ otp: result.error });
    }
  };

  const handleResendOtp = async () => {
    if (!phone || isSubmitting) return;
    setErrors(prev => ({ ...prev, form: undefined }));
    setIsSubmitting(true);
    const result = await AuthService.requestPasswordResetOtpByPhone(phone);
    setIsSubmitting(false);
    if (result.success) {
      setOtp('');
    } else {
      setErrors(prev => ({ ...prev, form: result.error }));
    }
  };

  if (!initialPhone) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missingParamsContainer}>
          <Typography variant="body" style={styles.missingParamsText}>
            Missing phone number. Please request a new OTP from the previous screen.
          </Typography>
          <Button
            title="Back to Reset Password"
            onPress={() => navigation.navigate('ForgotPassword')}
            variant="primary"
            style={styles.backButton}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Typography variant="body" style={styles.linkText}>
              Back to Sign In
            </Typography>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              {step === 'otp'
                ? 'Enter the OTP sent to your phone and your new password below.'
                : SUCCESS_MESSAGES.auth.resetPasswordSuccess}
            </Typography>
          </View>

          <Card padding="large" style={styles.formCard}>
            {step === 'success' ? (
              <View style={styles.successBlock}>
                <Button
                  title="Back to Sign In"
                  onPress={() => navigation.navigate('Login')}
                  variant="primary"
                  style={styles.backButton}
                />
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Typography variant="body" style={styles.label}>
                    Phone (read-only)
                  </Typography>
                  <TextInput
                    style={[styles.input, styles.inputReadOnly]}
                    value={phone}
                    editable={false}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Typography variant="body" style={styles.label}>
                    OTP
                  </Typography>
                  <TextInput
                    style={[styles.input, errors.otp && styles.inputError]}
                    value={otp}
                    onChangeText={text => {
                      setOtp(text.replace(/\D/g, '').slice(0, 6));
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.otp;
                        return next;
                      });
                    }}
                    placeholder="Enter 6-digit code"
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isSubmitting}
                  />
                  {errors.otp && (
                    <Typography variant="caption" style={styles.errorText}>
                      {errors.otp}
                    </Typography>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <Typography variant="body" style={styles.label}>
                    New password
                  </Typography>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        errors.newPassword && styles.inputError,
                      ]}
                      value={newPassword}
                      onChangeText={handleNewPasswordChange}
                      secureTextEntry={!showNewPassword}
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={24}
                        color={UI_CONFIG.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.newPassword && (
                    <Typography variant="caption" style={styles.errorText}>
                      {errors.newPassword}
                    </Typography>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <Typography variant="body" style={styles.label}>
                    Confirm password
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
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={24}
                        color={UI_CONFIG.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && (
                    <Typography variant="caption" style={styles.errorText}>
                      {errors.confirmPassword}
                    </Typography>
                  )}
                </View>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={isSubmitting}
                  style={styles.resendLink}
                >
                  <Typography variant="body" style={styles.linkText}>
                    Resend OTP
                  </Typography>
                </TouchableOpacity>
                {errors.form && (
                  <Typography variant="caption" style={styles.errorText}>
                    {errors.form}
                  </Typography>
                )}
                <Button
                  title={isSubmitting ? 'Verifying...' : 'Verify & Reset Password'}
                  onPress={handleVerifyAndReset}
                  variant="primary"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  style={styles.submitButton}
                />
              </View>
            )}
          </Card>

          {step !== 'success' && (
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
          )}
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
  inputReadOnly: {
    opacity: 0.8,
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
  resendLink: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  successBlock: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 8,
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
  missingParamsContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  missingParamsText: {
    textAlign: 'center',
    marginBottom: 24,
    color: UI_CONFIG.colors.textSecondary,
  },
});

export default ResetPasswordScreen;
