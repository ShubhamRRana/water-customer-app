import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Typography, LoadingSpinner, CustomerMenuDrawer } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../services/auth.service';
import { User } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { UI_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { formatDateOnly } from '../../utils/dateUtils';

type ProfileScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const editFormOpacity = useRef(new Animated.Value(0)).current;
  const editFormTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Reset and replay animations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset animation values
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
      
      // Reset edit form animation values if not editing
      if (!isEditing) {
        editFormOpacity.setValue(0);
        editFormTranslateY.setValue(20);
      }

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, slideAnim, scaleAnim, editFormOpacity, editFormTranslateY, isEditing])
  );

  useEffect(() => {
    if (isEditing) {
      Animated.parallel([
        Animated.timing(editFormOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(editFormTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(editFormOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(editFormTranslateY, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isEditing]);

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Sanitize inputs
    const sanitizedName = SanitizationUtils.sanitizeName(editForm.name);
    const sanitizedEmail = SanitizationUtils.sanitizeEmail(editForm.email);
    const sanitizedPhone = SanitizationUtils.sanitizePhone(editForm.phone);

    // Validate inputs
    const nameValidation = ValidationUtils.validateName(sanitizedName);
    const emailValidation = ValidationUtils.validateEmail(sanitizedEmail);
    const phoneValidation = ValidationUtils.validatePhone(sanitizedPhone);

    const errors: { name?: string; email?: string; phone?: string } = {};
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
    }
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    try {
      const updates: Partial<User> = {
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
      };

      await updateUser(updates);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? The action cannot be reversed and all your data will be deleted permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setIsDeleting(true);
            try {
              const result = await AuthService.deleteCustomerAccount(user.id);
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

  const formatDate = (date: Date | string) => {
    return formatDateOnly(date, 'en-US');
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
        <View style={styles.errorContainer}>
          <Typography variant="h3" style={styles.errorTitle}>
            Profile Not Found
          </Typography>
          <Typography variant="body" style={styles.errorText}>
            Unable to load your profile. Please try logging in again.
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  const handleMenuNavigate = (route: 'Home' | 'Orders' | 'Profile' | 'PastOrders') => {
    if (route === 'Profile') {
      return;
    }
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.contentContainer} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Gradient */}
          <LinearGradient
            colors={[UI_CONFIG.colors.primary, UI_CONFIG.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.menuButton} 
                onPress={() => setMenuVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="menu" size={24} color={UI_CONFIG.colors.textLight} />
              </TouchableOpacity>
              <Typography variant="h2" style={styles.headerTitle}>Profile</Typography>
              <View style={styles.headerSpacer} />
            </View>

            {/* Profile Section */}
            <Animated.View 
              style={[
                styles.profileSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              <Typography variant="h2" style={styles.userName}>
                {user.name}
              </Typography>
              <Typography variant="body" style={styles.userPhone}>
                {user.email}
              </Typography>
              {user.phone && (
                <Typography variant="body" style={styles.userPhone}>
                  {user.phone}
                </Typography>
              )}
            </Animated.View>
          </LinearGradient>

          {/* Profile Info Card */}
          <Animated.View
            style={[
              styles.infoCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={20} color={UI_CONFIG.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Typography variant="caption" style={styles.infoLabel}>
                  Member Since
                </Typography>
                <Typography variant="body" style={styles.infoValue}>
                  {formatDate(user.createdAt)}
                </Typography>
              </View>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            style={[
              styles.actionButtonsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, isEditing && styles.actionButtonActive]}
              onPress={isEditing ? handleCancelEdit : handleEditProfile}
              activeOpacity={0.8}
              disabled={isDeleting}
            >
              <Ionicons 
                name={isEditing ? "close-circle" : "create-outline"} 
                size={22} 
                color={isEditing ? UI_CONFIG.colors.error : UI_CONFIG.colors.primary} 
              />
              <Typography variant="body" style={[
                styles.actionButtonText,
                isEditing && styles.actionButtonTextActive
              ]}>
                {isEditing ? "Cancel" : "Edit Profile"}
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteAccountButton]}
              onPress={handleDeleteAccountPress}
              activeOpacity={0.8}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={22} color={UI_CONFIG.colors.error} />
              <Typography variant="body" style={styles.deleteAccountButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Typography>
            </TouchableOpacity>
          </Animated.View>

          {/* Edit Profile Form */}
          {isEditing && (
            <Animated.View
              style={[
                styles.editFormContainer,
                {
                  opacity: editFormOpacity,
                  transform: [{ translateY: editFormTranslateY }],
                },
              ]}
            >
              <View style={styles.editCard}>
                <View style={styles.editHeader}>
                  <Ionicons name="person-outline" size={24} color={UI_CONFIG.colors.primary} />
                  <Typography variant="h3" style={styles.editTitle}>
                    Edit Profile Information
                  </Typography>
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="person" size={16} color={UI_CONFIG.colors.textSecondary} />
                    <Typography variant="body" style={styles.inputLabel}>
                      Full Name
                    </Typography>
                  </View>
                  <TextInput
                    style={[styles.textInput, formErrors.name && { borderColor: UI_CONFIG.colors.error }]}
                    value={editForm.name}
                    onChangeText={(text) => {
                      const sanitized = SanitizationUtils.sanitizeName(text);
                      setEditForm(prev => ({ ...prev, name: sanitized }));
                      if (formErrors.name) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.name;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor={UI_CONFIG.colors.textSecondary}
                  />
                  {formErrors.name && (
                    <Typography variant="caption" style={{ color: UI_CONFIG.colors.error, marginTop: 4 }}>
                      {formErrors.name}
                    </Typography>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="mail" size={16} color={UI_CONFIG.colors.textSecondary} />
                    <Typography variant="body" style={styles.inputLabel}>
                      Email Address
                    </Typography>
                  </View>
                  <TextInput
                    style={[styles.textInput, formErrors.email && { borderColor: UI_CONFIG.colors.error }]}
                    value={editForm.email}
                    onChangeText={(text) => {
                      const sanitized = SanitizationUtils.sanitizeEmail(text);
                      setEditForm(prev => ({ ...prev, email: sanitized }));
                      if (formErrors.email) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter your email address"
                    placeholderTextColor={UI_CONFIG.colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {formErrors.email && (
                    <Typography variant="caption" style={{ color: UI_CONFIG.colors.error, marginTop: 4 }}>
                      {formErrors.email}
                    </Typography>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="call" size={16} color={UI_CONFIG.colors.textSecondary} />
                    <Typography variant="body" style={styles.inputLabel}>
                      Phone Number
                    </Typography>
                  </View>
                  <TextInput
                    style={[styles.textInput, formErrors.phone && { borderColor: UI_CONFIG.colors.error }]}
                    value={editForm.phone}
                    onChangeText={(text) => {
                      const sanitized = SanitizationUtils.sanitizePhone(text);
                      setEditForm(prev => ({ ...prev, phone: sanitized }));
                      if (formErrors.phone) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.phone;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter your phone number"
                    placeholderTextColor={UI_CONFIG.colors.textSecondary}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  {formErrors.phone && (
                    <Typography variant="caption" style={{ color: UI_CONFIG.colors.error, marginTop: 4 }}>
                      {formErrors.phone}
                    </Typography>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[UI_CONFIG.colors.primary, UI_CONFIG.colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={UI_CONFIG.colors.textLight} />
                    <Typography variant="body" style={styles.saveButtonText}>
                      Save Changes
                    </Typography>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
      
      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.textLight,
  },
  headerSpacer: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  userName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.accent,
    marginBottom: 4,
    textAlign: 'center',
  },
  userPhone: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 20,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${UI_CONFIG.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  deleteAccountButton: {
    marginTop: 12,
    borderColor: UI_CONFIG.colors.error,
    backgroundColor: `${UI_CONFIG.colors.error}10`,
  },
  deleteAccountButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.error,
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
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonActive: {
    borderColor: UI_CONFIG.colors.error,
    backgroundColor: `${UI_CONFIG.colors.error}10`,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.primary,
  },
  actionButtonTextActive: {
    color: UI_CONFIG.colors.error,
  },
  editFormContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  editCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginLeft: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    backgroundColor: UI_CONFIG.colors.background,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default ProfileScreen;
