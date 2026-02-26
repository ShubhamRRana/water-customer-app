import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useUserStore } from '../../store/userStore';
import { useVehicleStore } from '../../store/vehicleStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography } from '../../components/common';
import TankerSelectionModal from '../../components/customer/TankerSelectionModal';
import AgencySelectionModal from '../../components/customer/AgencySelectionModal';
import SavedAddressModal from '../../components/customer/SavedAddressModal';
import DateTimeInput from '../../components/customer/DateTimeInput';
import { Address, isAdminUser, isCustomerUser } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { UI_CONFIG, LOCATION_CONFIG } from '../../constants/config';
import { handleError } from '../../utils/errorHandler';
import { createScheduledDate as createScheduledDateFromUtils } from '../../utils/dateUtils';

type BookingScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'Booking'>;

interface BookingScreenProps {
}

interface PriceBreakdown {
  tankerSize: string;
  basePrice: number;
  totalPrice: number;
}

const BookingScreen: React.FC<BookingScreenProps> = () => {
  const navigation = useNavigation<BookingScreenNavigationProp>();
  const { user, isLoading: authLoading, initializeAuth } = useAuthStore();
  const { createBooking, isLoading } = useBookingStore();
  const { fetchUsersByRole, users: allUsers, isLoading: usersLoading } = useUserStore();
  const { fetchVehiclesByAgency } = useVehicleStore();

  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; capacity: number; amount?: number; vehicleNumber: string } | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<{ id: string; name: string; ownerName?: string } | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<Array<{ id: string; vehicleCapacity: number; amount?: number; vehicleNumber: string }>>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showTankerModal, setShowTankerModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [dateError, setDateError] = useState<string>('');

  // Ensure auth is initialized when component mounts
  useEffect(() => {
    if (!user && !authLoading) {
      initializeAuth();
    } else if (user && !user.id && !authLoading) {
      // User exists but missing id - reload auth
      initializeAuth();
    }
  }, [user, authLoading, initializeAuth]);

  // Load default address when user data is available
  useEffect(() => {
    if (user && isCustomerUser(user) && user.savedAddresses && user.savedAddresses.length > 0) {
      const defaultAddress = user.savedAddresses.find(addr => addr.isDefault);
      if (defaultAddress && !deliveryAddress) {
        setDeliveryAddress(defaultAddress.address);
      }
    }
  }, [user, deliveryAddress]);

  // Fetch admin users (agencies) with business names
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        await fetchUsersByRole('admin');
      } catch (error) {
        handleError(error, {
          context: { operation: 'loadAgencies' },
          userFacing: false,
        });
      }
    };
    loadAgencies();
  }, [fetchUsersByRole]);

  // Build tanker agencies list from admin users with business names
  const tankerAgencies: Array<{ id: string; name: string; ownerName?: string }> = React.useMemo(() => {
    return allUsers
      .filter(isAdminUser)
      .filter(admin => admin.businessName || admin.name)
      .map(admin => ({
        id: admin.id,
        name: admin.businessName || admin.name || 'Unnamed Agency',
        ownerName: admin.name
      }));
  }, [allUsers]);

  // Fetch vehicles when agency is selected
  useEffect(() => {
    const loadVehiclesForAgency = async () => {
      if (selectedAgency) {
        setVehiclesLoading(true);
        try {
          const vehicles = await fetchVehiclesByAgency(selectedAgency.id);
          setAvailableVehicles(vehicles);
          // Reset selected vehicle when agency changes
          setSelectedVehicle(null);
          setPriceBreakdown(null);
        } catch (error) {
          handleError(error, {
            context: { operation: 'loadVehiclesForAgency', agencyId: selectedAgency.id },
            userFacing: false,
          });
          setAvailableVehicles([]);
        } finally {
          setVehiclesLoading(false);
        }
      } else {
        setAvailableVehicles([]);
        setSelectedVehicle(null);
        setPriceBreakdown(null);
      }
    };
    loadVehiclesForAgency();
  }, [selectedAgency, fetchVehiclesByAgency]);

  const calculatePrice = useCallback(() => {
    if (!selectedVehicle) return;
    
    // Amount will be set by driver at delivery time
    // Set to 0 for now, will be updated when driver accepts order
    const basePrice = 0;
    const totalPrice = 0;
    
    setPriceBreakdown({
      tankerSize: `${selectedVehicle.capacity || 0}L Tanker`,
      basePrice: basePrice,
      totalPrice: totalPrice,
    });
  }, [selectedVehicle]);

  useEffect(() => {
    if (selectedVehicle) {
      calculatePrice();
    } else if (!selectedVehicle) {
      setPriceBreakdown(null);
    }
  }, [selectedVehicle, calculatePrice]);

  const handleVehicleSelection = useCallback((vehicle: { id: string; capacity: number; amount?: number; vehicleNumber: string }) => {
    setSelectedVehicle({
      id: vehicle.id,
      capacity: vehicle.capacity != null ? vehicle.capacity : 0,
      ...(vehicle.amount !== undefined && { amount: vehicle.amount }),
      vehicleNumber: vehicle.vehicleNumber || ''
    });
    setShowTankerModal(false);
  }, []);

  const handleAgencySelection = useCallback((agency: { id: string; name: string; ownerName?: string }) => {
    setSelectedAgency(agency);
    setShowAgencyModal(false);
  }, []);

  const handleAddressSelection = useCallback((address: Address) => {
    setDeliveryAddress(address.address);
    setShowSavedAddressModal(false);
  }, []);

  // Validate date using ValidationUtils
  const validateDate = (dateString: string): { isValid: boolean; error: string } => {
    const sanitized = SanitizationUtils.sanitizeDateString(dateString);
    const validation = ValidationUtils.validateDateString(sanitized);
    return {
      isValid: validation.isValid,
      error: validation.error || ''
    };
  };

  // Format date input to automatically add hyphens
  const formatDateInput = (text: string) => {
    // Sanitize first
    const sanitized = SanitizationUtils.sanitizeDateString(text);
    // Remove all non-numeric characters
    const numbers = sanitized.replace(/\D/g, '');
    
    // Add hyphens at appropriate positions
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 8)}`;
    }
  };

  // Format time input to automatically add colon
  const formatTimeInput = (text: string) => {
    // Sanitize first
    const sanitized = SanitizationUtils.sanitizeTimeString(text);
    // Remove all non-numeric characters
    const numbers = sanitized.replace(/\D/g, '');
    
    // Add colon at appropriate position
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
    } else {
      return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
    }
  };

  const handleDateChange = useCallback((text: string) => {
    const formatted = formatDateInput(text);
    setDeliveryDate(formatted);
    
    // Validate the date
    const validation = validateDate(formatted);
    setDateError(validation.isValid ? '' : validation.error);
  }, []);

  const handleTimeChange = useCallback((text: string) => {
    const formatted = formatTimeInput(text);
    setDeliveryTime(formatted);
  }, []);

  const handleTimePeriodChange = useCallback((period: 'AM' | 'PM') => {
    setTimePeriod(period);
  }, []);

  // Validate time input using ValidationUtils
  const validateTime = (timeString: string): { isValid: boolean; error: string } => {
    const sanitized = SanitizationUtils.sanitizeTimeString(timeString);
    const validation = ValidationUtils.validateTimeString(sanitized);
    return {
      isValid: validation.isValid,
      error: validation.error || ''
    };
  };

  // Convert 12-hour format to 24-hour format for date creation
  const createScheduledDate = (dateString: string, timeString: string, period: 'AM' | 'PM'): Date => {
    const scheduledDate = createScheduledDateFromUtils(dateString, timeString, period);
    if (!scheduledDate) {
      // Return a fallback date (tomorrow at 9 AM) instead of current time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
    return scheduledDate;
  };

  // Memoized handler for special instructions input
  const handleSpecialInstructionsChange = useCallback((text: string) => {
    const sanitized = SanitizationUtils.sanitizeText(text, 500);
    setSpecialInstructions(sanitized);
  }, []);

  // Memoized modal close handlers
  const handleCloseTankerModal = useCallback(() => {
    setShowTankerModal(false);
  }, []);

  const handleCloseAgencyModal = useCallback(() => {
    setShowAgencyModal(false);
  }, []);

  const handleCloseSavedAddressModal = useCallback(() => {
    setShowSavedAddressModal(false);
  }, []);

  // Memoized disabled state for Book Now button
  const isBookingDisabled = useMemo(() => {
    return !selectedVehicle || 
           !selectedAgency || 
           !deliveryAddress.trim() || 
           !deliveryDate.trim() || 
           !deliveryTime.trim() || 
           !priceBreakdown || 
           !!(dateError && dateError.length > 0);
  }, [selectedVehicle, selectedAgency, deliveryAddress, deliveryDate, deliveryTime, priceBreakdown, dateError]);

  // Memoized addresses array for SavedAddressModal
  const savedAddresses = useMemo(() => {
    return user && isCustomerUser(user) ? (user.savedAddresses || []) : [];
  }, [user]);


  const handleBooking = useCallback(async () => {
    if (!selectedVehicle || !selectedAgency || !user) {
      Alert.alert('Error', 'Please select agency and vehicle');
      return;
    }

    // Sanitize and validate address
    const sanitizedAddress = SanitizationUtils.sanitizeAddress(deliveryAddress.trim());
    const addressValidation = ValidationUtils.validateAddressText(sanitizedAddress);
    if (!addressValidation.isValid) {
      Alert.alert('Invalid Address', addressValidation.error || 'Please enter a valid delivery address');
      return;
    }

    if (!deliveryDate.trim() || !deliveryTime.trim()) {
      Alert.alert('Error', 'Please enter both delivery date and time');
      return;
    }

    // Validate the date
    const dateValidation = validateDate(deliveryDate);
    if (!dateValidation.isValid) {
      Alert.alert('Invalid Date', dateValidation.error);
      return;
    }

    // Validate the time
    const timeValidation = validateTime(deliveryTime);
    if (!timeValidation.isValid) {
      Alert.alert('Invalid Time', timeValidation.error);
      return;
    }

    if (!priceBreakdown) {
      Alert.alert('Error', 'Unable to calculate price. Please try again.');
      return;
    }

    try {
      // Get current user from store (may have been updated)
      let currentUser = user;
      
      // Validate required fields before creating booking
      if (!currentUser) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      // If user exists but missing id, try to reload auth
      if (!currentUser.id) {
        // Try to reload user data
        await initializeAuth();
        const { user: reloadedUser } = useAuthStore.getState();
        
        if (!reloadedUser || !reloadedUser.id) {
          Alert.alert(
            'Session Error', 
            'Your session appears to be invalid. Please log out and log in again to continue.'
          );
          return;
        }
        
        // Use reloaded user
        currentUser = reloadedUser;
      }

      // Validate user has required fields
      if (!currentUser.id) {
        Alert.alert('Error', 'User ID is missing. Please log out and log in again.');
        return;
      }

      if (!currentUser.name) {
        Alert.alert('Error', 'User name is missing. Please update your profile or log in again.');
        return;
      }

      if (!selectedAgency?.id || !selectedAgency?.name) {
        Alert.alert('Error', 'Agency information is missing. Please select an agency.');
        return;
      }

      if (!selectedVehicle?.capacity) {
        Alert.alert('Error', 'Vehicle information is missing. Please select a vehicle.');
        return;
      }

      if (priceBreakdown?.basePrice === undefined || priceBreakdown?.basePrice === null ||
          priceBreakdown?.totalPrice === undefined || priceBreakdown?.totalPrice === null) {
        Alert.alert('Error', 'Price information is missing. Please try again.');
        return;
      }

      // Create Address object from the sanitized address string
      // TODO: Replace mock coordinates with actual geocoding service
      const bookingAddress: Address = {
        address: sanitizedAddress,
        latitude: LOCATION_CONFIG.defaultCenter.latitude + (Math.random() - 0.5) * 0.1, // Mock coordinates
        longitude: LOCATION_CONFIG.defaultCenter.longitude + (Math.random() - 0.5) * 0.1,
      };

      // Create scheduled date if provided, otherwise undefined
      let scheduledForDate: Date | undefined = undefined;
      if (deliveryDate && deliveryTime) {
        try {
          scheduledForDate = createScheduledDate(deliveryDate, deliveryTime, timePeriod);
          // Validate the date is valid
          if (!scheduledForDate || isNaN(scheduledForDate.getTime())) {
            scheduledForDate = undefined;
          }
        } catch (dateError) {
          scheduledForDate = undefined;
        }
      }

      const bookingData = {
        customerId: currentUser.id,
        customerName: currentUser.name,
        customerPhone: currentUser.phone || '', // Phone is optional, use empty string as fallback
        agencyId: selectedAgency.id,
        agencyName: selectedAgency.name,
        status: 'pending' as const,
        tankerSize: selectedVehicle.capacity,
        quantity: 1,
        basePrice: priceBreakdown.basePrice,
        distanceCharge: 0, // No distance-based charges
        totalPrice: priceBreakdown.totalPrice,
        deliveryAddress: bookingAddress,
        distance: 0, // Distance not used for pricing
        ...(scheduledForDate && { scheduledFor: scheduledForDate }),
        paymentStatus: 'pending' as const,
        canCancel: true,
      };

      await createBooking(bookingData);
      
      // Show success alert
      Alert.alert(
        'Booking Successful!',
        `Your booking has been placed successfully.\nAgency: ${selectedAgency.name}\nOrder ID: ${bookingData.customerId.slice(-6)}\nAmount: Will be determined at delivery`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      handleError(error, {
      context: { operation: 'createBooking', userId: user?.id, agencyId: selectedAgency?.id },
      userFacing: true,
    });
    }
  }, [selectedVehicle, selectedAgency, user, deliveryAddress, deliveryDate, deliveryTime, timePeriod, priceBreakdown, createBooking, initializeAuth, navigation]);



  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Creating your booking...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.title}>Book Water Tanker</Typography>
      </View>

      {/* Tanker Size Selection */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Select Tanker Agency</Typography>
        <Card style={styles.selectionCard} onPress={() => setShowAgencyModal(true)}>
          <View style={styles.selectionContent}>
            <View style={styles.selectionInfo}>
              <Typography variant="body" style={styles.selectionLabel}>
                {selectedAgency ? selectedAgency.name : 'Choose tanker agency'}
              </Typography>
              {selectedAgency?.ownerName && (
                <Typography variant="caption" style={styles.selectionSubtext}>
                  Owner: {selectedAgency.ownerName}
                </Typography>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
          </View>
        </Card>
      </View>

      {/* Vehicle Selection */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Select Vehicle</Typography>
        <Card 
          style={[styles.selectionCard, !selectedAgency && styles.selectionCardDisabled]} 
          onPress={() => {
            if (selectedAgency) {
              setShowTankerModal(true);
            } else {
              Alert.alert('Info', 'Please select an agency first');
            }
          }}
        >
          <View style={styles.selectionContent}>
            <View style={styles.selectionInfo}>
              <Typography variant="body" style={styles.selectionLabel}>
                {selectedVehicle 
                  ? `${selectedVehicle.capacity != null ? selectedVehicle.capacity : 'N/A'}L Tanker - ${selectedVehicle.vehicleNumber || 'N/A'}`
                  : selectedAgency 
                    ? 'Choose vehicle'
                    : 'Select agency first'}
              </Typography>
              {selectedVehicle && (
                <Typography variant="caption" style={styles.selectionSubtext}>
                  Amount will be determined at delivery
                </Typography>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
          </View>
        </Card>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Delivery Address</Typography>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Enter your delivery address..."
            value={deliveryAddress}
            onChangeText={(text) => {
              setDeliveryAddress(text);
            }}
            multiline
            numberOfLines={3}
          />
        </Card>
        <TouchableOpacity
          style={styles.savedAddressButton}
          onPress={() => setShowSavedAddressModal(true)}
        >
          <Ionicons name="location-outline" size={20} color={UI_CONFIG.colors.primary} />
          <Typography variant="body" style={styles.savedAddressButtonText}>Select from Saved Addresses</Typography>
              <Ionicons name="chevron-forward" size={16} color={UI_CONFIG.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Delivery Timing */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Delivery Timing</Typography>
        <DateTimeInput
          date={deliveryDate}
          time={deliveryTime}
          timePeriod={timePeriod}
          dateError={dateError}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onTimePeriodChange={handleTimePeriodChange}
        />
      </View>

      {/* Special Instructions */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Special Instructions (Optional)</Typography>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Any special instructions for delivery..."
            value={specialInstructions}
            onChangeText={handleSpecialInstructionsChange}
            multiline
            numberOfLines={3}
          />
        </Card>
      </View>

      {/* Book Now Button */}
      <View style={styles.section}>
        <Button
          title="Book Now"
          onPress={handleBooking}
          disabled={isBookingDisabled}
          style={styles.bookButton}
        />
      </View>

      <TankerSelectionModal
        visible={showTankerModal}
        onClose={handleCloseTankerModal}
        vehicles={availableVehicles}
        selectedVehicleId={selectedVehicle?.id || null}
        onSelectVehicle={handleVehicleSelection}
        loading={vehiclesLoading}
        selectedAgency={selectedAgency}
      />
      <AgencySelectionModal
        visible={showAgencyModal}
        onClose={handleCloseAgencyModal}
        agencies={tankerAgencies}
        selectedAgencyId={selectedAgency?.id || null}
        onSelectAgency={handleAgencySelection}
        loading={usersLoading}
      />
      <SavedAddressModal
        visible={showSavedAddressModal}
        onClose={handleCloseSavedAddressModal}
        addresses={savedAddresses}
        onSelectAddress={handleAddressSelection}
        navigation={navigation}
      />
      </ScrollView>
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
    backgroundColor: UI_CONFIG.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 12,
  },
  selectionCard: {
    marginBottom: 8,
  },
  selectionCardDisabled: {
    opacity: 0.5,
  },
  selectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  selectionSubtext: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  inputCard: {
    marginBottom: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  textArea: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    textAlignVertical: 'top',
  },
  bookButton: {
    marginTop: 8,
  },
  savedAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    marginTop: 8,
  },
  savedAddressButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.primary,
    flex: 1,
    marginLeft: 8,
  },
});

export default BookingScreen;