import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, Button, Input } from '../common';
import { UI_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';

interface AmountInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  isSubmitting?: boolean;
  orderId?: string;
  customerName?: string;
  vehicleCapacity?: number;
}

const AmountInputModal: React.FC<AmountInputModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
  orderId,
  customerName,
  vehicleCapacity,
}) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string>('');

  const handleAmountChange = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeNumber(text);
    setAmount(sanitized);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = () => {
    // Validate amount
    const amountValidation = ValidationUtils.validateAmount(amount, true);
    if (!amountValidation.isValid) {
      setError(amountValidation.error || 'Valid amount is required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    onSubmit(amountNum);
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Typography variant="h2" style={styles.title}>
              Set Delivery Amount
            </Typography>
            <Ionicons
              name="close"
              size={24}
              color={UI_CONFIG.colors.text}
              onPress={handleClose}
              style={styles.closeIcon}
            />
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <Card style={styles.infoCard}>
              <Typography variant="h3" style={styles.sectionTitle}>
                Order Information
              </Typography>
              {orderId && (
                <View style={styles.infoRow}>
                  <Typography variant="body" style={styles.infoLabel}>Order ID:</Typography>
                  <Typography variant="body" style={styles.infoValue}>{orderId}</Typography>
                </View>
              )}
              {customerName && (
                <View style={styles.infoRow}>
                  <Typography variant="body" style={styles.infoLabel}>Customer:</Typography>
                  <Typography variant="body" style={styles.infoValue}>{customerName}</Typography>
                </View>
              )}
              {vehicleCapacity && (
                <View style={styles.infoRow}>
                  <Typography variant="body" style={styles.infoLabel}>Tanker Capacity:</Typography>
                  <Typography variant="body" style={styles.infoValue}>{vehicleCapacity}L</Typography>
                </View>
              )}
            </Card>

            <Card style={styles.inputCard}>
              <Typography variant="h3" style={styles.sectionTitle}>
                Enter Amount
              </Typography>
              <Typography variant="body" style={styles.description}>
                Please enter the delivery amount in rupees. This amount will be reflected in the booking and reports.
              </Typography>
              <View style={styles.inputContainer}>
                <Input
                  label="Amount (₹) *"
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="Enter amount"
                  error={error}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={isSubmitting ? "Accepting Order..." : "Accept Order"}
              onPress={handleSubmit}
              disabled={isSubmitting || !amount.trim()}
              style={styles.submitButton}
            />
            <Button
              title="Cancel"
              onPress={handleClose}
              style={styles.cancelButton}
              variant="outline"
              disabled={isSubmitting}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    flex: 1,
  },
  closeIcon: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    marginBottom: 16,
  },
  inputCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.background,
  },
  infoLabel: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    marginTop: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: UI_CONFIG.colors.surface,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  submitButton: {
    backgroundColor: UI_CONFIG.colors.success,
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.textSecondary,
  },
});

export default AmountInputModal;

