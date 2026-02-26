import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import Card from '../common/Card';
import { Typography } from '../common';
import { Address } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';

type SavedAddressModalNavigationProp = StackNavigationProp<CustomerStackParamList>;

interface SavedAddressModalProps {
  visible: boolean;
  onClose: () => void;
  addresses: Address[];
  onSelectAddress: (address: Address) => void;
  navigation: SavedAddressModalNavigationProp;
}

const SavedAddressModal: React.FC<SavedAddressModalProps> = ({
  visible,
  onClose,
  addresses,
  onSelectAddress,
  navigation,
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Select Saved Address</Typography>
          <TouchableOpacity onPress={() => {
            onClose();
            navigation.navigate('SavedAddresses');
          }}>
            <Ionicons name="add" size={24} color={UI_CONFIG.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {addresses && addresses.length > 0 ? (
            addresses.map((address) => (
              <Card
                key={address.id}
                style={styles.addressCard}
                onPress={() => onSelectAddress(address)}
              >
                <View style={styles.addressInfo}>
                  <View style={styles.addressTitleRow}>
                    <Typography variant="body" style={styles.addressTitle}>{address.address}</Typography>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Typography variant="caption" style={styles.defaultText}>DEFAULT</Typography>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyStateText}>No saved addresses</Typography>
              <Typography variant="caption" style={styles.emptyStateSubtext}>Add your first address to get started</Typography>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => {
                  onClose();
                  navigation.navigate('SavedAddresses');
                }}
              >
                <Typography variant="body" style={styles.emptyStateButtonText}>Add Address</Typography>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  addressCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: UI_CONFIG.colors.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: UI_CONFIG.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.textLight,
  },
  addressDetails: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 4,
  },
  landmark: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    fontStyle: 'italic',
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
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: UI_CONFIG.colors.primary,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
  },
});

export default SavedAddressModal;

