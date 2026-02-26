import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';

interface TankerSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  vehicles: Array<{
    id: string;
    vehicleCapacity: number;
    amount?: number;
    vehicleNumber: string;
  }>;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicle: {
    id: string;
    capacity: number;
    amount?: number;
    vehicleNumber: string;
  }) => void;
  loading: boolean;
  selectedAgency: { id: string; name: string; ownerName?: string } | null;
}

const TankerSelectionModal: React.FC<TankerSelectionModalProps> = ({
  visible,
  onClose,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  loading,
  selectedAgency,
}) => {
  const handleVehicleSelection = (vehicle: {
    id: string;
    vehicleCapacity: number;
    amount?: number;
    vehicleNumber: string;
  }) => {
    onSelectVehicle({
      id: vehicle.id,
      capacity: vehicle.vehicleCapacity,
      amount: vehicle.amount,
      vehicleNumber: vehicle.vehicleNumber,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Select Vehicle</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <View style={styles.emptyState}>
              <LoadingSpinner />
              <Typography variant="body" style={styles.emptyStateText}>Loading vehicles...</Typography>
            </View>
          ) : vehicles.length > 0 ? (
            <>
              {vehicles.map((vehicle, index) => (
                <Card
                  key={vehicle.id || `vehicle-${index}`}
                  style={[
                    styles.tankerCard,
                    selectedVehicleId === vehicle.id && styles.selectedTankerCard,
                  ]}
                  onPress={() => handleVehicleSelection(vehicle)}
                >
                  <View style={styles.tankerInfo}>
                    <Typography variant="body" style={styles.tankerName}>
                      {vehicle.vehicleCapacity}L Tanker - {vehicle.vehicleNumber}
                    </Typography>
                    <Typography variant="caption" style={styles.tankerPrice}>
                      Amount to be determined at delivery
                    </Typography>
                  </View>
                  <Ionicons
                    name={selectedVehicleId === vehicle.id ? "radio-button-on" : "radio-button-off"}
                    size={24}
                    color={selectedVehicleId === vehicle.id ? UI_CONFIG.colors.primary : UI_CONFIG.colors.textSecondary}
                  />
                </Card>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyStateText}>No vehicles available</Typography>
              <Typography variant="caption" style={styles.emptyStateSubtext}>
                {selectedAgency ? 'This agency has no vehicles yet' : 'Please select an agency first'}
              </Typography>
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
  tankerCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTankerCard: {
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderColor: UI_CONFIG.colors.primary,
    borderWidth: 1,
  },
  tankerInfo: {
    flex: 1,
  },
  tankerName: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  tankerPrice: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
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
});

export default TankerSelectionModal;

