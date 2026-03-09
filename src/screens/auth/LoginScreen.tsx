import React, { useState, useMemo } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { ERROR_MESSAGES } from '../../constants/config';
import { handleError } from '../../utils/errorHandler';
import { getErrorMessage } from '../../utils/errors';
import { AuthStackParamList } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Typography, CustomerIcon, Button, Card } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { loginWithCredentialsAndRole, isLoading } = useAuthStore();

  // Real-time validation handlers
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
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
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
          const newErrors = { ...prev };
          delete newErrors.password;
          return newErrors;
        });
      }
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }
  };

  const handleLogin = async () => {
    // Sanitize inputs
    const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
    
    // Validate inputs
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
      // Customer app: always log in with customer role
      await loginWithCredentialsAndRole(sanitizedEmail, password, 'customer');
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Login failed');
      const isRoleMismatch = errorMessage.includes('not found with selected role') || errorMessage.includes('User not found with selected role');

      handleError(error, {
        context: { operation: 'login', email: sanitizedEmail, preferredRole: 'customer' },
        userFacing: true,
        ...(isRoleMismatch && { alertMessage: ERROR_MESSAGES.auth.roleMismatch }),
      });
    }
  };

  // Customer app: watermark for customer-only login
  const watermarkPositions = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const iconSize = 10;
    const minSpacing = 70;
    const positions: Array<{ top: number; left: number }> = [];
    const watermarkCount = 30;
    const maxAttempts = 100;

    const hasOverlap = (newTop: number, newLeft: number, existingPositions: Array<{ top: number; left: number }>) => {
      for (const pos of existingPositions) {
        const distance = Math.sqrt(
          Math.pow(newTop - pos.top, 2) + Math.pow(newLeft - pos.left, 2)
        );
        if (distance < minSpacing) return true;
      }
      return false;
    };

    for (let i = 0; i < watermarkCount; i++) {
      let attempts = 0;
      let top: number, left: number;
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

  const renderWatermarkIcon = () => {
    const iconProps = { size: 50, color: UI_CONFIG.colors.textSecondary };
    return <CustomerIcon {...iconProps} />;
  };

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
            {renderWatermarkIcon()}
          </View>
        ))}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Typography variant="h1" style={styles.title}>Welcome to TankerHub</Typography>
          <Typography variant="body" style={styles.subtitle}>Sign in to your account</Typography>
        </View>

        <Card padding="large" style={styles.formCard}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Email Address</Typography>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Typography variant="caption" style={styles.errorText}>{errors.email}</Typography>}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Password</Typography>
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
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={UI_CONFIG.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Typography variant="caption" style={styles.errorText}>{errors.password}</Typography>}
          </View>

          <Button
            title={isLoading ? 'Signing In...' : 'Sign In'}
            onPress={handleLogin}
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
            style={styles.submitButton}
          />
        </View>
        </Card>

        <View style={styles.footer}>
          <Typography variant="body" style={styles.footerText}>Don't have an account? </Typography>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Register')}>
            <Typography variant="body" style={styles.linkText}>Sign Up</Typography>
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
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    zIndex: 1,
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
});

export default LoginScreen;

