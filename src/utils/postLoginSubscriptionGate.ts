import { SubscriptionService } from '../services/subscription.service';
import { errorLogger } from './errorLogger';
import { isSubscriptionGatingEnabled } from './subscriptionGating';

export type SubscriptionAccessResult = 'allowed' | 'required';

/**
 * Resolves whether the customer may enter the app or must see subscription plans.
 * Awaits trial provisioning first so new users are not incorrectly gated.
 */
export async function resolveSubscriptionAccess(userId: string): Promise<SubscriptionAccessResult> {
  if (!isSubscriptionGatingEnabled()) {
    return 'allowed';
  }

  try {
    await SubscriptionService.provisionFreeTrial();
    const active = await SubscriptionService.hasActiveSubscription(userId);
    return active ? 'allowed' : 'required';
  } catch (error) {
    errorLogger.low('resolveSubscriptionAccess failed; allowing entry', error, { userId });
    return 'allowed';
  }
}
