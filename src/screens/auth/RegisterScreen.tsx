import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants/config';
import { handleError } from '../../utils/errorHandler';
import { AuthStackParamList, UserRole } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterScreenRouteProp = RouteProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
  route: RegisterScreenRouteProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const role: UserRole = route?.params?.preferredRole ?? 'customer';
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
    phone?: string;
    businessName?: string;
  }>({});
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  
  const { register, isLoading } = useAuthStore();

  // Real-time validation handlers
  const handleNameChange = (text: string) => {
    // Allow spaces during typing - only remove invalid characters, preserve spaces
    const sanitized = text
      .replace(/[^a-zA-Z\s\-'.]/g, '') // Keep only letters, spaces, hyphens, apostrophes, and periods
      .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
    
    setName(sanitized);
    
    if (sanitized.trim()) {
      const validation = ValidationUtils.validateName(sanitized.trim());
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, name: validation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.name;
          return newErrors;
        });
      }
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.name;
        return newErrors;
      });
    }
  };

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

    // Also validate confirm password if it exists
    if (confirmPassword) {
      const confirmValidation = ValidationUtils.validateConfirmPassword(text, confirmPassword);
      if (!confirmValidation.isValid) {
        setErrors(prev => ({ ...prev, confirmPassword: confirmValidation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.confirmPassword;
          return newErrors;
        });
      }
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    
    if (text) {
      const validation = ValidationUtils.validateConfirmPassword(password, text);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, confirmPassword: validation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.confirmPassword;
          return newErrors;
        });
      }
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (text: string) => {
    // Only allow digits
    const sanitized = text.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = sanitized.slice(0, 10);
    setPhone(limited);
    
    // Always validate phone as required
    const validation = ValidationUtils.validatePhone(limited);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, phone: validation.error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  const handleBusinessNameChange = (text: string) => {
    // Allow spaces during typing - only remove invalid characters, preserve spaces
    const sanitized = text
      .replace(/[^a-zA-Z0-9\s&.,'-]/g, '') // Keep only letters, numbers, spaces, and common business characters
      .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
    
    setBusinessName(sanitized);
    
    if (sanitized.trim()) {
      const validation = ValidationUtils.validateBusinessName(sanitized.trim());
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, businessName: validation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.businessName;
          return newErrors;
        });
      }
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.businessName;
        return newErrors;
      });
    }
  };

  const handleRegister = async () => {
    // Sanitize inputs
    const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
    const sanitizedName = SanitizationUtils.sanitizeName(name);
    const sanitizedPhone = SanitizationUtils.sanitizePhone(phone);
    const sanitizedBusinessName = role === 'admin' ? SanitizationUtils.sanitizeBusinessName(businessName) : '';
    
    // Validate inputs
    const emailValidation = ValidationUtils.validateEmail(sanitizedEmail);
    const passwordValidation = ValidationUtils.validatePassword(password);
    const nameValidation = ValidationUtils.validateName(sanitizedName);
    const confirmPasswordValidation = ValidationUtils.validateConfirmPassword(password, confirmPassword);
    const phoneValidation = ValidationUtils.validatePhone(sanitizedPhone);
    const businessNameValidation = role === 'admin' 
      ? ValidationUtils.validateBusinessName(sanitizedBusinessName.trim(), true)
      : { isValid: true };
    
    const newErrors: Record<string, string> = {};
    
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || '';
    }
    
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error || '';
    }
    
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error || '';
    }
    
    if (!confirmPasswordValidation.isValid) {
      newErrors.confirmPassword = confirmPasswordValidation.error || '';
    }

    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.error || '';
    }

    if (role === 'admin' && !businessNameValidation.isValid) {
      newErrors.businessName = businessNameValidation.error || '';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      await register(sanitizedEmail, password, sanitizedName, role, sanitizedPhone, sanitizedBusinessName.trim() || undefined);
      Alert.alert('Success', SUCCESS_MESSAGES.auth.registerSuccess);
    } catch (error) {
      handleError(error, {
        context: { operation: 'register', email: sanitizedEmail, role },
        userFacing: true,
      });
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
          <Typography variant="h1" style={styles.title}>Create Account</Typography>
          <Typography variant="body" style={styles.subtitle}>Sign up to get started</Typography>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Full Name</Typography>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={handleNameChange}
              autoCapitalize="words"
              textContentType="name"
            />
            {errors.name && <Typography variant="caption" style={styles.errorText}>{errors.name}</Typography>}
          </View>

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
            <Typography variant="body" style={styles.label}>Phone Number</Typography>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone && <Typography variant="caption" style={styles.errorText}>{errors.phone}</Typography>}
          </View>

          {role === 'admin' && (
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.label}>Business Name</Typography>
              <TextInput
                style={[styles.input, errors.businessName && styles.inputError]}
                value={businessName}
                onChangeText={handleBusinessNameChange}
                autoCapitalize="words"
                placeholder="Enter your business name"
                maxLength={100}
              />
              {errors.businessName && <Typography variant="caption" style={styles.errorText}>{errors.businessName}</Typography>}
            </View>
          )}

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

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Confirm Password</Typography>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry={!showConfirmPassword}
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
            {errors.confirmPassword && <Typography variant="caption" style={styles.errorText}>{errors.confirmPassword}</Typography>}
          </View>

          {/* Account Type selection removed; role is determined before registration */}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled, isButtonPressed && styles.buttonPressed]}
            onPress={handleRegister}
            disabled={isLoading}
            onPressIn={() => setIsButtonPressed(true)}
            onPressOut={() => setIsButtonPressed(false)}
          >
            <Typography variant="body" style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Typography>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Typography variant="body" style={styles.footerText}>Already have an account? </Typography>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Typography variant="body" style={styles.linkText}>Sign In</Typography>
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
});

export default RegisterScreen;
