import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../../components/common';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  ERROR_MESSAGES,
  UI_CONFIG,
} from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { AppStackParamList } from '../../navigation/rootNavigation';

type Nav = StackNavigationProp<AppStackParamList, 'PaymentResult'>;
type Route = RouteProp<AppStackParamList, 'PaymentResult'>;

interface Props {
  navigation: Nav;
}

const PaymentResultScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<Route>();
  const params = route.params;
  const colors = useThemeColors();
  const styles = useMemo(() => createPaymentResultStyles(colors), [colors]);

  const isSuccess = params.status === 'success';

  const title = isSuccess
    ? params.type === 'booking'
      ? 'Delivery payment successful'
      : 'Subscription payment successful'
    : params.type === 'booking'
      ? 'Delivery payment failed'
      : 'Subscription payment failed';

  const message = isSuccess
    ? params.type === 'booking'
      ? 'Your delivery payment was confirmed. You can track your order for updates.'
      : 'Your subscription payment was confirmed. Enjoy full app access.'
    : params.errorMessage ?? ERROR_MESSAGES.payment.failed;

  const handlePrimary = () => {
    if (isSuccess) {
      if (params.type === 'booking') {
        navigation.replace('OrderTracking', { orderId: params.bookingId });
        return;
      }
      navigation.replace('SubscriptionStatus');
      return;
    }

    if (params.type === 'booking') {
      navigation.replace('PayBooking', { bookingId: params.bookingId });
      return;
    }

    navigation.replace('PaySubscription', {
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      planName: params.planName,
    });
  };

  const handleSecondary = () => {
    if (params.type === 'booking') {
      navigation.navigate('Orders');
      return;
    }
    navigation.navigate('SubscriptionPlans');
  };

  const primaryLabel = isSuccess
    ? params.type === 'booking'
      ? 'Track order'
      : 'View subscription'
    : 'Try again';

  const secondaryLabel = params.type === 'booking' ? 'View orders' : 'Back to plans';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Card padding="large" style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={isSuccess ? 'checkmark-circle' : 'close-circle'}
              size={72}
              color={isSuccess ? colors.success : colors.error}
            />
          </View>
          <Typography variant="h2" style={styles.title}>
            {title}
          </Typography>
          <Typography variant="body" style={styles.message}>
            {message}
          </Typography>
          {isSuccess && params.paymentId ? (
            <Typography variant="caption" style={styles.reference}>
              Payment ID: {params.paymentId}
            </Typography>
          ) : null}
        </Card>

        <Button title={primaryLabel} onPress={handlePrimary} style={styles.btn} />
        <Button title={secondaryLabel} variant="secondary" onPress={handleSecondary} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
};

function createPaymentResultStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.primary },
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: UI_CONFIG.spacing.lg,
    },
    card: { alignItems: 'center', marginBottom: UI_CONFIG.spacing.lg },
    iconWrap: { marginBottom: UI_CONFIG.spacing.md },
    title: { textAlign: 'center', marginBottom: UI_CONFIG.spacing.sm },
    message: {
      textAlign: 'center',
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: UI_CONFIG.spacing.sm,
    },
    reference: {
      textAlign: 'center',
      color: colors.textSecondary,
    },
    btn: { marginBottom: UI_CONFIG.spacing.sm },
  });
}

export default PaymentResultScreen;
