/**
 * Subscription Manager Tests
 */

import { SubscriptionManager, createManagedSubscription, subscriptionManager } from '../../lib/subscriptionManager';
import { Unsubscribe } from '../../lib/dataAccess.interface';

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  describe('register', () => {
    it('should register a subscription with auto-generated ID', () => {
      const unsubscribe: Unsubscribe = jest.fn();
      const id = manager.register('test-type', unsubscribe);

      expect(id).toBeTruthy();
      expect(manager.hasSubscription(id)).toBe(true);
      expect(manager.getCount()).toBe(1);
    });

    it('should register a subscription with custom identifier', () => {
      const unsubscribe: Unsubscribe = jest.fn();
      const customId = 'custom-subscription-id';
      const id = manager.register('test-type', unsubscribe, customId);

      expect(id).toBe(customId);
      expect(manager.hasSubscription(customId)).toBe(true);
    });

    it('should generate unique IDs for multiple subscriptions', () => {
      const unsubscribe1: Unsubscribe = jest.fn();
      const unsubscribe2: Unsubscribe = jest.fn();

      const id1 = manager.register('type1', unsubscribe1);
      const id2 = manager.register('type2', unsubscribe2);

      expect(id1).not.toBe(id2);
      expect(manager.getCount()).toBe(2);
    });
  });

  describe('unregister', () => {
    it('should unregister a subscription by ID', () => {
      const unsubscribe: Unsubscribe = jest.fn();
      const id = manager.register('test-type', unsubscribe);

      const result = manager.unregister(id);

      expect(result).toBe(true);
      expect(manager.hasSubscription(id)).toBe(false);
      expect(manager.getCount()).toBe(0);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should return false for non-existent subscription', () => {
      const result = manager.unregister('non-existent-id');

      expect(result).toBe(false);
    });

    it('should call unsubscribe function when unregistering', () => {
      const unsubscribe: Unsubscribe = jest.fn();
      const id = manager.register('test-type', unsubscribe);

      manager.unregister(id);

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('unregisterByType', () => {
    it('should unregister all subscriptions of a specific type', () => {
      const unsubscribe1: Unsubscribe = jest.fn();
      const unsubscribe2: Unsubscribe = jest.fn();
      const unsubscribe3: Unsubscribe = jest.fn();

      manager.register('type1', unsubscribe1);
      manager.register('type2', unsubscribe2);
      manager.register('type1', unsubscribe3);

      const count = manager.unregisterByType('type1');

      expect(count).toBe(2);
      expect(manager.getCount()).toBe(1);
      expect(unsubscribe1).toHaveBeenCalledTimes(1);
      expect(unsubscribe2).not.toHaveBeenCalled();
      expect(unsubscribe3).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no subscriptions of type exist', () => {
      const count = manager.unregisterByType('non-existent-type');

      expect(count).toBe(0);
    });
  });

  describe('unregisterAll', () => {
    it('should unregister all subscriptions', () => {
      const unsubscribe1: Unsubscribe = jest.fn();
      const unsubscribe2: Unsubscribe = jest.fn();
      const unsubscribe3: Unsubscribe = jest.fn();

      manager.register('type1', unsubscribe1);
      manager.register('type2', unsubscribe2);
      manager.register('type3', unsubscribe3);

      const count = manager.unregisterAll();

      expect(count).toBe(3);
      expect(manager.getCount()).toBe(0);
      expect(unsubscribe1).toHaveBeenCalledTimes(1);
      expect(unsubscribe2).toHaveBeenCalledTimes(1);
      expect(unsubscribe3).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no subscriptions exist', () => {
      const count = manager.unregisterAll();

      expect(count).toBe(0);
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return all active subscriptions', () => {
      const unsubscribe1: Unsubscribe = jest.fn();
      const unsubscribe2: Unsubscribe = jest.fn();

      const id1 = manager.register('type1', unsubscribe1);
      const id2 = manager.register('type2', unsubscribe2);

      const subscriptions = manager.getActiveSubscriptions();

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions.some(s => s.id === id1)).toBe(true);
      expect(subscriptions.some(s => s.id === id2)).toBe(true);
      expect(subscriptions.every(s => s.type === 'type1' || s.type === 'type2')).toBe(true);
    });

    it('should return empty array when no subscriptions exist', () => {
      const subscriptions = manager.getActiveSubscriptions();

      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('getSubscriptionsByType', () => {
    it('should return subscriptions of a specific type', () => {
      const unsubscribe1: Unsubscribe = jest.fn();
      const unsubscribe2: Unsubscribe = jest.fn();
      const unsubscribe3: Unsubscribe = jest.fn();

      const id1 = manager.register('type1', unsubscribe1);
      manager.register('type2', unsubscribe2);
      const id3 = manager.register('type1', unsubscribe3);

      const subscriptions = manager.getSubscriptionsByType('type1');

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions.every(s => s.type === 'type1')).toBe(true);
      expect(subscriptions.some(s => s.id === id1)).toBe(true);
      expect(subscriptions.some(s => s.id === id3)).toBe(true);
    });

    it('should return empty array when no subscriptions of type exist', () => {
      const subscriptions = manager.getSubscriptionsByType('non-existent-type');

      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('hasSubscription', () => {
    it('should return true for existing subscription', () => {
      const unsubscribe: Unsubscribe = jest.fn();
      const id = manager.register('test-type', unsubscribe);

      expect(manager.hasSubscription(id)).toBe(true);
    });

    it('should return false for non-existent subscription', () => {
      expect(manager.hasSubscription('non-existent-id')).toBe(false);
    });
  });

  describe('getCount', () => {
    it('should return correct count of subscriptions', () => {
      expect(manager.getCount()).toBe(0);

      manager.register('type1', jest.fn());
      expect(manager.getCount()).toBe(1);

      manager.register('type2', jest.fn());
      expect(manager.getCount()).toBe(2);

      manager.register('type1', jest.fn());
      expect(manager.getCount()).toBe(3);
    });
  });

  describe('subscription metadata', () => {
    it('should store correct metadata for subscriptions', () => {
      const unsubscribe: Unsubscribe = jest.fn();
      const id = manager.register('test-type', unsubscribe);

      const subscriptions = manager.getActiveSubscriptions();
      const subscription = subscriptions.find(s => s.id === id);

      expect(subscription).toBeDefined();
      expect(subscription?.type).toBe('test-type');
      expect(subscription?.unsubscribe).toBe(unsubscribe);
      expect(subscription?.createdAt).toBeInstanceOf(Date);
    });
  });
});

describe('createManagedSubscription', () => {
  beforeEach(() => {
    // Clear all subscriptions before each test
    subscriptionManager.unregisterAll();
  });

  it('should create a managed subscription and register it', () => {
    const unsubscribe: Unsubscribe = jest.fn();
    const managedUnsubscribe = createManagedSubscription('test-type', unsubscribe);

    expect(subscriptionManager.getCount()).toBe(1);
    expect(typeof managedUnsubscribe).toBe('function');
  });

  it('should unregister subscription when managed unsubscribe is called', () => {
    const unsubscribe: Unsubscribe = jest.fn();
    const managedUnsubscribe = createManagedSubscription('test-type', unsubscribe);

    expect(subscriptionManager.getCount()).toBe(1);

    managedUnsubscribe();

    expect(subscriptionManager.getCount()).toBe(0);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple managed subscriptions', () => {
    const unsubscribe1: Unsubscribe = jest.fn();
    const unsubscribe2: Unsubscribe = jest.fn();

    const managed1 = createManagedSubscription('type1', unsubscribe1);
    const managed2 = createManagedSubscription('type2', unsubscribe2);

    expect(subscriptionManager.getCount()).toBe(2);

    managed1();

    expect(subscriptionManager.getCount()).toBe(1);
    expect(unsubscribe1).toHaveBeenCalledTimes(1);
    expect(unsubscribe2).not.toHaveBeenCalled();

    managed2();

    expect(subscriptionManager.getCount()).toBe(0);
    expect(unsubscribe2).toHaveBeenCalledTimes(1);
  });
});

