import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Typography, ScreenLoading } from '../../components/common';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DeliverySummary from '../../components/customer/DeliverySummary';
import { useAuthStore } from '../../store/authStore';
import { BookingService } from '../../services/booking.service';
import { PaymentService } from '../../services/payment.service';
import { openCheckout } from '../../services/razorpayCheckout.service';
import type { Booking } from '../../types';
import type { RazorpayBookingOrder } from '../../types/razorpay.types';
import {
  APP_CONFIG,
  ERROR_MESSAGES,
  FEATURE_FLAGS,
  LOADING_MESSAGES,
  PRICING_CONFIG,
  UI_CONFIG,
} from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import { formatDate } from '../../utils/dateUtils';
import type { AppStackParamList } from '../../navigation/rootNavigation';

type Nav = StackNavigationProp<AppStackParamList, 'PayBooking'>;
type Route = RouteProp<AppStackParamList, 'PayBooking'>;

interface Props {
  navigation: Nav;
}

type PayPhase = 'loading' | 'ready' | 'checkout' | 'verifying' | 'error';

const PayBookingScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<Route>();
  const { bookingId } = route.params;
  const colors = useThemeColors();
  const styles = useMemo(() => createPayBookingStyles(colors), [colors]);
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<PayPhase>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [order, setOrder] = useState<RazorpayBookingOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayAmount = useMemo(() => {
    if (!order) return null;
    return order.amount / 100;
  }, [order]);

  const summarySchedule = useMemo(() => {
    if (!booking?.scheduledFor) return { date: undefined, time: undefined, timePeriod: undefined };
    const scheduled = booking.scheduledFor instanceof Date ? booking.scheduledFor : new Date(booking.scheduledFor);
    if (Number.isNaN(scheduled.getTime())) {
      return { date: undefined, time: undefined, timePeriod: undefined };
    }
    return {
      date: formatDate(scheduled, 'dateOnly'),
      time: formatDate(scheduled, 'timeOnly'),
      timePeriod: undefined as 'AM' | 'PM' | undefined,
    };
  }, [booking?.scheduledFor]);

  const loadOrder = useCallback(async () => {
    setPhase('loading');
    setErrorMessage(null);
    try {
      const loadedBooking = await BookingService.getBookingById(bookingId);
      if (!loadedBooking) {
        throw new Error('Booking not found');
      }
      setBooking(loadedBooking);

      const created = await PaymentService.createBookingPayment(bookingId);
      setOrder(created);
      setPhase('ready');
    } catch (e) {
      const message = e instanceof Error ? e.message : ERROR_MESSAGES.payment.failed;
      errorLogger.medium('create booking payment order failed', e, { bookingId });
      setErrorMessage(message);
      setPhase('error');
    }
  }, [bookingId]);

  useEffect(() => {
    if (!FEATURE_FLAGS.enableOnlinePayment) {
      Alert.alert(
        'Online payment unavailable',
        'Online booking payments are not enabled yet.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    void loadOrder();
  }, [loadOrder, navigation]);

  const runCheckout = useCallback(async () => {
    if (!order || !user || !booking) return;

    setPhase('checkout');
    const checkoutResult = await openCheckout({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      description: 'Delivery payment',
      name: APP_CONFIG.name,
      prefill: {
        email: user.email,
        name: user.name,
        ...(user.phone ? { contact: user.phone } : {}),
      },
    });

    if (checkoutResult.status === 'cancelled') {
      setPhase('ready');
      Alert.alert('Payment cancelled', ERROR_MESSAGES.payment.razorpayCancelled);
      return;
    }

    if (checkoutResult.status === 'error') {
      setErrorMessage(checkoutResult.message);
      setPhase('error');
      return;
    }

    setPhase('verifying');
    try {
      await BookingService.completeBookingPayment(bookingId, checkoutResult.data);
      navigation.replace('PaymentResult', {
        type: 'booking',
        status: 'success',
        bookingId,
        paymentId: checkoutResult.data.razorpay_payment_id,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : ERROR_MESSAGES.payment.failed;
      errorLogger.medium('verify booking payment failed', e, { bookingId });
      navigation.replace('PaymentResult', {
        type: 'booking',
        status: 'failure',
        bookingId,
        errorMessage: message,
      });
    }
  }, [order, user, booking, bookingId, navigation]);

  const handleRetry = () => {
    void loadOrder();
  };

  const agencyName = booking?.agencyName ?? 'Delivery agency';

  if (!FEATURE_FLAGS.enableOnlinePayment) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.headerTitle}>
          Pay for delivery
        </Typography>
        <View style={styles.iconBtn} />
      </View>

      {phase === 'loading' || phase === 'checkout' || phase === 'verifying' ? (
        <ScreenLoading
          message={
            phase === 'verifying'
              ? LOADING_MESSAGES.payment.confirming
              : phase === 'checkout'
                ? LOADING_MESSAGES.payment.processing
                : LOADING_MESSAGES.payment.processing
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {booking && displayAmount != null ? (
            <DeliverySummary
              {...(booking.agencyName ? { agencyName: booking.agencyName } : {})}
              quantity={booking.quantity ?? 1}
              vehicleCapacity={booking.tankerSize}
              amount={displayAmount}
              {...(summarySchedule.date ? { date: summarySchedule.date } : {})}
              {...(summarySchedule.time ? { time: summarySchedule.time } : {})}
              {...(summarySchedule.timePeriod ? { timePeriod: summarySchedule.timePeriod } : {})}
              {...(booking.deliveryAddress?.address
                ? { address: booking.deliveryAddress.address }
                : {})}
            />
          ) : null}

          <Card padding="large" style={styles.card}>
            {displayAmount != null ? (
              <Typography variant="h2" style={styles.price}>
                {`${PRICING_CONFIG.currencySymbol}${displayAmount.toFixed(0)}`}
              </Typography>
            ) : null}
            <Typography variant="body" style={styles.legal}>
              Payment is collected for your water delivery and is transferred to{' '}
              {agencyName} via Razorpay Route. Funds go to the delivery agency, not to{' '}
              {APP_CONFIG.name} subscription billing.
            </Typography>
          </Card>

          {phase === 'error' && errorMessage ? (
            <Typography variant="body" style={styles.errorText}>
              {errorMessage}
            </Typography>
          ) : null}

          {phase === 'ready' ? (
            <Button title="Pay with Razorpay" onPress={() => void runCheckout()} style={styles.btn} />
          ) : null}

          {phase === 'error' ? (
            <Button title="Try again" onPress={handleRetry} style={styles.btn} />
          ) : null}

          <Button
            title="Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.btn}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function createPayBookingStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: UI_CONFIG.spacing.md,
      paddingVertical: UI_CONFIG.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconBtn: { padding: UI_CONFIG.spacing.xs, minWidth: 40 },
    headerTitle: { flex: 1, textAlign: 'center' },
    scroll: { paddingBottom: UI_CONFIG.spacing.xl },
    card: { marginHorizontal: UI_CONFIG.spacing.md, marginBottom: UI_CONFIG.spacing.md },
    price: { marginBottom: UI_CONFIG.spacing.sm },
    legal: { color: colors.textSecondary, lineHeight: 22 },
    errorText: {
      color: colors.error,
      marginHorizontal: UI_CONFIG.spacing.md,
      marginBottom: UI_CONFIG.spacing.md,
      textAlign: 'center',
    },
    btn: { marginHorizontal: UI_CONFIG.spacing.md, marginBottom: UI_CONFIG.spacing.sm },
  });
}

export default PayBookingScreen;
