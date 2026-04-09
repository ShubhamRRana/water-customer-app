import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useVehicleStore } from '../../store/vehicleStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Typography } from '../../components/common';
import DateTimeInput from '../../components/customer/DateTimeInput';
import AgencySelectionModal from '../../components/customer/AgencySelectionModal';
import TankerSelectionModal from '../../components/customer/TankerSelectionModal';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { UI_CONFIG, BOOKING_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { StorageService } from '../../services/storage.service';
import { SocietyTripService } from '../../services/societyTrip.service';
import { createScheduledDate as createScheduledDateFromUtils } from '../../utils/dateUtils';
import { isAdminUser, isCustomerUser } from '../../types';
import { handleError } from '../../utils/errorHandler';

const MAX_TRIP_PHOTOS = 10;

type AddTripNavigationProp = StackNavigationProp<CustomerStackParamList, 'AddTrip'>;

const getTodayDateString = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
};

/** Parses tanker amount (₹); required for save. */
const parseTankerAmountInput = (text: string): { amount: number | null; error?: string } => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { amount: null, error: 'Enter the tanker amount.' };
  }
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (!digitsOnly) {
    return { amount: null, error: 'Enter a valid amount in rupees.' };
  }
  const n = parseInt(digitsOnly, 10);
  if (!Number.isFinite(n) || n < 0) {
    return { amount: null, error: 'Amount must be zero or positive.' };
  }
  if (n > 100000000) {
    return { amount: null, error: 'Amount is too large.' };
  }
  return { amount: n };
};

