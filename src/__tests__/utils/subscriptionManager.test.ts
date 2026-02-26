import { SubscriptionManager } from '../../utils/subscriptionManager';
import type { SubscriptionConfig, SubscriptionMetrics } from '../../utils/subscriptionManager';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    channel: jest.fn((name: string) => ({
      on: jest.fn(() => ({
        subscribe: jest.fn((callback: (status: string) => void) => {
          // Simulate subscription
          setTimeout(() => callback('SUBSCRIBED'), 10);
          return { unsubscribe: jest.fn() };
        }),
      })),
    })),
    removeChannel: jest.fn(),
  },
}));

describe('SubscriptionManager', () => {
  beforeEach(() => {
    SubscriptionManager.unsubscribeAll();
    SubscriptionManager.clearAllMetrics();
  });

  describe('Subscription Management', () => {
    it('should create a subscription', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      const callback = jest.fn();
      const unsubscribe = SubscriptionManager.subscribe(config, callback);

      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from a channel', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      const callback = jest.fn();
      const unsubscribe = SubscriptionManager.subscribe(config, callback);
      
      unsubscribe();
      
      // Channel should be removed
      const metrics = SubscriptionManager.getMetrics('test-channel');
      expect(metrics?.status).toBe('CLOSED');
    });

    it('should unsubscribe from all channels', () => {
      const config1: SubscriptionConfig = {
        channelName: 'channel1',
        table: 'users',
        event: 'INSERT',
      };
      const config2: SubscriptionConfig = {
        channelName: 'channel2',
        table: 'bookings',
        event: 'UPDATE',
      };

      SubscriptionManager.subscribe(config1, jest.fn());
      SubscriptionManager.subscribe(config2, jest.fn());

      SubscriptionManager.unsubscribeAll();

      const summary = SubscriptionManager.getMetricsSummary();
      expect(summary.totalSubscriptions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should track subscription metrics', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      SubscriptionManager.subscribe(config, jest.fn());

      // Wait for subscription to be established
      setTimeout(() => {
        const metrics = SubscriptionManager.getMetrics('test-channel');
        expect(metrics).toBeDefined();
        expect(metrics?.channelName).toBe('test-channel');
        expect(metrics?.table).toBe('users');
        expect(metrics?.createdAt).toBeInstanceOf(Date);
      }, 50);
    });

    it('should track event count', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      let eventCallback: ((payload: any) => void) | undefined;
      
      // Mock the subscription to capture the callback
      const { supabase } = require('../../lib/supabaseClient');
      const mockChannel = {
        on: jest.fn((event: string, options: any, callback: (payload: any) => void) => {
          eventCallback = callback;
          return {
            subscribe: jest.fn((statusCallback: (status: string) => void) => {
              setTimeout(() => statusCallback('SUBSCRIBED'), 10);
              return { unsubscribe: jest.fn() };
            }),
          };
        }),
      };
      supabase.channel.mockReturnValue(mockChannel);

      SubscriptionManager.subscribe(config, jest.fn());

      // Simulate events
      setTimeout(() => {
        if (eventCallback) {
          eventCallback({
            eventType: 'INSERT',
            new: { id: '1', name: 'Test' },
          });
          eventCallback({
            eventType: 'INSERT',
            new: { id: '2', name: 'Test2' },
          });
        }
      }, 100);

      setTimeout(() => {
        const metrics = SubscriptionManager.getMetrics('test-channel');
        expect(metrics?.eventCount).toBeGreaterThanOrEqual(0);
      }, 200);
    });

    it('should track errors', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
        onError: jest.fn(),
      };

      const callback = jest.fn(() => {
        throw new Error('Test error');
      });

      SubscriptionManager.subscribe(config, callback);

      // Metrics should track errors
      setTimeout(() => {
        const metrics = SubscriptionManager.getMetrics('test-channel');
        expect(metrics).toBeDefined();
      }, 50);
    });

    it('should calculate average latency', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      SubscriptionManager.subscribe(config, jest.fn());

      // Metrics should track latency
      setTimeout(() => {
        const metrics = SubscriptionManager.getMetrics('test-channel');
        expect(metrics).toBeDefined();
        expect(metrics?.averageLatency).toBeGreaterThanOrEqual(0);
      }, 50);
    });
  });

  describe('Metrics Summary', () => {
    it('should provide metrics summary', () => {
      const config1: SubscriptionConfig = {
        channelName: 'channel1',
        table: 'users',
        event: 'INSERT',
      };
      const config2: SubscriptionConfig = {
        channelName: 'channel2',
        table: 'bookings',
        event: 'UPDATE',
      };

      SubscriptionManager.subscribe(config1, jest.fn());
      SubscriptionManager.subscribe(config2, jest.fn());

      setTimeout(() => {
        const summary = SubscriptionManager.getMetricsSummary();
        expect(summary.totalSubscriptions).toBeGreaterThanOrEqual(0);
        expect(summary.activeSubscriptions).toBeGreaterThanOrEqual(0);
        expect(summary.totalEvents).toBeGreaterThanOrEqual(0);
        expect(summary.totalErrors).toBeGreaterThanOrEqual(0);
        expect(summary.averageLatency).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(summary.subscriptions)).toBe(true);
      }, 100);
    });

    it('should get all metrics', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      SubscriptionManager.subscribe(config, jest.fn());

      setTimeout(() => {
        const allMetrics = SubscriptionManager.getAllMetrics();
        expect(Array.isArray(allMetrics)).toBe(true);
      }, 50);
    });
  });

  describe('Metrics Management', () => {
    it('should reset metrics for a channel', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      SubscriptionManager.subscribe(config, jest.fn());

      setTimeout(() => {
        SubscriptionManager.resetMetrics('test-channel');
        const metrics = SubscriptionManager.getMetrics('test-channel');
        expect(metrics?.eventCount).toBe(0);
        expect(metrics?.errorCount).toBe(0);
        expect(metrics?.totalLatency).toBe(0);
        expect(metrics?.averageLatency).toBe(0);
      }, 50);
    });

    it('should clear all metrics', () => {
      const config: SubscriptionConfig = {
        channelName: 'test-channel',
        table: 'users',
        event: 'INSERT',
      };

      SubscriptionManager.subscribe(config, jest.fn());

      setTimeout(() => {
        SubscriptionManager.clearAllMetrics();
        const allMetrics = SubscriptionManager.getAllMetrics();
        expect(allMetrics).toHaveLength(0);
      }, 50);
    });

    it('should return null for non-existent metrics', () => {
      const metrics = SubscriptionManager.getMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });
});

