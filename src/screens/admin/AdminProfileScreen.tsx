import React, { useEffect, useState, useRef, useReducer, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import ProfileHeader from '../../components/admin/ProfileHeader';
import EditProfileForm from '../../components/admin/EditProfileForm';
import { useAuthStore } from '../../store/authStore';
import { User, isAdminUser } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { getErrorMessage } from '../../utils/errors';
import { AuthService } from '../../services/auth.service';

type AdminProfileScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Profile'>;

// Form state interface
interface FormState {
  businessName: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  businessName?: string;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

interface AppState {
  isEditing: boolean;
  editForm: FormState;
  formErrors: FormErrors;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isSaving: boolean;
  imageError: boolean;
  imageLoading: boolean;
  isDirty: boolean;
  menuVisible: boolean;
  networkError: string | null;
  initialForm: FormState | null;
}

type AppAction =
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'UPDATE_FIELD'; field: keyof FormState; value: string }
  | { type: 'SET_ERRORS'; payload: FormErrors }
  | { type: 'CLEAR_ERROR'; field: keyof FormErrors }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY' }
  | { type: 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY' }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_IMAGE_ERROR'; payload: boolean }
  | { type: 'SET_IMAGE_LOADING'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_MENU_VISIBLE'; payload: boolean }
  | { type: 'SET_NETWORK_ERROR'; payload: string | null }
  | { type: 'RESET_FORM'; payload: FormState }
  | { type: 'INITIALIZE_FORM'; payload: FormState };

const initialState: AppState = {
  isEditing: false,
  editForm: {
    businessName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  },
  formErrors: {},
  showPassword: false,
  showConfirmPassword: false,
  isSaving: false,
  imageError: false,
  imageLoading: true,
  isDirty: false,
  menuVisible: false,
  networkError: null,
  initialForm: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_EDITING':
      return { ...state, isEditing: action.payload };
    case 'UPDATE_FIELD':
      return {
        ...state,
        editForm: { ...state.editForm, [action.field]: action.value },
      };
    case 'SET_ERRORS':
      return { ...state, formErrors: action.payload };
    case 'CLEAR_ERROR':
      const newErrors = { ...state.formErrors };
      delete newErrors[action.field];
      return { ...state, formErrors: newErrors };
    case 'TOGGLE_PASSWORD_VISIBILITY':
      return { ...state, showPassword: !state.showPassword };
    case 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY':
      return { ...state, showConfirmPassword: !state.showConfirmPassword };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_IMAGE_ERROR':
      return { ...state, imageError: action.payload };
    case 'SET_IMAGE_LOADING':
      return { ...state, imageLoading: action.payload };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    case 'SET_MENU_VISIBLE':
      return { ...state, menuVisible: action.payload };
    case 'SET_NETWORK_ERROR':
      return { ...state, networkError: action.payload };
    case 'RESET_FORM':
      return {
        ...state,
        editForm: action.payload,
        formErrors: {},
        isDirty: false,
      };
    case 'INITIALIZE_FORM':
      return {
        ...state,
        editForm: action.payload,
        initialForm: action.payload,
        isDirty: false,
        formErrors: {},
      };
    default:
      return state;
  }
};

// Debounce utility
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const AdminProfileScreen: React.FC = () => {
  const navigation = useNavigation<AdminProfileScreenNavigationProp>();
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Debounced form values for validation
  const debouncedBusinessName = useDebounce(state.editForm.businessName, 500);
  const debouncedName = useDebounce(state.editForm.name, 500);
  const debouncedEmail = useDebounce(state.editForm.email, 500);
  const debouncedPhone = useDebounce(state.editForm.phone, 500);
  const debouncedPassword = useDebounce(state.editForm.password, 500);

  // Initialize form when user data is available
  useEffect(() => {
    if (user && isAdminUser(user)) {
      const initialForm: FormState = {
        businessName: user.businessName || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        confirmPassword: '',
      };
      dispatch({ type: 'INITIALIZE_FORM', payload: initialForm });
      dispatch({ type: 'SET_IMAGE_LOADING', payload: false });
    }
  }, [user]);

  // Track dirty state
  useEffect(() => {
    if (!state.isEditing || !user || !state.initialForm) return;
    
    const hasChanges = 
      state.editForm.businessName.trim() !== (state.initialForm.businessName || '') ||
      state.editForm.name.trim() !== (state.initialForm.name || '') ||
      state.editForm.email.trim() !== (state.initialForm.email || '') ||
      state.editForm.phone.trim() !== (state.initialForm.phone || '') ||
      (state.editForm.password !== '' && state.editForm.password.trim() !== '') ||
      (state.editForm.confirmPassword !== '' && state.editForm.confirmPassword.trim() !== '');
    
    dispatch({ type: 'SET_DIRTY', payload: hasChanges });
  }, [state.editForm, state.isEditing, user, state.initialForm]);

  // Real-time validation with debouncing
  useEffect(() => {
    if (!state.isEditing) return;

    const errors: FormErrors = { ...state.formErrors };

    // Validate business name
    if (debouncedBusinessName.trim()) {
      const trimmed = debouncedBusinessName.trim();
      if (trimmed.length < 2) {
        errors.businessName = 'Business name must be at least 2 characters long';
      } else if (trimmed.length > 100) {
        errors.businessName = 'Business name must be less than 100 characters';
      } else {
        delete errors.businessName;
      }
    }

    // Validate name
    if (debouncedName.trim()) {
      const nameValidation = ValidationUtils.validateName(debouncedName.trim());
      if (!nameValidation.isValid) {
        errors.name = nameValidation.error;
      } else {
        delete errors.name;
      }
    }

    // Validate email
    if (debouncedEmail.trim()) {
      const emailValidation = ValidationUtils.validateEmail(debouncedEmail.trim());
      if (!emailValidation.isValid) {
        errors.email = emailValidation.error;
      } else {
        delete errors.email;
      }
    }

    // Validate phone (required)
    const phoneValidation = ValidationUtils.validatePhone(debouncedPhone.trim());
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    } else {
      delete errors.phone;
    }

    // Validate password if provided
    if (debouncedPassword) {
      const passwordValidation = ValidationUtils.validatePassword(debouncedPassword);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.error;
      } else {
        delete errors.password;
      }
    }

    if (state.editForm.password && state.editForm.password !== state.editForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    } else if (state.editForm.confirmPassword && state.editForm.password === state.editForm.confirmPassword) {
      delete errors.confirmPassword;
    }

    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, [debouncedBusinessName, debouncedName, debouncedEmail, debouncedPhone, debouncedPassword, state.editForm.password, state.editForm.confirmPassword, state.isEditing]);



  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Validate business name
    const businessNameTrimmed = state.editForm.businessName.trim();
    if (!businessNameTrimmed) {
      errors.businessName = 'Business name is required';
    } else if (businessNameTrimmed.length < 2) {
      errors.businessName = 'Business name must be at least 2 characters long';
    } else if (businessNameTrimmed.length > 100) {
      errors.businessName = 'Business name must be less than 100 characters';
    }

    // Validate name
    const nameValidation = ValidationUtils.validateName(state.editForm.name.trim());
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
    }

    // Validate email
    const emailValidation = ValidationUtils.validateEmail(state.editForm.email.trim());
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }

    // Validate phone (required)
    const phoneValidation = ValidationUtils.validatePhone(state.editForm.phone.trim());
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    }

    // Validate password if provided
    if (state.editForm.password || state.editForm.confirmPassword) {
      if (!state.editForm.password) {
        errors.password = 'Please enter a new password';
      } else {
        const passwordValidation = ValidationUtils.validatePassword(state.editForm.password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.error;
        }
      }

      if (state.editForm.password && state.editForm.password !== state.editForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    dispatch({ type: 'SET_ERRORS', payload: errors });
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!user || !isAdminUser(user)) return;
    
    // Validate all fields
    if (!validateForm()) {
      // Announce validation errors to screen readers
      AccessibilityInfo.announceForAccessibility('Please fix the errors in the form before saving.');
      return;
    }
    
    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_NETWORK_ERROR', payload: null });
    
    try {
      // Sanitize inputs
      const sanitizedEmail = SanitizationUtils.sanitizeEmail(state.editForm.email.trim());
      const sanitizedPhone = SanitizationUtils.sanitizePhone(state.editForm.phone.trim());
      
      const updates: Partial<User> = {
        businessName: state.editForm.businessName.trim(),
        name: state.editForm.name.trim(),
        email: sanitizedEmail,
        phone: sanitizedPhone,
      } as Partial<User>;
      
      // Only update password if provided
      if (state.editForm.password) {
        updates.password = state.editForm.password; // In real app, this should be hashed
      }
      
      await updateUser(updates);
      dispatch({ type: 'SET_EDITING', payload: false });
      dispatch({ type: 'SET_DIRTY', payload: false });
      dispatch({ type: 'SET_ERRORS', payload: {} });
      
      // Announce success to screen readers
      AccessibilityInfo.announceForAccessibility('Profile updated successfully');
      
      // Show success alert
      Alert.alert('Success!', 'Your profile has been updated successfully.');
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to update profile. Please try again.');
      
      // Check if it's a network error
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        dispatch({ type: 'SET_NETWORK_ERROR', payload: 'Network error. Please check your connection and try again.' });
      } else {
        dispatch({ type: 'SET_NETWORK_ERROR', payload: errorMessage });
      }
      
      Alert.alert('Error', errorMessage);
      AccessibilityInfo.announceForAccessibility(`Error: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              const errorMessage = getErrorMessage(error, 'Failed to logout. Please try again.');
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? The action cannot be reversed and all your data (profile, bank accounts, expenses) will be deleted permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setIsDeleting(true);
            try {
              const result = await AuthService.deleteAdminAccount(user.id);
              if (result.success) {
                return;
              }
              Alert.alert('Error', result.error ?? 'Failed to delete account.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelEdit = () => {
    if (state.isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              if (user && isAdminUser(user) && state.initialForm) {
                const resetForm: FormState = {
                  businessName: user.businessName || '',
                  name: user.name || '',
                  email: user.email || '',
                  phone: user.phone || '',
                  password: '',
                  confirmPassword: '',
                };
                dispatch({ type: 'RESET_FORM', payload: resetForm });
                dispatch({ type: 'SET_EDITING', payload: false });
                AccessibilityInfo.announceForAccessibility('Changes discarded');
              }
            },
          },
        ]
      );
    } else {
      if (user && isAdminUser(user) && state.initialForm) {
        const resetForm: FormState = {
          businessName: user.businessName || '',
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          password: '',
          confirmPassword: '',
        };
        dispatch({ type: 'RESET_FORM', payload: resetForm });
      }
      dispatch({ type: 'SET_EDITING', payload: false });
    }
  };

  const handleInputChange = useCallback((field: keyof FormState, value: string) => {
    // Trim input on change for better UX
    let trimmedValue = value;
    if (field === 'phone') {
      trimmedValue = value.replace(/\s/g, '');
    } else if (field === 'email') {
      trimmedValue = value.trim().toLowerCase();
    }
    dispatch({ type: 'UPDATE_FIELD', field, value: trimmedValue });
    
    // Clear error for this field when user starts typing
    if (state.formErrors[field as keyof FormErrors]) {
      dispatch({ type: 'CLEAR_ERROR', field: field as keyof FormErrors });
    }
  }, [state.formErrors]);

  const handleMenuNavigate = useCallback((route: 'Bookings' | 'Drivers' | 'Vehicles' | 'Reports' | 'Profile') => {
    if (route === 'Profile') {
      // Already on Profile, just close menu
      dispatch({ type: 'SET_MENU_VISIBLE', payload: false });
      return;
    }
    navigation.navigate(route);
  }, [navigation]);

  const handleImageLoadStart = () => {
    dispatch({ type: 'SET_IMAGE_LOADING', payload: true });
    dispatch({ type: 'SET_IMAGE_ERROR', payload: false });
  };

  const handleImageLoad = () => {
    dispatch({ type: 'SET_IMAGE_LOADING', payload: false });
    dispatch({ type: 'SET_IMAGE_ERROR', payload: false });
  };

  const handleImageError = () => {
    dispatch({ type: 'SET_IMAGE_ERROR', payload: true });
    dispatch({ type: 'SET_IMAGE_LOADING', payload: false });
  };

  const handleRetryImage = () => {
    dispatch({ type: 'SET_IMAGE_ERROR', payload: false });
    dispatch({ type: 'SET_IMAGE_LOADING', payload: true });
    // Force re-render by updating a dummy state
    setTimeout(() => {
      dispatch({ type: 'SET_IMAGE_LOADING', payload: false });
    }, 100);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Typography variant="body" style={styles.loadingText}>
            Loading profile...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Typography variant="h3">Profile Not Found</Typography>
          <Typography variant="body" style={styles.loadingText}>Try logging in again.</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => dispatch({ type: 'SET_MENU_VISIBLE', payload: true })}
              activeOpacity={0.7}
              accessibilityLabel="Open menu"
              accessibilityHint="Opens the navigation menu"
              accessibilityRole="button"
            >
              <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.headerTitle}>Profile</Typography>
            </View>
          </View>
        </View>

        {isAdminUser(user) && (
          <ProfileHeader
            user={user}
            imageError={state.imageError}
            imageLoading={state.imageLoading}
            onRetryImage={handleRetryImage}
          />
        )}
        {!state.isEditing && (
          <View style={styles.editButtonContainer}>
            <Button 
              title="Edit Profile" 
              onPress={() => {
                dispatch({ type: 'SET_EDITING', payload: true });
                dispatch({ type: 'SET_IMAGE_ERROR', payload: false });
                AccessibilityInfo.announceForAccessibility('Edit profile mode activated');
              }} 
              variant="primary"
              disabled={isDeleting}
            />
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteAccountButton]}
              onPress={handleDeleteAccountPress}
              activeOpacity={0.8}
              disabled={isDeleting}
              accessibilityLabel={isDeleting ? 'Deleting account' : 'Delete account'}
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={22} color={UI_CONFIG.colors.error} />
              <Typography variant="body" style={styles.deleteAccountButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Typography>
            </TouchableOpacity>
          </View>
        )}

        {state.networkError && (
          <Card style={styles.errorCard}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={UI_CONFIG.colors.error} />
              <Typography variant="body" style={styles.networkErrorText}>
                {state.networkError}
              </Typography>
            </View>
          </Card>
        )}

        {state.isEditing && (
          <EditProfileForm
            formData={state.editForm}
            formErrors={state.formErrors}
            showPassword={state.showPassword}
            showConfirmPassword={state.showConfirmPassword}
            isSaving={state.isSaving}
            isDirty={state.isDirty}
            onFieldChange={handleInputChange}
            onTogglePasswordVisibility={() => dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })}
            onToggleConfirmPasswordVisibility={() => dispatch({ type: 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY' })}
            onSave={handleSaveProfile}
            onCancel={handleCancelEdit}
          />
        )}

      </ScrollView>
      </KeyboardAvoidingView>
      <AdminMenuDrawer
        visible={state.menuVisible}
        onClose={() => dispatch({ type: 'SET_MENU_VISIBLE', payload: false })}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Profile"
      />
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
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  editButtonContainer: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    marginTop: 12,
  },
  deleteAccountButton: {
    borderColor: UI_CONFIG.colors.error,
    backgroundColor: `${UI_CONFIG.colors.error}10`,
  },
  deleteAccountButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.error,
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: UI_CONFIG.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: UI_CONFIG.colors.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkErrorText: {
    marginLeft: 8,
    color: UI_CONFIG.colors.error,
    flex: 1,
  },
});

export default AdminProfileScreen;


