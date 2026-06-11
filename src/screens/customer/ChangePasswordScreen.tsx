import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card } from '../../components/common';
import AppScreenHeader from '../../components/layouts/AppScreenHeader';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils } from '../../utils';
import { getErrorMessage } from '../../utils/errors';
import { securityLogger, SecurityEventType, SecuritySeverity } from '../../utils/securityLogger';

type ChangePasswordNav = StackNavigationProp<AppStackParamList, 'ChangePassword'>;

interface Props {
  navigation: ChangePasswordNav;
}

function createChangePasswordStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 48,
    },
    subtitle: {
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
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
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 4,
    },
    submitButton: {
      marginTop: 8,
    },
  });
}

const ChangePasswordScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createChangePasswordStyles(colors), [colors]);
  const { changePassword, isLoading, user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async () => {
    const currentValidation = ValidationUtils.validatePassword(currentPassword);
    const newValidation = ValidationUtils.validatePassword(newPassword);
    const confirmValidation = ValidationUtils.validateConfirmPassword(newPassword, confirmPassword);

    if (!currentValidation.isValid || !newValidation.isValid || !confirmValidation.isValid) {
      setErrors({
        ...(currentValidation.error && { currentPassword: currentValidation.error }),
        ...(newValidation.error && { newPassword: newValidation.error }),
        ...(confirmValidation.error && { confirmPassword: confirmValidation.error }),
      });
      return;
    }

    if (currentPassword === newPassword) {
      setErrors({ newPassword: 'New password must be different from your current password.' });
      return;
    }

    setErrors({});
    securityLogger.log(
      SecurityEventType.PASSWORD_CHANGE_ATTEMPT,
      SecuritySeverity.INFO,
      { context: 'profile_change_password' },
      user?.id
    );

    try {
      await changePassword(currentPassword, newPassword);
      securityLogger.log(
        SecurityEventType.PASSWORD_CHANGE_SUCCESS,
        SecuritySeverity.INFO,
        { context: 'profile_change_password' },
        user?.id
      );
      Alert.alert('Password updated', SUCCESS_MESSAGES.profile.passwordChanged, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      securityLogger.log(
        SecurityEventType.PASSWORD_CHANGE_FAILURE,
        SecuritySeverity.WARNING,
        { error: getErrorMessage(error, 'change failed') },
        user?.id
      );
      Alert.alert(
        'Could not change password',
        getErrorMessage(error, ERROR_MESSAGES.auth.passwordUpdateFailed)
      );
    }
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    show: boolean,
    toggleShow: () => void,
    error?: string
  ) => (
    <View style={styles.inputContainer}>
      <Typography variant="body" style={styles.label}>
        {label}
      </Typography>
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput, error && styles.inputError]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
        />
        <TouchableOpacity style={styles.eyeIcon} onPress={toggleShow}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      {error ? (
        <Typography variant="caption" style={styles.errorText}>
          {error}
        </Typography>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppScreenHeader
        left={{ type: 'back', onPress: () => navigation.goBack() }}
        title="Change password"
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Typography variant="body" style={styles.subtitle}>
            {SUCCESS_MESSAGES.auth.changePasswordSubtitle}
          </Typography>
          <Card padding="large">
            {renderPasswordField(
              'Current password',
              currentPassword,
              setCurrentPassword,
              showCurrent,
              () => setShowCurrent(!showCurrent),
              errors.currentPassword
            )}
            {renderPasswordField(
              'New password',
              newPassword,
              setNewPassword,
              showNew,
              () => setShowNew(!showNew),
              errors.newPassword
            )}
            {renderPasswordField(
              'Confirm new password',
              confirmPassword,
              setConfirmPassword,
              showConfirm,
              () => setShowConfirm(!showConfirm),
              errors.confirmPassword
            )}
            <Button
              title={isLoading ? 'Saving…' : SUCCESS_MESSAGES.auth.changePasswordSubmit}
              onPress={handleSubmit}
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              style={styles.submitButton}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangePasswordScreen;
