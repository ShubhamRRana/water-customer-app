import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants/config';
import { handleError } from '../../utils/errorHandler';
import { getErrorMessage } from '../../utils/errors';
import { AuthStackParamList } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthService } from '../../services/auth.service';
import { Typography, DriverIcon, AdminIcon, CustomerIcon } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
}

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  
  const { login, loginWithCredentialsAndRole, isLoading } = useAuthStore();

  // Real-time validation handlers
  const handleEmailChange = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeEmail(text);
    setEmail(sanitized);
    
    if (sanitized) {
      const validation = ValidationUtils.validateEmail(sanitized);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, email: validation.error }));
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
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, password: validation.error }));
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
        email: emailValidation.error,
        password: passwordValidation.error,
      });
      return;
    }

    setErrors({});

    try {
      const preferredRole = route?.params?.preferredRole;
      
      // If preferredRole is provided, use loginWithCredentialsAndRole
      // This sets the pending role BEFORE auth to prevent race conditions
      if (preferredRole) {
        await loginWithCredentialsAndRole(sanitizedEmail, password, preferredRole);
        return;
      }
      
      // No preferredRole - use standard login
      const loginResult = await AuthService.login(sanitizedEmail, password);
      
      if (!loginResult.success) {
        Alert.alert('Login Failed', loginResult.error || ERROR_MESSAGES.auth.invalidCredentials);
        return;
      }
      
      // If login requires role selection but no preferredRole was provided, show error
      if (loginResult.requiresRoleSelection && loginResult.availableRoles) {
        Alert.alert('Login Failed', 'Please select a role from the role selection screen first.');
        navigation.navigate('RoleEntry');
        return;
      }
      
      // Single account login successful
      if (loginResult.user) {
        // Use the store's login method to set the user state
        await login(sanitizedEmail, password);
      }
    } catch (error) {
      // Check if error is due to role mismatch for custom message
      const errorMessage = getErrorMessage(error, 'Login failed');
      const isRoleMismatch = errorMessage.includes('not found with selected role') || errorMessage.includes('User not found with selected role');
      
      handleError(error, {
        context: { operation: 'login', email: sanitizedEmail, preferredRole },
        userFacing: true,
        alertMessage: isRoleMismatch ? ERROR_MESSAGES.auth.roleMismatch : undefined,
      });
    }
  };

  const preferredRole = route?.params?.preferredRole;

  // Generate non-overlapping positions for watermarks
  const watermarkPositions = useMemo(() => {
    if (!preferredRole) return [];
    
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const iconSize = 10;
    const minSpacing = 70; // Minimum spacing between icons to prevent overlap
    const positions: Array<{ top: number; left: number }> = [];
    const watermarkCount = 30;
    const maxAttempts = 100; // Maximum attempts to find a non-overlapping position
    
    // Helper function to check if a position overlaps with existing positions
    const hasOverlap = (newTop: number, newLeft: number, existingPositions: Array<{ top: number; left: number }>) => {
      for (const pos of existingPositions) {
        const distance = Math.sqrt(
          Math.pow(newTop - pos.top, 2) + Math.pow(newLeft - pos.left, 2)
        );
        if (distance < minSpacing) {
          return true;
        }
      }
      return false;
    };
    
    for (let i = 0; i < watermarkCount; i++) {
      let attempts = 0;
      let top: number, left: number;
      
      // Try to find a non-overlapping position
      do {
        top = Math.random() * (screenHeight - iconSize - 40) + 20; // Leave some margin from edges
        left = Math.random() * (screenWidth - iconSize - 40) + 20;
        attempts++;
        
        // If we've tried too many times, use a grid-based fallback
        if (attempts > maxAttempts) {
          // Use a grid-based approach as fallback
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
  }, [preferredRole]);

  const renderWatermarkIcon = () => {
    if (!preferredRole) return null;
    
    const iconProps = {
      size: 50,
      color: UI_CONFIG.colors.textSecondary,
    };

    const IconComponent = 
      preferredRole === 'customer' ? CustomerIcon :
      preferredRole === 'driver' ? DriverIcon :
      preferredRole === 'admin' ? AdminIcon :
      null;

    if (!IconComponent) return null;

    return <IconComponent {...iconProps} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {preferredRole && watermarkPositions.map((position, index) => (
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
          <Typography variant="h1" style={styles.title}>Welcome Back</Typography>
          <Typography variant="body" style={styles.subtitle}>Sign in to your account</Typography>
        </View>

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

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled, isButtonPressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={isLoading}
            onPressIn={() => setIsButtonPressed(true)}
            onPressOut={() => setIsButtonPressed(false)}
          >
            <Typography variant="body" style={styles.buttonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Typography>
          </TouchableOpacity>
        </View>

        {route?.params?.preferredRole !== 'driver' && (
          <View style={styles.footer}>
            <Typography variant="body" style={styles.footerText}>Don't have an account? </Typography>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { preferredRole: route?.params?.preferredRole })}>
              <Typography variant="body" style={styles.linkText}>Sign Up</Typography>
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
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  form: {
    marginBottom: 32,
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
  button: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
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
  buttonDisabled: {
    backgroundColor: UI_CONFIG.colors.disabled,
    borderColor: UI_CONFIG.colors.disabled,
    shadowOpacity: 0.3,
  },
  buttonPressed: {
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  buttonText: {
    color: UI_CONFIG.colors.textLight,
    fontSize: 18,
    fontWeight: '600',
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
    color: UI_CONFIG.colors.primary,
    fontWeight: '600',
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

