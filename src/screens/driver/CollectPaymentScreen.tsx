import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { useBookingStore } from '../../store/bookingStore';
import { Alert } from 'react-native';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import { Booking } from '../../types';
import { BankAccountService } from '../../services';

type CollectPaymentScreenRouteProp = RouteProp<DriverStackParamList, 'CollectPayment'>;
type CollectPaymentScreenNavigationProp = StackNavigationProp<DriverStackParamList, 'CollectPayment'>;

const CollectPaymentScreen: React.FC = () => {
  const navigation = useNavigation<CollectPaymentScreenNavigationProp>();
  const route = useRoute<CollectPaymentScreenRouteProp>();
  const { updateBookingStatus, getBookingById } = useBookingStore();
  const orderId = route.params.orderId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [loadingQRCode, setLoadingQRCode] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [orderId]);

  const loadBooking = async () => {
    if (!orderId) {
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch booking details
      const bookingData = await getBookingById(orderId);
      if (!bookingData) {
        setError('Booking not found');
        setLoading(false);
        return;
      }

      setBooking(bookingData);

      // Fetch QR code image for the admin
      if (bookingData.agencyId) {
        setLoadingQRCode(true);
        try {
          const defaultAccount = await BankAccountService.getDefaultBankAccount(bookingData.agencyId);
          // Check if default account has a valid (non-empty) QR code URL
          if (defaultAccount?.qrCodeImageUrl && defaultAccount.qrCodeImageUrl.trim() !== '') {
            setQrCodeImageUrl(defaultAccount.qrCodeImageUrl);
          } else {
            // If no default account, try to get the first available account
            const allAccounts = await BankAccountService.getAllBankAccounts(bookingData.agencyId);
            if (allAccounts.length > 0) {
              // Find first account with valid QR code URL (non-empty)
              const accountWithQR = allAccounts.find(acc => acc.qrCodeImageUrl && acc.qrCodeImageUrl.trim() !== '');
              if (accountWithQR?.qrCodeImageUrl) {
                setQrCodeImageUrl(accountWithQR.qrCodeImageUrl);
              }
            }
          }
        } catch (qrError) {
          // Don't show error to user, just silently fail
        } finally {
          setLoadingQRCode(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load booking details';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID not found');
      return;
    }

    try {
      await updateBookingStatus(orderId, 'delivered', {
        deliveredAt: new Date(),
      });
      Alert.alert('Success', 'Delivery completed successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete delivery. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={UI_CONFIG.colors.primary} />
          <Typography variant="body" style={styles.loadingText}>
            Loading booking details...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Typography variant="h2" style={styles.title}>
            Collect Payment
          </Typography>
          <Typography variant="body" style={[styles.subtitle, styles.errorText]}>
            {error || 'Booking not found'}
          </Typography>
          <View style={styles.buttonContainer}>
            <Button
              title="Go Back"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <Typography variant="h2" style={styles.title}>
              Collect Payment
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Complete the payment collection process
            </Typography>

            {booking && (
              <>
                <View style={styles.paymentInfo}>
                  <Typography variant="body" style={styles.amountLabel}>
                    Amount to Pay
                  </Typography>
                  <Typography variant="h2" style={styles.amount}>
                    ₹{booking.totalPrice.toLocaleString('en-IN')}
                  </Typography>
                </View>

                <View style={styles.qrCodeSection}>
                  <Typography variant="h3" style={styles.qrCodeTitle}>
                    Scan QR Code to Pay
                  </Typography>
                  {loadingQRCode ? (
                    <View style={styles.qrCodeLoadingContainer}>
                      <ActivityIndicator size="large" color={UI_CONFIG.colors.primary} />
                      <Typography variant="body" style={styles.qrCodeLoadingText}>
                        Loading QR code...
                      </Typography>
                    </View>
                  ) : qrCodeImageUrl ? (
                    <View style={styles.qrCodeContainer}>
                      <Image
                        source={{ uri: qrCodeImageUrl }}
                        style={styles.qrCodeImage}
                        resizeMode="contain"
                        onError={() => {
                          setQrCodeImageUrl(null);
                        }}
                      />
                    </View>
                  ) : (
                    <View style={styles.qrCodeErrorContainer}>
                      <Typography variant="body" style={styles.qrCodeErrorText}>
                        QR code not available. Please contact the admin.
                      </Typography>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Payment Collected"
              onPress={handleCompleteDelivery}
              style={styles.okButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    marginBottom: 24,
  },
  paymentInfo: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
  },
  amountLabel: {
    fontSize: 15,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 25,
    fontWeight: '700',
    color: UI_CONFIG.colors.primary,
  },
  buttonContainer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  okButton: {
    backgroundColor: UI_CONFIG.colors.success,
  },
  backButton: {
    backgroundColor: UI_CONFIG.colors.primary,
  },
  qrCodeSection: {
    marginTop: 32,
    alignItems: 'center',
    width: '100%',
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
    minHeight: 300,
  },
  qrCodeImage: {
    width: 280,
    height: 280,
    borderRadius: 8,
  },
  qrCodeLoadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeLoadingText: {
    marginTop: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  qrCodeErrorContainer: {
    padding: 24,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
  },
  qrCodeErrorText: {
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
});

export default CollectPaymentScreen;

