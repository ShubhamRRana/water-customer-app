import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Typography } from '../../components/common';
import DateTimeInput from '../../components/customer/DateTimeInput';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { UI_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { StorageService } from '../../services/storage.service';
import { SocietyTripService } from '../../services/societyTrip.service';
import { createScheduledDate as createScheduledDateFromUtils } from '../../utils/dateUtils';
import { isCustomerUser } from '../../types';
import { handleError } from '../../utils/errorHandler';

type AddTripNavigationProp = StackNavigationProp<CustomerStackParamList, 'AddTrip'>;

const getTodayDateString = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
};

const AddTripScreen: React.FC = () => {
  const navigation = useNavigation<AddTripNavigationProp>();
  const { user } = useAuthStore();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [tripDate, setTripDate] = useState(() => getTodayDateString());
  const [tripTime, setTripTime] = useState('');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [tankerSizeLiters, setTankerSizeLiters] = useState('');
  const [dateError, setDateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onPickPhoto = async () => {
    try {
      const uri = await StorageService.pickImage([4, 3]);
      if (uri) setPhotoUri(uri);
    } catch (error) {
      handleError(error, { context: { operation: 'addTripPickPhoto' }, userFacing: true });
    }
  };

  const isSubmitDisabled = useMemo(() => {
    const size = parseInt(tankerSizeLiters.replace(/\D/g, ''), 10);
    const sizeOk = !Number.isNaN(size) && size > 0;
    return (
      !photoUri ||
      !agencyName.trim() ||
      !tripDate.trim() ||
      !tripTime.trim() ||
      !!dateError ||
      !sizeOk ||
      isSubmitting
    );
  }, [photoUri, agencyName, tripDate, tripTime, dateError, tankerSizeLiters, isSubmitting]);

  const handleSubmit = async () => {
    if (!user?.id || !isCustomerUser(user)) {
      Alert.alert('Error', 'You must be signed in to add a trip.');
      return;
    }
    if (!photoUri) {
      Alert.alert('Photo required', 'Please add a photo of the tanker.');
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
    const liters = parseInt(tankerSizeLiters.replace(/\D/g, ''), 10);
    if (Number.isNaN(liters) || liters <= 0 || liters > 100000) {
      Alert.alert('Invalid size', 'Enter tanker size in liters (1–100000).');
      return;
    }
    const name = agencyName.trim();
    if (name.length < 2) {
      Alert.alert('Agency name', 'Enter the agency name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { url: photoUrl } = await StorageService.uploadSocietyTripPhoto(photoUri, user.id);
      await SocietyTripService.createTrip({
        customerId: user.id,
        agencyName: name,
        scheduledAt: scheduled,
        tankerSizeLiters: liters,
        photoUrl,
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
            <Typography variant="h3" style={styles.sectionTitle}>Tanker photo</Typography>
            <TouchableOpacity activeOpacity={0.85} onPress={onPickPhoto}>
              <Card style={styles.photoCard}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={40} color={UI_CONFIG.colors.textSecondary} />
                    <Typography variant="body" style={styles.photoHint}>Tap to add photo</Typography>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>Agency name</Typography>
            <Card style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ABC Water Supply"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                value={agencyName}
                onChangeText={setAgencyName}
              />
            </Card>
          </View>

          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>Tanker size (liters)</Typography>
            <Card style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1000"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                value={tankerSizeLiters}
                onChangeText={(text) => setTankerSizeLiters(text.replace(/[^\d]/g, ''))}
                keyboardType="number-pad"
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
  photoPreview: {
    width: '100%',
    height: 200,
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
  },
  inputCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});

export default AddTripScreen;
