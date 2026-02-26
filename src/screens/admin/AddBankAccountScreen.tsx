import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { Typography, Card, Button, LoadingSpinner, Input, AdminMenuDrawer } from '../../components/common';
import { BankAccount } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { BankAccountService, StorageService } from '../../services';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { getErrorMessage } from '../../utils/errors';
import { Image } from 'react-native';

type AddBankAccountScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'BankAccounts'>;

interface AddBankAccountModalProps {
  visible: boolean;
  onClose: () => void;
  formData: {
    bankName: string;
    qrCodeImageUri: string | null;
    qrCodeImageUrl: string | null;
    isDefault: boolean;
  };
  formErrors: {[key: string]: string};
  isSubmitting: boolean;
  onFormChange: (field: string, value: string | boolean | null) => void;
  onPickImage: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onDelete?: () => void;
  isEditMode?: boolean;
}

const AddBankAccountModal: React.FC<AddBankAccountModalProps> = ({
  visible,
  onClose,
  formData,
  formErrors,
  isSubmitting,
  onFormChange,
  onPickImage,
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
          {isEditMode ? 'Edit Bank Account' : 'Add Bank Account'}
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
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
      </View>

      {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Bank Account Details
              </Typography>
              
              <View style={styles.formField}>
                <Input
                  label="Bank Name *"
                  value={formData.bankName}
                  onChangeText={(value) => onFormChange('bankName', value)}
                  placeholder="Enter bank name"
                  error={formErrors.bankName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formField}>
                <Typography variant="body" style={styles.imageLabel}>
                  Upload Bank Account QR Code *
                </Typography>
                <Typography variant="caption" style={styles.imageHint}>
                  Select a QR code image from your gallery
                </Typography>
                
                {(formData.qrCodeImageUri || (formData.qrCodeImageUrl && typeof formData.qrCodeImageUrl === 'string' && formData.qrCodeImageUrl.trim() !== '')) ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: formData.qrCodeImageUri || formData.qrCodeImageUrl || '' }}
                      style={styles.qrCodePreview}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        onFormChange('qrCodeImageUri', null);
                        onFormChange('qrCodeImageUrl', null);
                      }}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="close-circle" size={24} color={UI_CONFIG.colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={onPickImage}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="image-outline" size={48} color={UI_CONFIG.colors.primary} />
                    <Typography variant="body" style={styles.imagePickerText}>
                      Tap to select QR code image
                    </Typography>
                  </TouchableOpacity>
                )}
                
                {formErrors.qrCodeImageUrl && (
                  <Typography variant="caption" style={styles.errorText}>
                    {formErrors.qrCodeImageUrl}
                  </Typography>
                )}
              </View>

              <View style={styles.formField}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => onFormChange('isDefault', !formData.isDefault)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, formData.isDefault && styles.checkboxChecked]}>
                    {formData.isDefault && (
                      <Ionicons name="checkmark" size={16} color={UI_CONFIG.colors.textLight} />
                    )}
                  </View>
                  <Typography variant="body" style={styles.checkboxLabel}>
                    Set as default account
                  </Typography>
                </TouchableOpacity>
              </View>
            </Card>

            <View style={styles.modalActions}>
              <Button
                title={isSubmitting ? 'Saving...' : 'Save'}
                onPress={onSubmit}
                variant="primary"
                disabled={isSubmitting}
                style={styles.saveButton}
              />
              <Button
                title="Cancel"
                onPress={() => {
                  onReset();
                  onClose();
                }}
                variant="secondary"
                disabled={isSubmitting}
                style={styles.cancelButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Card style={styles.detailCard}>
            <Typography variant="h3" style={styles.detailSectionTitle}>
              Bank Account Details
            </Typography>
            
            <View style={styles.formField}>
              <Input
                label="Bank Name *"
                value={formData.bankName}
                onChangeText={(value) => onFormChange('bankName', value)}
                placeholder="Enter bank name"
                error={formErrors.bankName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formField}>
              <Typography variant="body" style={styles.imageLabel}>
                Upload Bank Account QR Code *
              </Typography>
              <Typography variant="caption" style={styles.imageHint}>
                Select a QR code image from your gallery
              </Typography>
              
              {(formData.qrCodeImageUri || (formData.qrCodeImageUrl && typeof formData.qrCodeImageUrl === 'string' && formData.qrCodeImageUrl.trim() !== '')) ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: formData.qrCodeImageUri || formData.qrCodeImageUrl || '' }}
                    style={styles.qrCodePreview}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      onFormChange('qrCodeImageUri', null);
                      onFormChange('qrCodeImageUrl', null);
                    }}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={24} color={UI_CONFIG.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={onPickImage}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="image-outline" size={48} color={UI_CONFIG.colors.primary} />
                  <Typography variant="body" style={styles.imagePickerText}>
                    Tap to select QR code image
                  </Typography>
                </TouchableOpacity>
              )}
              
              {formErrors.qrCodeImageUrl && (
                <Typography variant="caption" style={styles.errorText}>
                  {formErrors.qrCodeImageUrl}
                </Typography>
              )}
            </View>

            <View style={styles.formField}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => onFormChange('isDefault', !formData.isDefault)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, formData.isDefault && styles.checkboxChecked]}>
                  {formData.isDefault && (
                    <Ionicons name="checkmark" size={16} color={UI_CONFIG.colors.textLight} />
                  )}
                </View>
                <Typography variant="body" style={styles.checkboxLabel}>
                  Set as default account
                </Typography>
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.modalActions}>
            <Button
              title={isSubmitting ? 'Saving...' : 'Save'}
              onPress={onSubmit}
              variant="primary"
              disabled={isSubmitting}
              style={styles.saveButton}
            />
            <Button
              title="Cancel"
              onPress={() => {
                onReset();
                onClose();
              }}
              variant="secondary"
              disabled={isSubmitting}
              style={styles.cancelButton}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  </Modal>
);

