import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import { Typography, ScreenLoading } from '../../components/common';
import { Address, isCustomerUser } from '../../types';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { dataAccess } from '../../lib';
import { LOCATION_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { invalidateAuthProfileQueries } from '../../hooks/queries';

type SavedAddressesScreenNavigationProp = StackNavigationProp<AppStackParamList, 'SavedAddresses'>;

interface SavedAddressesScreenProps {
  navigation: SavedAddressesScreenNavigationProp;
}

const SavedAddressesScreen: React.FC<SavedAddressesScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createSavedAddressesStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { user, updateUser, isLoading } = useAuthStore();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddressText, setNewAddressText] = useState('');
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    if (!user || !isCustomerUser(user) || !user.savedAddresses) {
      setAddresses([]);
      return;
    }
    setAddresses(user.savedAddresses);
  };

  const handleSaveAddress = useCallback(async () => {
    // Sanitize and validate address
    const sanitizedAddress = SanitizationUtils.sanitizeAddress(newAddressText.trim());
    const addressValidation = ValidationUtils.validateAddressText(sanitizedAddress);
    
    if (!addressValidation.isValid) {
      Alert.alert('Invalid Address', addressValidation.error || 'Please enter a valid address');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    try {
      let updatedAddresses: Address[];
      
      if (editingAddress) {
        // Update existing address
        const updatedAddress: Address = {
          ...editingAddress,
          address: sanitizedAddress,
        };
        
        updatedAddresses = addresses.map(addr => 
          addr.id === editingAddress.id ? updatedAddress : addr
        );
      } else {
        // Add new address
        // TODO: Replace mock coordinates with actual geocoding service
        const addressToSave: Address = {
          id: dataAccess.generateId(),
          address: sanitizedAddress,
          latitude: LOCATION_CONFIG.defaultCenter.latitude + (Math.random() - 0.5) * 0.1,
          longitude: LOCATION_CONFIG.defaultCenter.longitude + (Math.random() - 0.5) * 0.1,
          isDefault: addresses.length === 0, // First address becomes default
        };
        
        updatedAddresses = [...addresses, addressToSave];
      }

      setAddresses(updatedAddresses);
      
      // Update user in auth store
      if (user) {
        await updateUser({ savedAddresses: updatedAddresses });
        invalidateAuthProfileQueries(queryClient, user.id);
      }

      setNewAddressText('');
      setEditingAddress(null);
      
      Alert.alert('Success', editingAddress ? 'Address updated successfully' : 'Address saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save address. Please try again.');
    }
  }, [newAddressText, editingAddress, addresses, user, updateUser, queryClient]);

  const handleDeleteAddress = useCallback((addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) {
              Alert.alert('Error', 'User not found. Please log in again.');
              return;
            }

            try {
              const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
              
              // If we deleted the default address, make the first remaining address default
              if (updatedAddresses.length > 0 && !updatedAddresses.some(addr => addr.isDefault)) {
                updatedAddresses[0]!.isDefault = true;
              }

              setAddresses(updatedAddresses);
              
              if (user) {
                await updateUser({ savedAddresses: updatedAddresses });
                invalidateAuthProfileQueries(queryClient, user.id);
              }

              Alert.alert('Success', 'Address deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            }
          },
        },
      ]
    );
  }, [addresses, user, updateUser, queryClient]);

  const handleSetDefault = useCallback(async (addressId: string) => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    try {
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId,
      }));

      setAddresses(updatedAddresses);
      
      if (user) {
        await updateUser({ savedAddresses: updatedAddresses });
        invalidateAuthProfileQueries(queryClient, user.id);
      }
      
      Alert.alert('Success', 'Default address updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update default address. Please try again.');
    }
  }, [addresses, user, updateUser, queryClient]);

  const handleEditAddress = useCallback((address: Address) => {
    setEditingAddress(address);
    setNewAddressText(address.address);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingAddress(null);
    setNewAddressText('');
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenLoading message="Loading addresses..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Typography variant="h3" style={styles.title}>Saved Addresses</Typography>
        <View style={{ width: 24 }} />
      </View>

      {/* Add/Edit Address Input */}
      <View style={styles.addAddressContainer}>
        <Card style={styles.inputCard}>
          {editingAddress && (
            <View style={styles.editModeHeader}>
              <Typography variant="caption" style={styles.editModeText}>Editing Address</Typography>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Ionicons name="close" size={20} color={colors.error} />
                <Typography variant="caption" style={styles.cancelButtonText}>Cancel</Typography>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.addressInput}
              placeholder={editingAddress ? "Edit address..." : "Enter new address..."}
              placeholderTextColor={colors.textSecondary}
              value={newAddressText}
              onChangeText={(text: string) => {
                setNewAddressText(text);
              }}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleSaveAddress}
              disabled={!newAddressText.trim()}
            >
              <Ionicons 
                name={editingAddress ? "checkmark" : "add"} 
                size={20} 
                color={newAddressText.trim() ? colors.accent : colors.textSecondary} 
              />
              <Typography variant="body" style={[
                styles.addButtonText,
                { color: newAddressText.trim() ? colors.accent : colors.textSecondary }
              ]}>
                {editingAddress ? 'Update' : 'Add'}
              </Typography>
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id!}
        renderItem={({ item: address }) => (
          <Card style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressInfo}>
                    <View style={styles.addressTitleRow}>
                      <Typography variant="body" style={styles.addressTitle}>
                        {address.address}
                      </Typography>
                      {address.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Typography variant="caption" style={styles.defaultText}>DEFAULT</Typography>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                {!address.isDefault && (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => handleSetDefault(address.id!)}
                  >
                    <Ionicons name="star-outline" size={16} color={colors.warning} />
                    <Typography variant="caption" style={styles.setDefaultText}>Set as Default</Typography>
                  </TouchableOpacity>
                )}

                <View style={styles.addressActionsRow}>
                  <TouchableOpacity
                    style={styles.bottomActionButton}
                    onPress={() => handleEditAddress(address)}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.accent} />
                    <Typography variant="caption" style={styles.editButtonText}>Edit</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bottomActionButton}
                    onPress={() => handleDeleteAddress(address.id!)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Typography variant="caption" style={styles.deleteButtonText}>Delete</Typography>
                  </TouchableOpacity>
                </View>
              </Card>
        )}
        style={styles.content}
        contentContainerStyle={addresses.length === 0 ? styles.emptyContainer : styles.addressList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={colors.textSecondary} />
            <Typography variant="h3" style={styles.emptyStateText}>No saved addresses</Typography>
            <Typography variant="body" style={styles.emptyStateSubtext}>Add your first address using the input above</Typography>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
      </View>
    </SafeAreaView>
  );
};

function createSavedAddressesStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  addAddressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputCard: {
    marginBottom: 0,
  },
  editModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
    marginLeft: 4,
  },
  addressInput: {
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    minHeight: 60,
    textAlignVertical: 'top',
    flex: 1,
    marginRight: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    minWidth: 60,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 32,
  },
  addressList: {
    gap: 12,
  },
  addressCard: {
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressInfo: {
    flex: 1,
    marginRight: 12,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  addressDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  landmark: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  addressActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.accent,
    marginLeft: 4,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
    marginLeft: 4,
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setDefaultText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.warning,
    marginLeft: 4,
  },
  });
}

export default SavedAddressesScreen;
