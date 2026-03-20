import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { ERROR_MESSAGES } from '../../constants/config';
import { handleError } from '../../utils/errorHandler';
import { getErrorMessage } from '../../utils/errors';
import { AuthStackParamList } from '../../types/index';
import { Typography, Button, Card } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type SocietyLoginNavigationProp = StackNavigationProp<AuthStackParamList, 'SocietyLogin'>;

interface Props {
  navigation: SocietyLoginNavigationProp;
}

const SocietyLoginScreen: React.FC<Props> = ({ navigation }) => {
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

  const watermarkPositions = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const iconSize = 50;
    const minSpacing = 70;
    const positions: Array<{ top: number; left: number }> = [];
    const watermarkCount = 24;
    const maxAttempts = 100;

    const hasOverlap = (newTop: number, newLeft: number, existing: Array<{ top: number; left: number }>) => {
      for (const pos of existing) {
        const distance = Math.sqrt(Math.pow(newTop - pos.top, 2) + Math.pow(newLeft - pos.left, 2));
        if (distance < minSpacing) return true;
      }
      return false;
    };

    for (let i = 0; i < watermarkCount; i++) {
      let attempts = 0;
      let top: number;
      let left: number;
      do {
        top = Math.random() * (screenHeight - iconSize - 40) + 20;
        left = Math.random() * (screenWidth - iconSize - 40) + 20;
        attempts++;
        if (attempts > maxAttempts) {
          const cols = Math.floor(screenWidth / minSpacing);
          const rows = Math.floor(screenHeight / minSpacing);
          const gridIndex = i % (cols * rows);
          const col = gridIndex % cols;
          const row = Math.floor(gridIndex / cols);
          top = row * minSpacing + 20;
          left = col * minSpacing + 20;
          break;
        }
      } while (hasOverlap(top, left, positions));
      positions.push({ top, left });
    }
    return positions;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {watermarkPositions.map((position, index) => (
          <View
            key={index}
            style={[
              styles.watermarkContainer,
              {
                top: position.top,
                left: position.left,
              },
            ]}
          >
            <Ionicons name="business-outline" size={50} color={UI_CONFIG.colors.textSecondary} />
          </View>
        ))}

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.navigate('RoleSelection')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={UI_CONFIG.colors.accent} />
            <Typography variant="body" style={styles.backLabel}>
              Account type
            </Typography>
          </TouchableOpacity>

          <View style={styles.header}>
            <Typography variant="h1" style={styles.title}>
              Society sign in
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Use your society account to coordinate water orders for your community
            </Typography>
          </View>

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
                      color={UI_CONFIG.colors.textSecondary}
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
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Register')}>
              <Typography variant="body" style={styles.linkText}>
                Create an account
              </Typography>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.bottomNoticeWrapper} pointerEvents="none">
          <Typography variant="caption" style={styles.bottomNoticeText}>
            Reset password is not available yet. Please keep your password safe.
          </Typography>
        </View>
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
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 96,
    zIndex: 1,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backLabel: {
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'PlayfairDisplay-Regular',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  watermarkContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.06,
    zIndex: 0,
    pointerEvents: 'none',
  },
  bottomNoticeWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 2,
    alignItems: 'center',
  },
  bottomNoticeText: {
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    lineHeight: 18,
  },
});

export default SocietyLoginScreen;
