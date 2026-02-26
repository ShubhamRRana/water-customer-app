import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, Button } from '../common';
import { User, DriverUser } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';
import { formatDateOnly } from '../../utils/dateUtils';

export interface DriverModalProps {
  visible: boolean;
  onClose: () => void;
  driver: User | null;
}

const DriverModal: React.FC<DriverModalProps> = ({
  visible,
  onClose,
  driver,
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
          Driver Details
        </Typography>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
      </View>

      {driver && (
        <ScrollView style={styles.modalContent}>
            <>
              <Card style={styles.detailCard}>
                <Typography variant="h3" style={styles.detailSectionTitle}>
                  Personal Information
                </Typography>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Name</Typography>
                  <Typography variant="body" style={styles.detailValue}>{driver.name}</Typography>
                </View>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Email</Typography>
                  <Typography variant="body" style={styles.detailValue}>{driver.email}</Typography>
                </View>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Password</Typography>
                  <Typography variant="body" style={styles.detailValue}>{driver.password || 'Not available'}</Typography>
                </View>
                {driver.phone && (
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Phone</Typography>
                    <Typography variant="body" style={styles.detailValue}>{driver.phone}</Typography>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Emergency Contact</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {(driver as DriverUser).emergencyContactName || 'Not provided'}
                  </Typography>
                </View>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Emergency Number</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {(driver as DriverUser).emergencyContactPhone || 'Not provided'}
                  </Typography>
                </View>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Joined</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {formatDateOnly(driver.createdAt)}
                  </Typography>
                </View>
              </Card>

              <Card style={styles.detailCard}>
                <Typography variant="h3" style={styles.detailSectionTitle}>
                  License Information
                </Typography>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>License Number</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {(driver as DriverUser).licenseNumber || 'Not provided'}
                  </Typography>
                </View>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Expiry Date</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {(driver as DriverUser).licenseExpiry ? formatDateOnly((driver as DriverUser).licenseExpiry!) : 'Not provided'}
                  </Typography>
                </View>
              </Card>

              <Card style={styles.detailCard}>
                <Typography variant="h3" style={styles.detailSectionTitle}>
                  Performance
                </Typography>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Total Earnings</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {PricingUtils.formatPrice((driver as DriverUser).totalEarnings || 0)}
                  </Typography>
                </View>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Completed Orders</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {(driver as DriverUser).completedOrders || 0}
                  </Typography>
                </View>
              </Card>

            </>
        </ScrollView>
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
  closeButton: {
    padding: UI_CONFIG.spacing.sm,
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
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.background,
  },
  detailLabel: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: UI_CONFIG.spacing.md,
  },
});

export default DriverModal;

