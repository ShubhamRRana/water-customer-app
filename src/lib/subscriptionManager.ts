/**
 * Subscription Manager
 * 
 * Manages real-time subscriptions for data updates.
 * Currently provides infrastructure for LocalStorage (no-op),
 * but ready for Supabase Realtime integration.
 */

import { Unsubscribe } from './dataAccess.interface';

/**
 * Subscription metadata
 */
interface SubscriptionMetadata {
  id: string;
  unsubscribe: Unsubscribe;
  createdAt: Date;
  type: string;
}

/**
 * Subscription Manager class
 * Tracks and manages all active subscriptions
 */
export class SubscriptionManager {
  private subscriptions: Map<string, SubscriptionMetadata> = new Map();
  private subscriptionCounter = 0;

  /**
   * Register a new subscription
   */
  register(
    type: string,
    unsubscribe: Unsubscribe,
    identifier?: string
  ): string {
    const id = identifier || `${type}_${++this.subscriptionCounter}_${Date.now()}`;
    this.subscriptions.set(id, {
      id,
      unsubscribe,
      createdAt: new Date(),
      type,
    });
    return id;
  }

  /**
   * Unregister a subscription by ID
   */
  unregister(id: string): boolean {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Unregister all subscriptions of a specific type
   */
  unregisterByType(type: string): number {
    let count = 0;
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.type === type) {
        subscription.unsubscribe();
        this.subscriptions.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Unregister all subscriptions
   */
  unregisterAll(): number {
    const count = this.subscriptions.size;
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    return count;
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): SubscriptionMetadata[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscriptions by type
   */
  getSubscriptionsByType(type: string): SubscriptionMetadata[] {
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.type === type
    );
  }

  /**
   * Check if a subscription exists
   */
  hasSubscription(id: string): boolean {
    return this.subscriptions.has(id);
  }

  /**
   * Get subscription count
   */
  getCount(): number {
    return this.subscriptions.size;
  }
}

/**
 * Global subscription manager instance
 */
export const subscriptionManager = new SubscriptionManager();

/**
 * Helper function to create a managed subscription
 * Wraps the unsubscribe function with subscription tracking
 */
export function createManagedSubscription(
  type: string,
  unsubscribe: Unsubscribe,
  identifier?: string
): Unsubscribe {
  const id = subscriptionManager.register(type, unsubscribe, identifier);
  
  // Return a managed unsubscribe function
  return () => {
    subscriptionManager.unregister(id);
  };
}

