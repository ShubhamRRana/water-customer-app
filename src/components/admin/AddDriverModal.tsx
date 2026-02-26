import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { Typography, Card, Button, Input } from '../common';
import { UI_CONFIG } from '../../constants/config';

export interface AddDriverModalProps {
  visible: boolean;
  onClose: () => void;
  formData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    licenseNumber: string;
    licenseExpiry: string;
  };
  formErrors: {[key: string]: string};
  isSubmitting: boolean;
  onFormChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onDelete?: () => void;
  isEditMode?: boolean;
}

const AddDriverModal: React.FC<AddDriverModalProps> = ({
  visible,
  onClose,
  formData,
  formErrors,
  isSubmitting,
  onFormChange,
  onSubmit,
  onReset,
  onDelete,
  isEditMode = false,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="fullScreen"
    transparent={false}
    onRequestClose={onClose}
  >
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Typography variant="h2" style={styles.modalTitle}>
          {isEditMode ? 'Edit Driver' : 'Add New Driver'}
        </Typography>
        {isEditMode && onDelete && (
          <TouchableOpacity
            style={[styles.headerDeleteButton, isSubmitting && styles.headerDeleteButtonDisabled]}
            onPress={onDelete}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={24} color={isSubmitting ? UI_CONFIG.colors.textSecondary : UI_CONFIG.colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.detailCard}>
          <Typography variant="h3" style={styles.detailSectionTitle}>
            Driver Information
          </Typography>
          
          <View style={styles.formField}>
            <Input
              label="Full Name *"
              value={formData.name}
              onChangeText={(text) => onFormChange('name', text)}
              placeholder="Enter driver's full name"
              error={formErrors.name}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="Email Address *"
              value={formData.email}
              onChangeText={(text) => onFormChange('email', text)}
              placeholder="Enter email address"
              error={formErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="Phone Number *"
              value={formData.phone}
              onChangeText={(text) => onFormChange('phone', text)}
              placeholder="Enter 10-digit phone number"
              error={formErrors.phone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.formField}>
            <Input
              label={isEditMode ? "Password (leave blank to keep current)" : "Password *"}
              value={formData.password}
              onChangeText={(text) => onFormChange('password', text)}
              placeholder={isEditMode ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
              error={formErrors.password}
              secureTextEntry
            />
          </View>

          {(!isEditMode || formData.password) && (
            <View style={styles.formField}>
              <Input
                label="Confirm Password *"
                value={formData.confirmPassword}
                onChangeText={(text) => onFormChange('confirmPassword', text)}
                placeholder="Confirm your password"
                error={formErrors.confirmPassword}
                secureTextEntry
              />
            </View>
          )}

          <View style={styles.formField}>
            <Input
              label="Emergency Contact Name *"
              value={formData.emergencyContactName}
              onChangeText={(text) => onFormChange('emergencyContactName', text)}
              placeholder="Enter emergency contact name"
              error={formErrors.emergencyContactName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="Emergency Contact Number *"
              value={formData.emergencyContactPhone}
              onChangeText={(text) => onFormChange('emergencyContactPhone', text)}
              placeholder="Enter 10-digit emergency contact number"
              error={formErrors.emergencyContactPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="License Number *"
              value={formData.licenseNumber}
              onChangeText={(text) => onFormChange('licenseNumber', text)}
              placeholder="Enter driver's license number"
              error={formErrors.licenseNumber}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="License Expiry (DD/MM/YYYY) *"
              value={formData.licenseExpiry}
              onChangeText={(text) => onFormChange('licenseExpiry', text)}
              placeholder="e.g., 31/12/2026"
              error={formErrors.licenseExpiry}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
        </Card>

        <View style={styles.modalActions}>
          <Button
            title={isSubmitting ? (isEditMode ? "Updating Driver..." : "Adding Driver...") : (isEditMode ? "Update Driver" : "Add Driver")}
            onPress={onSubmit}
            disabled={isSubmitting}
            style={styles.addDriverButton}
          />
          <Button
            title="Cancel"
            onPress={() => {
              onClose();
              onReset();
            }}
            style={styles.cancelButton}
            variant="outline"
          />
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Card style={styles.detailCard}>
            <Typography variant="h3" style={styles.detailSectionTitle}>
              Driver Information
            </Typography>
            
            <View style={styles.formField}>
              <Input
                label="Full Name *"
                value={formData.name}
                onChangeText={(text) => onFormChange('name', text)}
                placeholder="Enter driver's full name"
                error={formErrors.name}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Email Address *"
                value={formData.email}
                onChangeText={(text) => onFormChange('email', text)}
                placeholder="Enter email address"
                error={formErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Phone Number *"
                value={formData.phone}
                onChangeText={(text) => onFormChange('phone', text)}
                placeholder="Enter 10-digit phone number"
                error={formErrors.phone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.formField}>
              <Input
                label={isEditMode ? "Password (leave blank to keep current)" : "Password *"}
                value={formData.password}
                onChangeText={(text) => onFormChange('password', text)}
                placeholder={isEditMode ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
                error={formErrors.password}
                secureTextEntry
              />
            </View>

            {(!isEditMode || formData.password) && (
              <View style={styles.formField}>
                <Input
                  label="Confirm Password *"
                  value={formData.confirmPassword}
                  onChangeText={(text) => onFormChange('confirmPassword', text)}
                  placeholder="Confirm your password"
                  error={formErrors.confirmPassword}
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.formField}>
              <Input
                label="Emergency Contact Name *"
                value={formData.emergencyContactName}
                onChangeText={(text) => onFormChange('emergencyContactName', text)}
                placeholder="Enter emergency contact name"
                error={formErrors.emergencyContactName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Emergency Contact Number *"
                value={formData.emergencyContactPhone}
                onChangeText={(text) => onFormChange('emergencyContactPhone', text)}
                placeholder="Enter 10-digit emergency contact number"
                error={formErrors.emergencyContactPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="License Number *"
                value={formData.licenseNumber}
                onChangeText={(text) => onFormChange('licenseNumber', text)}
                placeholder="Enter driver's license number"
                error={formErrors.licenseNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="License Expiry (DD/MM/YYYY) *"
                value={formData.licenseExpiry}
                onChangeText={(text) => onFormChange('licenseExpiry', text)}
                placeholder="e.g., 31/12/2026"
                error={formErrors.licenseExpiry}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </Card>

          <View style={styles.modalActions}>
            <Button
              title={isSubmitting ? (isEditMode ? "Updating Driver..." : "Adding Driver...") : (isEditMode ? "Update Driver" : "Add Driver")}
              onPress={onSubmit}
              disabled={isSubmitting}
              style={styles.addDriverButton}
            />
            <Button
              title="Cancel"
              onPress={() => {
                onClose();
                onReset();
              }}
              style={styles.cancelButton}
              variant="outline"
            />
          </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingTop: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  headerDeleteButton: {
    padding: UI_CONFIG.spacing.sm,
  },
  headerDeleteButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: UI_CONFIG.spacing.lg,
  },
  detailCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  formField: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  modalActions: {
    marginTop: UI_CONFIG.spacing.lg,
  },
  addDriverButton: {
    backgroundColor: UI_CONFIG.colors.primary,
    marginBottom: UI_CONFIG.spacing.md,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.textSecondary,
  },
});

export default AddDriverModal;

