import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { BookingStatus } from '../../types';
import { UI_CONFIG } from '../../constants/config';

export interface StatusUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string | null;
  onStatusUpdate: (bookingId: string, newStatus: BookingStatus) => void;
  getStatusColor: (status: BookingStatus) => string;
  getStatusIcon: (status: BookingStatus) => string;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  visible,
  onClose,
  bookingId,
  onStatusUpdate,
  getStatusColor,
  getStatusIcon,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
  >
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Typography variant="h2" style={styles.modalTitle}>
          Update Status
        </Typography>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={UI_CONFIG.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusOptions}>
        {(['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'] as BookingStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={styles.statusOption}
            onPress={() => bookingId && onStatusUpdate(bookingId, status)}
          >
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(status) }]}>
              <Ionicons name={getStatusIcon(status) as any} size={20} color={UI_CONFIG.colors.textLight} />
            </View>
            <Typography variant="body" style={styles.statusOptionText}>
              {status.replace('_', ' ').toUpperCase()}
            </Typography>
          </TouchableOpacity>
        ))}
      </View>
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
    paddingVertical: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  closeButton: {
    padding: UI_CONFIG.spacing.sm,
  },
  statusOptions: {
    padding: UI_CONFIG.spacing.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.md,
    paddingHorizontal: UI_CONFIG.spacing.md,
    borderRadius: 12,
    backgroundColor: UI_CONFIG.colors.background,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.spacing.md,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
});

export default StatusUpdateModal;
