import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { Typography, Card, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import type { AdminRoute } from '../../components/common/AdminMenuDrawer';
import AddDriverModal from '../../components/admin/AddDriverModal';
import DriverModal from '../../components/admin/DriverModal';
import DriverCard from '../../components/admin/DriverCard';
import { UI_CONFIG } from '../../constants/config';
import { User, DriverUser, isDriverUser } from '../../types';
import { ValidationUtils } from '../../utils/validation';
import { SanitizationUtils } from '../../utils/sanitization';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { AuthService } from '../../services/auth.service';

type DriverManagementScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Drivers'>;

type EnrichedDriver = DriverUser & { totalEarnings: number; completedOrders: number };

const DriverManagementScreen: React.FC = () => {
  const navigation = useNavigation<DriverManagementScreenNavigationProp>();
  const { users, fetchAllUsers, updateUser, deleteUser, isLoading } = useUserStore();
  const { user: currentUser, logout } = useAuthStore();
  const { bookings, fetchAllBookings } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<EnrichedDriver | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  
  
  
  // Add/Edit Driver form state
  const [addDriverForm, setAddDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    licenseNumber: '',
    licenseExpiry: '',
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate driver statistics from bookings
  const calculateDriverStats = useCallback((driverId: string) => {
    const driverBookings = bookings.filter(
      booking => booking.driverId === driverId && booking.status === 'delivered'
    );
    
    const totalEarnings = driverBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    const completedOrders = driverBookings.length;
    
    return { totalEarnings, completedOrders };
  }, [bookings]);

  // Enrich drivers with calculated statistics
  const drivers = useMemo((): EnrichedDriver[] => {
    return users
      .filter((user): user is DriverUser => user.role === 'driver')
      .map(driver => {
        const stats = calculateDriverStats(driver.id);
        return {
          ...driver,
          totalEarnings: stats.totalEarnings,
          completedOrders: stats.completedOrders,
        };
      });
  }, [users, calculateDriverStats]);

  useEffect(() => {
    loadDrivers();
  }, []);

  // Update selectedDriver with enriched data when drivers/bookings change
  useEffect(() => {
    if (selectedDriver) {
      const updatedDriver = drivers.find(d => d.id === selectedDriver.id);
      if (updatedDriver && (
        updatedDriver.totalEarnings !== selectedDriver.totalEarnings ||
        updatedDriver.completedOrders !== selectedDriver.completedOrders
      )) {
        setSelectedDriver(updatedDriver);
      }
    }
  }, [drivers, bookings, selectedDriver]);

  const loadDrivers = async () => {
    try {
      await Promise.all([
        fetchAllUsers(currentUser?.id),
        fetchAllBookings(),
      ]);
    } catch (error) {
            Alert.alert('Error', 'Failed to load drivers. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAllUsers(currentUser?.id),
        fetchAllBookings(),
      ]);
    } catch (error) {
          } finally {
      setRefreshing(false);
    }
  };


  const validateAddDriverForm = (isEditMode: boolean = false) => {
    const errors: {[key: string]: string} = {};
    
    // Validate name
    const nameValidation = ValidationUtils.validateName(addDriverForm.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || 'Invalid name';
    }
    
    // Validate email
    const emailValidation = ValidationUtils.validateEmail(addDriverForm.email, true);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error || 'Invalid email';
    }
    
    // Validate phone (required)
    const phoneValidation = ValidationUtils.validatePhone(addDriverForm.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error || 'Invalid phone';
    }
    
    // Validate password (required for add, optional for edit)
    if (!isEditMode || addDriverForm.password) {
      const passwordValidation = ValidationUtils.validatePassword(addDriverForm.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.error || 'Invalid password';
      }
    }
    
    // Validate confirm password (only required when adding or when password is being changed)
    if (!isEditMode) {
      if (!addDriverForm.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (addDriverForm.password !== addDriverForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    } else if (addDriverForm.password && addDriverForm.password !== addDriverForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Emergency contact validation
    const ecNameValidation = ValidationUtils.validateName(addDriverForm.emergencyContactName);
    if (!ecNameValidation.isValid) {
      errors.emergencyContactName = ecNameValidation.error || 'Invalid name';
    }
    const ecPhoneValidation = ValidationUtils.validatePhone(addDriverForm.emergencyContactPhone);
    if (!ecPhoneValidation.isValid) {
      errors.emergencyContactPhone = ecPhoneValidation.error || 'Invalid phone';
    }

    // License number required
    if (!addDriverForm.licenseNumber.trim()) {
      errors.licenseNumber = 'License number is required';
    }

    // Validate license expiry: DD/MM/YYYY
    const expiryMatch = addDriverForm.licenseExpiry.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (!expiryMatch) {
      errors.licenseExpiry = 'Use DD/MM/YYYY format';
    } else {
      const day = parseInt(expiryMatch[1] ?? '', 10);
      const month = parseInt(expiryMatch[2] ?? '', 10) - 1;
      const year = parseInt(expiryMatch[3] ?? '', 10);
      const candidate = new Date(year, month, day);
      if (isNaN(candidate.getTime())) {
        errors.licenseExpiry = 'Invalid date';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDriver = useCallback(async () => {
    const isEditMode = editingDriver !== null;
    if (!validateAddDriverForm(isEditMode)) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (!isEditMode) {
        // Use AuthService.register() to properly create driver account with authentication
        const licenseExpiryDate = (() => {
          const m = addDriverForm.licenseExpiry.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
          if (!m) return undefined;
          const d = parseInt(m[1] ?? '', 10);
          const mo = parseInt(m[2] ?? '', 10) - 1;
          const y = parseInt(m[3] ?? '', 10);
          return new Date(y, mo, d);
        })();
        
        const driverData: Partial<DriverUser> = {
          totalEarnings: 0,
          completedOrders: 0,
          createdByAdmin: true,
          licenseNumber: addDriverForm.licenseNumber.trim(),
          emergencyContactName: addDriverForm.emergencyContactName.trim(),
          emergencyContactPhone: addDriverForm.emergencyContactPhone,
        };
        if (addDriverForm.phone) driverData.phone = addDriverForm.phone;
        if (currentUser?.id) driverData.createdByAdminId = currentUser.id;
        if (licenseExpiryDate) driverData.licenseExpiry = licenseExpiryDate;

        const registerResult = await AuthService.register(
          addDriverForm.email,
          addDriverForm.password,
          addDriverForm.name.trim(),
          'driver',
          driverData
        );
        
        if (!registerResult.success) {
          Alert.alert('Error', registerResult.error || 'Failed to create driver account');
          setIsSubmitting(false);
          return;
        }
        
        // Refresh users list to show the newly created driver
        await fetchAllUsers(currentUser?.id);
        
        Alert.alert('Success', 'Driver added successfully');
      } else {
        // Check if email was changed and if it already exists for another user
        if (addDriverForm.email.toLowerCase() !== editingDriver.email?.toLowerCase()) {
          const existingUser = users.find(user => user.email?.toLowerCase() === addDriverForm.email.toLowerCase() && user.id !== editingDriver.id);
          if (existingUser) {
            Alert.alert('Error', 'A user with this email address already exists');
            setIsSubmitting(false);
            return;
          }
        }
        
        // Update existing driver
        const licenseExpiryParsed = (() => {
          const m = addDriverForm.licenseExpiry.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
          if (!m) return undefined;
          const d = parseInt(m[1] ?? '', 10);
          const mo = parseInt(m[2] ?? '', 10) - 1;
          const y = parseInt(m[3] ?? '', 10);
          return new Date(y, mo, d);
        })();
        const updateData: Partial<DriverUser> = {
          name: addDriverForm.name.trim(),
          email: SanitizationUtils.sanitizeEmail(addDriverForm.email),
          licenseNumber: addDriverForm.licenseNumber.trim(),
          emergencyContactName: addDriverForm.emergencyContactName.trim(),
          emergencyContactPhone: addDriverForm.emergencyContactPhone,
        };
        if (addDriverForm.phone) updateData.phone = addDriverForm.phone;
        if (licenseExpiryParsed) updateData.licenseExpiry = licenseExpiryParsed;
        
        // Only update password if provided
        if (addDriverForm.password) {
          updateData.password = addDriverForm.password; // In real app, this should be hashed
        }
        
        await updateUser(editingDriver.id, updateData);
        
        Alert.alert('Success', 'Driver updated successfully');
      }
      
      // Reset form
      setAddDriverForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        licenseNumber: '',
        licenseExpiry: '',
      });
      setFormErrors({});
      setEditingDriver(null);
      setShowAddDriverModal(false);
    } catch (error) {
      Alert.alert('Error', isEditMode ? 'Failed to update driver. Please try again.' : 'Failed to add driver. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [addDriverForm, users, updateUser, editingDriver, fetchAllUsers]);

  const resetAddDriverForm = useCallback(() => {
    setAddDriverForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      licenseNumber: '',
      licenseExpiry: '',
    });
    setFormErrors({});
    setEditingDriver(null);
  }, []);

  const handleEditDriverInternal = useCallback((driver: DriverUser) => {
    setEditingDriver(driver);
    setAddDriverForm({
      name: driver.name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      password: '',
      confirmPassword: '',
      emergencyContactName: driver.emergencyContactName || '',
      emergencyContactPhone: driver.emergencyContactPhone || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry ? (() => {
        const date = new Date(driver.licenseExpiry);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      })() : '',
    });
    setFormErrors({});
    setShowAddDriverModal(true);
  }, []);

  const handleEditDriver = useCallback((driver: User) => {
    // In this context, driver is always a DriverUser since it comes from the drivers array
    if (isDriverUser(driver)) {
      handleEditDriverInternal(driver);
    }
  }, [handleEditDriverInternal]);

  const handleDeleteDriver = useCallback(async () => {
    if (!editingDriver) return;

    Alert.alert(
      'Delete Driver',
      `Are you sure you want to delete ${editingDriver.name}? This action cannot be undone and the driver will no longer be able to login.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const driverId = editingDriver.id;
              const driverEmail = editingDriver.email;
              
              // Delete the driver
              await deleteUser(driverId);
              
              const deletedSelf = currentUser && (currentUser.id === driverId || currentUser.email?.toLowerCase() === driverEmail?.toLowerCase());

              if (deletedSelf) {
                await logout();
                Alert.alert(
                  'Driver Deleted',
                  'The driver account has been deleted. You have been logged out as this account no longer exists.'
                );
              } else {
                Alert.alert('Success', 'Driver deleted successfully');
                if (currentUser?.id) {
                  await fetchAllUsers(currentUser.id);
                }
              }

              setSelectedDriver(null);
              setShowDriverModal(false);
              setEditingDriver(null);
              setShowAddDriverModal(false);
              resetAddDriverForm();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete driver. Please try again.');
            }
          },
        },
      ]
    );
  }, [editingDriver, deleteUser, currentUser, logout, resetAddDriverForm, fetchAllUsers]);

  const handleFormChange = useCallback((field: string, value: string) => {
    setAddDriverForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         driver.phone?.includes(searchQuery) ||
                         driver.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });


  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: AdminRoute) => {
    if (route === 'Drivers') {
      // Already on Drivers, just close menu
      return;
    }
    navigation.navigate(route);
  };



  

  if (isLoading && drivers.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading drivers...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        scrollEnabled={!showDriverModal && !showAddDriverModal}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.title}>
                Driver Management
              </Typography>
              <Typography variant="body" style={styles.subtitle}>
                Manage driver accounts
              </Typography>
            </View>
          </View>
        </View>

        

        {/* Search */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={UI_CONFIG.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search drivers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={UI_CONFIG.colors.textSecondary}
            />
          </View>
        </View>

        {/* Drivers List */}
        <View style={styles.driversSection} pointerEvents={(showDriverModal || showAddDriverModal) ? 'none' : 'auto'}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Drivers ({filteredDrivers.length})
          </Typography>
          
          {filteredDrivers.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyText}>
                {searchQuery 
                  ? 'No drivers found matching your criteria'
                  : 'No drivers registered yet'
                }
              </Typography>
            </Card>
          ) : (
            <>
              {filteredDrivers.map((driver, index) => (
                <DriverCard 
                  key={driver.id || `driver-${index}`} 
                  driver={driver}
                  onPress={() => {
                    if (showDriverModal) return;
                    setSelectedDriver(driver);
                    setShowDriverModal(true);
                  }}
                  onEdit={handleEditDriver}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Driver Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setShowAddDriverModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={UI_CONFIG.colors.textLight} />
      </TouchableOpacity>

      <DriverModal 
        visible={showDriverModal}
        onClose={() => setShowDriverModal(false)}
        driver={selectedDriver}
      />
      <AddDriverModal 
        visible={showAddDriverModal}
        onClose={() => setShowAddDriverModal(false)}
        formData={addDriverForm}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        onFormChange={handleFormChange}
        onSubmit={handleAddDriver}
        onReset={resetAddDriverForm}
        onDelete={handleDeleteDriver}
        isEditMode={editingDriver !== null}
      />
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Drivers"
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: UI_CONFIG.spacing.md,
    color: UI_CONFIG.colors.textSecondary,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  statsSection: {
    padding: UI_CONFIG.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: UI_CONFIG.spacing.md,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    marginTop: 0,
  },
  filterSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    marginTop: UI_CONFIG.spacing.lg,
    marginBottom: UI_CONFIG.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 8,
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    marginBottom: UI_CONFIG.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: UI_CONFIG.spacing.sm,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  filterScroll: {
    marginBottom: UI_CONFIG.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.surface,
    marginRight: UI_CONFIG.spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
  },
  driversSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: UI_CONFIG.spacing.md,
    textAlign: 'center',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI_CONFIG.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});

export default DriverManagementScreen;