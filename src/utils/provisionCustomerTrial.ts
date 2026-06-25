import type { User } from '../types/index';
import { isCustomerUser } from '../types/index';
import { SubscriptionService } from '../services/subscription.service';
import { errorLogger } from './errorLogger';

/**
 * Fire-and-forget trial provisioning after customer auth. Does not block login UX.
 */
export function maybeProvisionCustomerTrial(user: User | null | undefined): void {
  if (!user || !isCustomerUser(user)) return;

  void SubscriptionService.provisionFreeTrial().catch((error) => {
    errorLogger.low('maybeProvisionCustomerTrial failed', error, { userId: user.id });
  });
}