const AddTripScreen: React.FC = () => {
  const navigation = useNavigation<AddTripNavigationProp>();
  const { user } = useAuthStore();
  const { fetchUsersByRole, users: allUsers, isLoading: usersLoading } = useUserStore();
  const { fetchVehiclesByAgency } = useVehicleStore();

  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<{
    id: string;
    name: string;
    ownerName?: string;
  } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<{
    id: string;
    capacity: number;
    vehicleNumber: string;
  } | null>(null);
  /** Set when agency has no vehicles — user picks from BOOKING_CONFIG.defaultTankerSizes */
  const [fallbackTankerLiters, setFallbackTankerLiters] = useState<number | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<
    Array<{ id: string; vehicleCapacity: number; amount?: number; vehicleNumber: string }>
  >([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [showTankerModal, setShowTankerModal] = useState(false);
  const [showSizeFallbackModal, setShowSizeFallbackModal] = useState(false);
  const [tripDate, setTripDate] = useState(() => getTodayDateString());
  const [tripTime, setTripTime] = useState('');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [dateError, setDateError] = useState('');
  const [tankerAmountText, setTankerAmountText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tankerAgencies = useMemo(() => {
    return allUsers
      .filter(isAdminUser)
      .filter(admin => admin.businessName || admin.name)
      .map(admin => ({
        id: admin.id,
        name: admin.businessName || admin.name || 'Unnamed Agency',
        ownerName: admin.name,
      }));
  }, [allUsers]);

  const effectiveTankerLiters = useMemo(() => {
    if (selectedVehicle) return selectedVehicle.capacity;
    if (fallbackTankerLiters != null) return fallbackTankerLiters;
    return null;
  }, [selectedVehicle, fallbackTankerLiters]);

  useEffect(() => {
    const loadAgencies = async () => {
      try {
        await fetchUsersByRole('admin');
      } catch (error) {
        handleError(error, {
          context: { operation: 'addTripLoadAgencies' },
          userFacing: false,
        });
      }
    };
    loadAgencies();
  }, [fetchUsersByRole]);

  useEffect(() => {
    setSelectedVehicle(null);
    setFallbackTankerLiters(null);
    setTankerAmountText('');
  }, [selectedAgency?.id]);

  useEffect(() => {
    if (!selectedAgency) {
      setAvailableVehicles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setVehiclesLoading(true);
      try {
        const vehicles = await fetchVehiclesByAgency(selectedAgency.id);
        if (!cancelled) setAvailableVehicles(vehicles);
      } catch (error) {
        handleError(error, {
          context: { operation: 'addTripLoadVehicles', agencyId: selectedAgency.id },
          userFacing: false,
        });
        if (!cancelled) setAvailableVehicles([]);
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgency, fetchVehiclesByAgency]);

  const validateDate = useCallback((dateString: string): { isValid: boolean; error: string } => {
    const sanitized = SanitizationUtils.sanitizeDateString(dateString);
    const validation = ValidationUtils.validateDateString(sanitized);
    return {
      isValid: validation.isValid,
      error: validation.error || '',
    };
  }, []);

  const formatDateInput = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeDateString(text);
    const numbers = sanitized.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 8)}`;
  };

  const formatTimeInput = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeTimeString(text);
    const numbers = sanitized.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const handleDateChange = useCallback((text: string) => {
    const formatted = formatDateInput(text);
    setTripDate(formatted);
    const validation = validateDate(formatted);
    setDateError(validation.isValid ? '' : validation.error);
  }, [validateDate]);

  const handleTimeChange = useCallback((text: string) => {
    setTripTime(formatTimeInput(text));
  }, []);

  const validateTime = (timeString: string): { isValid: boolean; error: string } => {
    const sanitized = SanitizationUtils.sanitizeTimeString(timeString);
    const validation = ValidationUtils.validateTimeString(sanitized);
    return {
      isValid: validation.isValid,
      error: validation.error || '',
    };
  };

  const removePhotoAt = useCallback((index: number) => {
    setPhotoUris(prev => prev.filter((_, i) => i !== index));
  }, []);

  const onTakeTankerPhoto = async () => {
    if (photoUris.length >= MAX_TRIP_PHOTOS) {
      Alert.alert('Photo limit', `You can add up to ${MAX_TRIP_PHOTOS} photos per trip.`);
      return;
    }
    try {
      const uri = await StorageService.takePhoto([4, 3]);
      if (uri) setPhotoUris(prev => [...prev, uri]);
    } catch (error) {
      handleError(error, { context: { operation: 'addTripTakePhoto' }, userFacing: true });
    }
  };

  const onUploadTankerPhoto = async () => {
    const remaining = MAX_TRIP_PHOTOS - photoUris.length;
    if (remaining <= 0) {
      Alert.alert('Photo limit', `You can add up to ${MAX_TRIP_PHOTOS} photos per trip.`);
      return;
    }
    try {
      const uris = await StorageService.pickImages(remaining);
      if (uris.length) setPhotoUris(prev => [...prev, ...uris].slice(0, MAX_TRIP_PHOTOS));
    } catch (error) {
      handleError(error, { context: { operation: 'addTripPickPhoto' }, userFacing: true });
    }
  };

  const parsedTankerAmount = useMemo(
    () => parseTankerAmountInput(tankerAmountText),
    [tankerAmountText],
  );

  const isSubmitDisabled = useMemo(() => {
    const sizeOk =
      effectiveTankerLiters != null &&
      effectiveTankerLiters > 0 &&
      effectiveTankerLiters <= 100000;
    const amountOk = parsedTankerAmount.amount != null && !parsedTankerAmount.error;
    return (
      photoUris.length === 0 ||
      !selectedAgency?.name?.trim() ||
      !tripDate.trim() ||
      !tripTime.trim() ||
      !!dateError ||
      !sizeOk ||
      !amountOk ||
      isSubmitting
    );
  }, [
    photoUris.length,
    selectedAgency,
    tripDate,
    tripTime,
    dateError,
    effectiveTankerLiters,
    parsedTankerAmount.amount,
    parsedTankerAmount.error,
    isSubmitting,
  ]);

  const handleAgencySelection = useCallback(
    (agency: { id: string; name: string; ownerName?: string }) => {
      setSelectedAgency(agency);
      setShowAgencyModal(false);
    },
    [],
  );

  const handleVehicleSelection = useCallback(
    (vehicle: { id: string; capacity: number; amount?: number; vehicleNumber: string }) => {
      setSelectedVehicle({
        id: vehicle.id,
        capacity: vehicle.capacity != null ? vehicle.capacity : 0,
        vehicleNumber: vehicle.vehicleNumber || '',
      });
      setFallbackTankerLiters(null);
      setTankerAmountText(
        vehicle.amount != null && Number.isFinite(vehicle.amount)
          ? String(Math.round(vehicle.amount))
          : '',
      );
      setShowTankerModal(false);
    },
    [],
  );

  const openTankerPicker = useCallback(() => {
    if (!selectedAgency) {
      Alert.alert('Info', 'Please select an agency first');
      return;
    }
    if (vehiclesLoading) return;
    if (availableVehicles.length > 0) {
      setShowTankerModal(true);
    } else {
      setShowSizeFallbackModal(true);
    }
  }, [selectedAgency, vehiclesLoading, availableVehicles.length]);

  const tankerSelectionLabel = useMemo(() => {
    if (selectedVehicle) {
      const cap = selectedVehicle.capacity != null ? selectedVehicle.capacity : 0;
      return `${cap}L Tanker — ${selectedVehicle.vehicleNumber || 'Vehicle'}`;
    }
    if (fallbackTankerLiters != null) {
      const preset = BOOKING_CONFIG.defaultTankerSizes.find(s => s.size === fallbackTankerLiters);
      return preset?.displayName ?? `${fallbackTankerLiters}L Tanker`;
    }
    return selectedAgency ? 'Choose tanker size' : 'Select agency first';
  }, [selectedAgency, selectedVehicle, fallbackTankerLiters]);

  const handleSubmit = async () => {
    if (!user?.id || !isCustomerUser(user)) {
      Alert.alert('Error', 'You must be signed in to add a trip.');
      return;
    }
    if (photoUris.length === 0) {
      Alert.alert('Photos required', 'Please add at least one photo of the tanker.');
      return;
    }
    const d = validateDate(tripDate);
    if (!d.isValid) {
      Alert.alert('Invalid date', d.error || 'Check the date');
      return;
    }
    const t = validateTime(tripTime);
    if (!t.isValid) {
      Alert.alert('Invalid time', t.error || 'Check the time');
      return;
    }
    const scheduled = createScheduledDateFromUtils(tripDate, tripTime, timePeriod);
    if (!scheduled || isNaN(scheduled.getTime())) {
      Alert.alert('Error', 'Could not combine date and time. Please try again.');
      return;
    }
    const liters = effectiveTankerLiters;
    if (liters == null || liters <= 0 || liters > 100000) {
      Alert.alert('Tanker size', 'Choose a tanker size from the list.');
      return;
    }
    const name = selectedAgency?.name?.trim() ?? '';
    if (name.length < 2) {
      Alert.alert('Agency', 'Choose an agency from the list.');
      return;
    }
    const amountParsed = parseTankerAmountInput(tankerAmountText);
    if (amountParsed.error || amountParsed.amount == null) {
      Alert.alert('Tanker amount', amountParsed.error ?? 'Enter the tanker amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const photoUrls = await Promise.all(
        photoUris.map(uri => StorageService.uploadSocietyTripPhoto(uri, user.id).then(r => r.url)),
      );
      const agencyAdminId = selectedAgency?.id;
      await SocietyTripService.createTrip({
        customerId: user.id,
        agencyName: name,
        ...(agencyAdminId ? { agencyAdminId } : {}),
        scheduledAt: scheduled,
        tankerSizeLiters: liters,
        tankerAmount: amountParsed.amount,
        photoUrls,
      });
      Alert.alert('Trip saved', 'Your trip has been recorded.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      handleError(error, {
        context: { operation: 'addTripSubmit', userId: user.id },
        userFacing: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
            <Typography variant="h2" style={styles.title}>Add trip</Typography>
          </View>

          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>Tanker photos</Typography>
            <Card style={styles.photoCard}>
              {photoUris.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoStripContent}
                >
                  {photoUris.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.photoThumbWrap}>
                      <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={() => removePhotoAt(index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Remove photo"
                      >
                        <Ionicons name="close-circle" size={26} color={UI_CONFIG.colors.textLight} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={UI_CONFIG.colors.textSecondary} />
                  <Typography variant="body" style={styles.photoHint}>
                    Add one or more photos using the options below
                  </Typography>
                </View>
              )}
            </Card>
            <Typography variant="caption" style={styles.photoCountHint}>
              {photoUris.length}/{MAX_TRIP_PHOTOS} photos
            </Typography>
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={onTakeTankerPhoto}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={20} color={UI_CONFIG.colors.accent} />
                <Typography variant="body" style={styles.photoActionLabel}>Add photo</Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={onUploadTankerPhoto}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={20} color={UI_CONFIG.colors.accent} />
                <Typography variant="body" style={styles.photoActionLabel}>Upload from device</Typography>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>Tanker agency</Typography>
            <Card style={styles.selectionCard} onPress={() => setShowAgencyModal(true)}>
              <View style={styles.selectionContent}>
                <View style={styles.selectionInfo}>
                  <Typography variant="body" style={styles.selectionLabel}>
                    {selectedAgency ? selectedAgency.name : 'Choose tanker agency'}
                  </Typography>
                  {selectedAgency?.ownerName ? (
                    <Typography variant="caption" style={styles.selectionSubtext}>
                      Owner: {selectedAgency.ownerName}
                    </Typography>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>Tanker size</Typography>
            <Card
              style={[styles.selectionCard, !selectedAgency && styles.selectionCardDisabled]}
              onPress={openTankerPicker}
            >
              <View style={styles.selectionContent}>
                <View style={styles.selectionInfo}>
                  <Typography variant="body" style={styles.selectionLabel}>{tankerSelectionLabel}</Typography>
                  {vehiclesLoading && selectedAgency ? (
                    <Typography variant="caption" style={styles.selectionSubtext}>
                      Loading vehicles…
                    </Typography>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>Tanker amount</Typography>
            <Card style={styles.inputCard}>
              <TextInput
                style={styles.amountInput}
                placeholder="e.g. 1200 (₹)"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                value={tankerAmountText}
                onChangeText={setTankerAmountText}
                keyboardType="number-pad"
                maxLength={12}
              />
            </Card>
          </View>

          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>Date and time</Typography>
            <DateTimeInput
              date={tripDate}
              time={tripTime}
              timePeriod={timePeriod}
              dateError={dateError}
              onDateChange={handleDateChange}
              onTimeChange={handleTimeChange}
              onTimePeriodChange={setTimePeriod}
            />
          </View>

          <Button
            title="Save trip"
            onPress={handleSubmit}
            disabled={isSubmitDisabled || isSubmitting}
            loading={isSubmitting}
            style={styles.submitButton}
          />

          <AgencySelectionModal
            visible={showAgencyModal}
            onClose={() => setShowAgencyModal(false)}
            agencies={tankerAgencies}
            selectedAgencyId={selectedAgency?.id ?? null}
            onSelectAgency={handleAgencySelection}
            loading={usersLoading}
          />
          <TankerSelectionModal
            visible={showTankerModal}
            onClose={() => setShowTankerModal(false)}
            vehicles={availableVehicles}
            selectedVehicleId={selectedVehicle?.id ?? null}
            onSelectVehicle={handleVehicleSelection}
            loading={vehiclesLoading}
            selectedAgency={selectedAgency}
          />
          <Modal
            visible={showSizeFallbackModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowSizeFallbackModal(false)}
          >
            <View style={styles.fallbackModalContainer}>
              <View style={styles.fallbackModalHeader}>
                <TouchableOpacity onPress={() => setShowSizeFallbackModal(false)} accessibilityRole="button">
                  <Ionicons name="close" size={24} color={UI_CONFIG.colors.accent} />
                </TouchableOpacity>
                <Typography variant="h3" style={styles.fallbackModalTitle}>
                  Select tanker size
                </Typography>
                <View style={{ width: 24 }} />
              </View>
              <Typography variant="caption" style={styles.fallbackHint}>
                No vehicles on file for this agency — choose a standard size.
              </Typography>
              <ScrollView style={styles.fallbackScroll} contentContainerStyle={styles.fallbackScrollContent}>
                {BOOKING_CONFIG.defaultTankerSizes.map((opt, index) => (
                  <Card
                    key={`${opt.size}-${index}`}
                    style={[
                      styles.fallbackSizeCard,
                      fallbackTankerLiters === opt.size && styles.fallbackSizeCardSelected,
                    ]}
                    onPress={() => {
                      setFallbackTankerLiters(opt.size);
                      setSelectedVehicle(null);
                      setTankerAmountText('');
                      setShowSizeFallbackModal(false);
                    }}
                  >
                    <View style={styles.selectionContent}>
                      <Typography variant="body" style={styles.selectionLabel}>
                        {opt.displayName}
                      </Typography>
                      <Ionicons
                        name={fallbackTankerLiters === opt.size ? 'radio-button-on' : 'radio-button-off'}
                        size={24}
                        color={
                          fallbackTankerLiters === opt.size
                            ? UI_CONFIG.colors.accent
                            : UI_CONFIG.colors.textSecondary
                        }
                      />
                    </View>
                  </Card>
                ))}
              </ScrollView>
            </View>
          </Modal>
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
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  photoCard: {
    overflow: 'hidden',
    padding: 0,
    minHeight: 180,
  },
  photoStripContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoThumbWrap: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
  },
  photoCountHint: {
    marginTop: 8,
    color: UI_CONFIG.colors.textSecondary,
  },
  photoPlaceholder: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  photoHint: {
    marginTop: 8,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  photoActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    flexShrink: 1,
  },
  inputCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 0,
    minHeight: 52,
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
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
  fallbackModalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  fallbackModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  fallbackModalTitle: {
    color: UI_CONFIG.colors.text,
  },
  fallbackHint: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    color: UI_CONFIG.colors.textSecondary,
  },
  fallbackScroll: {
    flex: 1,
  },
  fallbackScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  fallbackSizeCard: {
    marginBottom: 12,
  },
  fallbackSizeCardSelected: {
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: UI_CONFIG.colors.accent,
  },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});

export default AddTripScreen;
