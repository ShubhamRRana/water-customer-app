import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import { Typography, Button } from '../common';
import { UI_CONFIG } from '../../constants/config';

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

interface EditProfileFormProps {
  formData: FormState;
  formErrors: FormErrors;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onFieldChange: (field: keyof FormState, value: string) => void;
  onTogglePasswordVisibility: () => void;
  onToggleConfirmPasswordVisibility: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({
  formData,
  formErrors,
  showPassword,
  showConfirmPassword,
  isSaving,
  isDirty,
  onFieldChange,
  onTogglePasswordVisibility,
  onToggleConfirmPasswordVisibility,
  onSave,
  onCancel,
}) => {
  const businessNameInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const getCharacterCount = (text: string, maxLength: number) => {
    return `${text.length}/${maxLength}`;
  };

  const getCharacterCountColor = (text: string, maxLength: number) => {
    const percentage = (text.length / maxLength) * 100;
    if (percentage >= 90) return UI_CONFIG.colors.error;
    if (percentage >= 75) return UI_CONFIG.colors.warning;
    return UI_CONFIG.colors.textSecondary;
  };

  return (
    <Card style={styles.editCard}>
      <Typography variant="h3" style={styles.sectionTitle}>Edit Profile</Typography>
      
      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Business Name</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.businessName, 100) }
            ]}
          >
            {getCharacterCount(formData.businessName, 100)}
          </Typography>
        </View>
        <TextInput
          ref={businessNameInputRef}
          style={[styles.textInput, formErrors.businessName && styles.textInputError]}
          value={formData.businessName}
          onChangeText={(t) => onFieldChange('businessName', t)}
          placeholder="Enter business name"
          placeholderTextColor={UI_CONFIG.colors.textSecondary}
          accessibilityLabel="Business name input"
          accessibilityHint="Enter your business name. Maximum 100 characters."
          maxLength={100}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => nameInputRef.current?.focus()}
        />
        {formErrors.businessName && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.businessName}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Full Name</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.name, 50) }
            ]}
          >
            {getCharacterCount(formData.name, 50)}
          </Typography>
        </View>
        <TextInput
          ref={nameInputRef}
          style={[styles.textInput, formErrors.name && styles.textInputError]}
          value={formData.name}
          onChangeText={(t) => onFieldChange('name', t)}
          placeholder="Enter full name"
          placeholderTextColor={UI_CONFIG.colors.textSecondary}
          accessibilityLabel="Full name input"
          accessibilityHint="Enter your full name. Maximum 50 characters."
          maxLength={50}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailInputRef.current?.focus()}
        />
        {formErrors.name && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.name}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Email Address</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.email, 100) }
            ]}
          >
            {getCharacterCount(formData.email, 100)}
          </Typography>
        </View>
        <TextInput
          ref={emailInputRef}
          style={[styles.textInput, formErrors.email && styles.textInputError]}
          value={formData.email}
          onChangeText={(t) => onFieldChange('email', t)}
          placeholder="Enter email address"
          placeholderTextColor={UI_CONFIG.colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Email address input"
          accessibilityHint="Enter your email address. This is used for authentication."
          returnKeyType="next"
          onSubmitEditing={() => phoneInputRef.current?.focus()}
        />
        {formErrors.email && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.email}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Phone Number</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.phone, 10) }
            ]}
          >
            {getCharacterCount(formData.phone, 10)}
          </Typography>
        </View>
        <TextInput
          ref={phoneInputRef}
          style={[styles.textInput, formErrors.phone && styles.textInputError]}
          value={formData.phone}
          onChangeText={(t) => onFieldChange('phone', t)}
          placeholder="Enter phone number"
          placeholderTextColor={UI_CONFIG.colors.textSecondary}
          keyboardType="phone-pad"
          maxLength={10}
          accessibilityLabel="Phone number input"
          accessibilityHint="Enter your 10-digit phone number starting with 6-9. This field is required."
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
        />
        {formErrors.phone && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.phone}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Typography variant="body" style={styles.inputLabel}>Password</Typography>
        <View style={[
          styles.passwordInputContainer,
          formErrors.password && styles.textInputError
        ]}>
          <TextInput
            ref={passwordInputRef}
            style={styles.passwordInput}
            value={formData.password}
            onChangeText={(t) => onFieldChange('password', t)}
            placeholder="Leave blank to keep current"
            placeholderTextColor={UI_CONFIG.colors.textSecondary}
            secureTextEntry={!showPassword}
            accessibilityLabel="Password input"
            accessibilityHint="Enter new password or leave blank to keep current. Minimum 6 characters."
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={onTogglePasswordVisibility}
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            accessibilityRole="button"
            accessibilityHint="Toggles password visibility"
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={UI_CONFIG.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {formErrors.password && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.password}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Typography variant="body" style={styles.inputLabel}>Confirm Password</Typography>
        <View style={[
          styles.passwordInputContainer,
          formErrors.confirmPassword && styles.textInputError
        ]}>
          <TextInput
            ref={confirmPasswordInputRef}
            style={styles.passwordInput}
            value={formData.confirmPassword}
            onChangeText={(t) => onFieldChange('confirmPassword', t)}
            placeholder="Confirm new password"
            placeholderTextColor={UI_CONFIG.colors.textSecondary}
            secureTextEntry={!showConfirmPassword}
            accessibilityLabel="Confirm password input"
            accessibilityHint="Confirm your new password. Must match the password above."
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={onToggleConfirmPasswordVisibility}
            accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            accessibilityRole="button"
            accessibilityHint="Toggles confirm password visibility"
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={UI_CONFIG.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {formErrors.confirmPassword && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.confirmPassword}
          </Typography>
        )}
      </View>

      <View style={styles.row}>
        <Button 
          title="Cancel" 
          onPress={onCancel}
          variant="outline" 
          style={styles.rowButton}
          disabled={isSaving}
        />
        <Button 
          title={isSaving ? "Saving..." : "Save"} 
          onPress={onSave} 
          variant="primary" 
          style={styles.rowButton}
          disabled={isSaving || !isDirty}
          loading={isSaving}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  editCard: {
    marginHorizontal: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  textInputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  eyeIcon: {
    padding: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default EditProfileForm;

