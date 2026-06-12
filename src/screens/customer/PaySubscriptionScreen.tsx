import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Typography, ScreenLoading } from '../../components/common';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { PaymentService } from '../../services/payment.service';
import { SubscriptionService } from '../../services/subscription.service';
import { openCheckout } from '../../services/razorpayCheckout.service';
import type { RazorpaySubscriptionOrder } from '../../types/razorpay.types';
import {
  APP_CONFIG,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  PRICING_CONFIG,
  UI_CONFIG,
} from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import type { AppStackParamList } from '../../navigation/rootNavigation';

type Nav = StackNavigationProp<AppStackParamList, 'PaySubscription'>;
type Route = RouteProp<AppStackParamList, 'PaySubscription'>;

interface Props {
  navigation: Nav;
}

type PayPhase = 'loading' | 'ready' | 'checkout' | 'verifying' | 'error';

const PaySubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<Route>();
  const { subscriptionId, planId, planName } = route.params;
  const colors = useThemeColors();
  const styles = useMemo(() => createPaySubscriptionStyles(colors), [colors]);
  const { user, refreshUserProfile } = useAuthStore();

  const [phase, setPhase] = useState<PayPhase>('loading');
  const [order, setOrder] = useState<RazorpaySubscriptionOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayAmount = useMemo(() => {
    if (!order) return null;
    return order.amount / 100;
  }, [order]);

  const loadOrder = useCallback(async () => {
    setPhase('loading');
    setErrorMessage(null);
    try {
      const created = await PaymentService.createSubscriptionPayment(subscriptionId, planId);
      setOrder(created);
      setPhase('ready');
    } catch (e) {
      const message = e instanceof Error ? e.message : ERROR_MESSAGES.payment.failed;
      errorLogger.medium('create subscription payment order failed', e, {
        subscriptionId,
        planId,
      });
      setErrorMessage(message);
      setPhase('error');
    }
  }, [subscriptionId, planId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const runCheckout = useCallback(async () => {
    if (!order || !user) return;

    setPhase('checkout');
    const checkoutResult = await openCheckout({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      description: `${planName} subscription`,
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
      await SubscriptionService.activateSubscription(subscriptionId, checkoutResult.data);
      await refreshUserProfile();
      navigation.replace('SubscriptionStatus');
    } catch (e) {
      const message = e instanceof Error ? e.message : ERROR_MESSAGES.payment.failed;
      errorLogger.medium('verify subscription payment failed', e, { subscriptionId });
      setErrorMessage(message);
      setPhase('error');
    }
  }, [order, user, planName, subscriptionId, navigation, refreshUserProfile]);

  const handleRetry = () => {
    void loadOrder();
  };

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
          Subscribe
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
          <Card padding="large" style={styles.card}>
            <Typography variant="h3">{planName}</Typography>
            {displayAmount != null ? (
              <Typography variant="h2" style={styles.price}>
                {`${PRICING_CONFIG.currencySymbol}${displayAmount.toFixed(0)}`}
              </Typography>
            ) : null}
            <Typography variant="body" style={styles.legal}>
              Payment is collected by {APP_CONFIG.name} for app access and subscription
              benefits. Funds are settled to the platform merchant account (not to delivery
              agencies).
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
            title="Back to plans"
            variant="secondary"
            onPress={() => navigation.navigate('SubscriptionPlans')}
            style={styles.btn}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function createPaySubscriptionStyles(colors: ThemeColors) {
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
    scroll: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },
    card: { marginBottom: UI_CONFIG.spacing.md },
    price: { marginTop: UI_CONFIG.spacing.sm, marginBottom: UI_CONFIG.spacing.sm },
    legal: { color: colors.textSecondary, lineHeight: 22 },
    errorText: { color: colors.error, marginBottom: UI_CONFIG.spacing.md, textAlign: 'center' },
    btn: { marginBottom: UI_CONFIG.spacing.sm },
  });
}

export default PaySubscriptionScreen;