const AddBankAccountScreen: React.FC = () => {
  const navigation = useNavigation<AddBankAccountScreenNavigationProp>();
  const { user, logout } = useAuthStore();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  
  const [formData, setFormData] = useState({
    bankName: '',
    qrCodeImageUri: null as string | null,
    qrCodeImageUrl: null as string | null,
    isDefault: false,
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBankAccounts = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const accounts = await BankAccountService.getAllBankAccounts(user.id);
      setBankAccounts(accounts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bank accounts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBankAccounts();
  }, [loadBankAccounts]);

  const resetForm = () => {
    setFormData({
      bankName: '',
      qrCodeImageUri: null,
      qrCodeImageUrl: null,
      isDefault: false,
    });
    setFormErrors({});
    setEditingAccount(null);
  };

  const handleFormChange = (field: string, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePickImage = async () => {
    try {
      const imageUri = await StorageService.pickImage();
      if (imageUri) {
        handleFormChange('qrCodeImageUri', imageUri);
        handleFormChange('qrCodeImageUrl', null); // Clear existing URL when new image is picked
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to pick image');
      Alert.alert('Error', errorMessage);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.bankName || formData.bankName.trim() === '') {
      errors.bankName = 'Bank name is required';
    }

    if (!formData.qrCodeImageUri && !formData.qrCodeImageUrl) {
      errors.qrCodeImageUrl = 'QR code image is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddAccount = async () => {
    if (!validateForm() || !user?.id) {
      return;
    }

    setIsSubmitting(true);
    try {
      let qrCodeImageUrl = formData.qrCodeImageUrl;
      let oldImagePath: string | null = null;

      // If editing and a new image was picked, delete the old image first
      if (editingAccount && formData.qrCodeImageUri && editingAccount.qrCodeImageUrl) {
        oldImagePath = StorageService.extractFilePathFromUrl(editingAccount.qrCodeImageUrl);
      }

      // If a new image was picked, upload it first
      if (formData.qrCodeImageUri) {
        const uploadResult = await StorageService.uploadQRCodeImage(
          formData.qrCodeImageUri,
          user.id,
          editingAccount?.id
        );
        qrCodeImageUrl = uploadResult.url;

        // Delete the old image from storage after successful upload
        if (oldImagePath) {
          try {
            await StorageService.deleteQRCodeImage(oldImagePath);
          } catch (storageError) {
            // Continue even if old image deletion fails
          }
        }
      }

      if (!qrCodeImageUrl) {
        throw new Error('QR code image URL is required');
      }

      const accountData = {
        bankName: formData.bankName.trim(),
        qrCodeImageUrl,
        isDefault: formData.isDefault,
      };

      if (editingAccount) {
        await BankAccountService.updateBankAccount(editingAccount.id, accountData, user.id);
        Alert.alert('Success', 'Bank account updated successfully');
      } else {
        await BankAccountService.createBankAccount(accountData, user.id);
        Alert.alert('Success', 'Bank account added successfully');
      }

      resetForm();
      setShowAddModal(false);
      loadBankAccounts();
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to save bank account. Please try again.');
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      bankName: account.bankName || '',
      qrCodeImageUri: null,
      qrCodeImageUrl: account.qrCodeImageUrl || null,
      isDefault: account.isDefault,
    });
    setShowAddModal(true);
  };

  const handleDeleteAccount = async () => {
    if (!editingAccount || !user?.id) return;

    Alert.alert(
      'Delete Bank Account',
      'Are you sure you want to delete this bank account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the QR code image from storage if it exists
              if (editingAccount.qrCodeImageUrl) {
                try {
                  const filePath = StorageService.extractFilePathFromUrl(editingAccount.qrCodeImageUrl);
                  if (filePath) {
                    await StorageService.deleteQRCodeImage(filePath);
                  }
                } catch (storageError) {
                  // Continue with account deletion even if image deletion fails
                }
              }

              // Delete the bank account from database
              await BankAccountService.deleteBankAccount(editingAccount.id, user.id);
              Alert.alert('Success', 'Bank account deleted successfully');
              resetForm();
              setShowAddModal(false);
              loadBankAccounts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bank account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (accountId: string) => {
    if (!user?.id) return;
    try {
      await BankAccountService.setDefaultBankAccount(accountId, user.id);
      loadBankAccounts();
    } catch (error) {
      Alert.alert('Error', 'Failed to set default account. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: 'Bookings' | 'Drivers' | 'Vehicles' | 'Reports' | 'Profile' | 'BankAccounts') => {
    if (route === 'BankAccounts') {
      setMenuVisible(false);
      return;
    }
    navigation.navigate(route);
  };

  const BankAccountCard: React.FC<{ account: BankAccount }> = ({ account }) => (
    <Card style={styles.accountCard}>
      <View style={styles.accountCardContent}>
        <View style={styles.accountHeader}>
          <View style={styles.accountInfo}>
            <View style={styles.accountTitleRow}>
              <View style={styles.bankNameContainer}>
                <Typography variant="h3" style={styles.accountBankName}>
                  {account.bankName || 'Bank Account'}
                </Typography>
              </View>
              {account.isDefault && (
                <View style={styles.defaultBadge}>
                  <Typography variant="caption" style={styles.defaultBadgeText}>
                    DEFAULT
                  </Typography>
                </View>
              )}
            </View>
          </View>
          <View style={styles.accountActions}>
            {!account.isDefault && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSetDefault(account.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={20} color={UI_CONFIG.colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditAccount(account)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={20} color={UI_CONFIG.colors.success} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Typography variant="body" style={styles.loadingText}>
            Loading bank accounts...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
            <Typography variant="h2" style={styles.headerTitle}>Bank Accounts</Typography>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Bank Accounts List */}
        <View style={styles.accountsSection} pointerEvents={showAddModal ? 'none' : 'auto'}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Bank Accounts ({bankAccounts.length})
          </Typography>
          
          {bankAccounts.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyText}>
                No bank accounts added yet
              </Typography>
              <Typography variant="body" style={styles.emptySubtext}>
                Add your first bank account to get started
              </Typography>
            </Card>
          ) : (
            bankAccounts.map((account) => (
              <BankAccountCard key={account.id} account={account} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={UI_CONFIG.colors.textLight} />
      </TouchableOpacity>

      <AddBankAccountModal 
        visible={showAddModal}
        onClose={() => {
          resetForm();
          setShowAddModal(false);
        }}
        formData={formData}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        onFormChange={handleFormChange}
        onPickImage={handlePickImage}
        onSubmit={handleAddAccount}
        onReset={resetForm}
        onDelete={handleDeleteAccount}
        isEditMode={editingAccount !== null}
      />
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="BankAccounts"
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
    paddingBottom: 100,
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
  accountsSection: {
    padding: UI_CONFIG.spacing.md,
  },
  sectionTitle: {
    marginBottom: UI_CONFIG.spacing.md,
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  accountCard: {
    marginBottom: UI_CONFIG.spacing.md,
    padding: UI_CONFIG.spacing.md,
    borderWidth: 1,
    borderColor: '#000000',
  },
  accountCardContent: {
    width: '100%',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  bankNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  accountBankName: {
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    fontSize: 18,
    lineHeight: 24,
  },
  accountSubtitle: {
    color: UI_CONFIG.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  defaultBadge: {
    backgroundColor: UI_CONFIG.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: UI_CONFIG.colors.textLight,
    fontSize: 10,
    fontWeight: '600',
  },
  accountHolderName: {
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  accountDetails: {
    color: UI_CONFIG.colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    padding: UI_CONFIG.spacing.xl,
    alignItems: 'center',
    marginTop: UI_CONFIG.spacing.lg,
  },
  emptyText: {
    marginTop: UI_CONFIG.spacing.md,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: UI_CONFIG.spacing.sm,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI_CONFIG.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
  },
  headerDeleteButton: {
    padding: 8,
    marginRight: 8,
  },
  headerDeleteButtonDisabled: {
    opacity: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: UI_CONFIG.spacing.md,
  },
  detailCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailSectionTitle: {
    marginBottom: UI_CONFIG.spacing.md,
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  formField: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  checkboxLabel: {
    color: UI_CONFIG.colors.text,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: UI_CONFIG.spacing.md,
    marginTop: UI_CONFIG.spacing.lg,
    marginBottom: UI_CONFIG.spacing.xl,
  },
  saveButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  imageLabel: {
    marginBottom: 8,
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  imageHint: {
    marginBottom: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontSize: 12,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_CONFIG.colors.surface,
    minHeight: 200,
  },
  imagePickerText: {
    marginTop: 12,
    color: UI_CONFIG.colors.primary,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
  },
  qrCodePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  qrCodeImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  qrCodeContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    marginTop: 4,
  },
});

export default AddBankAccountScreen;

