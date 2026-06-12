import { Alert } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ERROR_MESSAGES, FEATURE_FLAGS } from '../constants/config';
import { SubscriptionService } from '../services/subscription.service';
import type { AppStackParamList } from '../navigation/rootNavigation';
import { getErrorCode } from './errors';

type SubscriptionNavigation = StackNavigationProp<AppStackParamList>;

export function isSubscriptionGatingEnabled(): boolean {
  return FEATURE_FLAGS.enableSubscriptionGating;
}

export function isSubscriptionError(error: unknown): boolean {
  if (getErrorCode(error) === 'SUBSCRIPTION_REQUIRED') {
    return true;
  }
  if (error instanceof Error && 'code' in error) {
    return (error as Error & { code?: string }).code === 'SUBSCRIPTION_REQUIRED';
  }
  return false;
}

export async function ensureActiveSubscription(userId: string): Promise<boolean> {
  if (!isSubscriptionGatingEnabled()) {
    return true;
  }
  const allowed = await SubscriptionService.hasActiveSubscription(userId);
  if (!allowed) {
    const err = new Error(ERROR_MESSAGES.booking.subscriptionRequired);
    (err as Error & { code: string }).code = 'SUBSCRIPTION_REQUIRED';
    throw err;
  }
  return true;
}

export function showSubscriptionRequiredAlert(navigation: SubscriptionNavigation): void {
  Alert.alert('Subscription required', ERROR_MESSAGES.booking.subscriptionRequired, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'View plans',
      onPress: () => navigation.navigate('SubscriptionPlans'),
    },
  ]);
}
