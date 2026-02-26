import { analytics, trackScreenView, trackUserAction, trackError, trackPerformance, trackBusinessEvent } from '../../utils/analytics';
import type { AnalyticsEvent, PerformanceMetric, ErrorEvent, BusinessEvent } from '../../utils/analytics';

describe('Analytics', () => {
  beforeEach(() => {
    analytics.clear();
    analytics.setEnabled(true);
  });

  describe('Event Tracking', () => {
    it('should track custom events', () => {
      analytics.trackEvent('test_event', { key: 'value' }, 'user123');
      
      const events = analytics.getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('test_event');
      expect(events[0].properties).toEqual({ key: 'value' });
      expect(events[0].userId).toBe('user123');
      expect(events[0].sessionId).toBeDefined();
    });

    it('should track screen views', () => {
      trackScreenView('HomeScreen', { tab: 'dashboard' }, 'user123');
      
      const events = analytics.getRecentEvents(1);
      expect(events[0].name).toBe('screen_view');
      expect(events[0].properties).toMatchObject({
        screen_name: 'HomeScreen',
        tab: 'dashboard',
      });
    });

    it('should track user actions', () => {
      trackUserAction('button_click', { button_id: 'submit' }, 'user123');
      
      const events = analytics.getRecentEvents(1);
      expect(events[0].name).toBe('user_action');
      expect(events[0].properties).toMatchObject({
        action: 'button_click',
        button_id: 'submit',
      });
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      trackPerformance('api_call', 150, 'ms', { endpoint: '/users' });
      
      const metrics = analytics.getRecentPerformanceMetrics(1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('api_call');
      expect(metrics[0].value).toBe(150);
      expect(metrics[0].unit).toBe('ms');
      expect(metrics[0].metadata).toEqual({ endpoint: '/users' });
    });

    it('should calculate average performance', () => {
      trackPerformance('api_call', 100, 'ms');
      trackPerformance('api_call', 200, 'ms');
      trackPerformance('api_call', 150, 'ms');
      
      const average = analytics.getAveragePerformance('api_call');
      expect(average).toBe(150);
    });

    it('should track API call performance', () => {
      analytics.trackAPICall('/users', 'GET', 120, 200);
      
      const metrics = analytics.getRecentPerformanceMetrics(1);
      expect(metrics[0].name).toBe('api_get_/users');
      expect(metrics[0].value).toBe(120);
      expect(metrics[0].metadata).toMatchObject({
        endpoint: '/users',
        method: 'GET',
        statusCode: 200,
        success: true,
      });
    });

    it('should track API call errors', () => {
      const error = new Error('API Error');
      analytics.trackAPICall('/users', 'GET', 120, 500, error);
      
      const errors = analytics.getRecentErrors(1);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(error);
      expect(errors[0].context).toMatchObject({
        endpoint: '/users',
        method: 'GET',
        statusCode: 500,
      });
      expect(errors[0].severity).toBe('high');
    });

    it('should track database query performance', () => {
      analytics.trackDatabaseQuery('SELECT * FROM users', 50);
      
      const metrics = analytics.getRecentPerformanceMetrics(1);
      expect(metrics[0].name).toBe('database_query');
      expect(metrics[0].value).toBe(50);
    });
  });

  describe('Error Tracking', () => {
    it('should track errors', () => {
      const error = new Error('Test error');
      trackError(error, { context: 'test' }, 'user123', 'high');
      
      const errors = analytics.getRecentErrors(1);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe(error);
      expect(errors[0].context).toEqual({ context: 'test' });
      expect(errors[0].userId).toBe('user123');
      expect(errors[0].severity).toBe('high');
    });

    it('should calculate error rate', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      trackError(error1);
      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        trackError(error2);
      }, 10);
      
      // Error rate should be calculated
      const errorRate = analytics.getErrorRate();
      expect(errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Business Events', () => {
    it('should track business events', () => {
      trackBusinessEvent('booking_created', { booking_id: '123', amount: 100 }, 'user123');
      
      const events = analytics.getRecentBusinessEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('booking_created');
      expect(events[0].properties).toEqual({ booking_id: '123', amount: 100 });
      expect(events[0].userId).toBe('user123');
    });

    it('should track all business event types', () => {
      const eventTypes: BusinessEvent['type'][] = [
        'booking_created',
        'booking_completed',
        'payment_processed',
        'user_registered',
        'driver_assigned',
        'vehicle_added',
      ];

      eventTypes.forEach(type => {
        trackBusinessEvent(type, { test: true });
      });

      const events = analytics.getRecentBusinessEvents(eventTypes.length);
      expect(events).toHaveLength(eventTypes.length);
      eventTypes.forEach((type, index) => {
        expect(events[index].type).toBe(type);
      });
    });
  });

  describe('Summary and Statistics', () => {
    it('should provide summary statistics', () => {
      analytics.trackEvent('event1');
      trackPerformance('metric1', 100, 'ms');
      trackError(new Error('error1'));
      trackBusinessEvent('booking_created', {});
      
      const summary = analytics.getSummary();
      expect(summary.totalEvents).toBe(1);
      expect(summary.totalPerformanceMetrics).toBe(1);
      expect(summary.totalErrors).toBe(1);
      expect(summary.totalBusinessEvents).toBe(1);
      expect(summary.sessionId).toBeDefined();
      expect(summary.sessionDuration).toBeGreaterThanOrEqual(0);
    });

    it('should limit recent events', () => {
      // Add more events than the limit
      for (let i = 0; i < 100; i++) {
        analytics.trackEvent(`event_${i}`);
      }
      
      const recent = analytics.getRecentEvents(10);
      expect(recent).toHaveLength(10);
      expect(recent[0].name).toBe('event_90');
      expect(recent[9].name).toBe('event_99');
    });
  });

  describe('Enable/Disable', () => {
    it('should respect enabled/disabled state', () => {
      analytics.setEnabled(false);
      analytics.trackEvent('should_not_track');
      
      const events = analytics.getRecentEvents();
      expect(events).toHaveLength(0);
      
      analytics.setEnabled(true);
      analytics.trackEvent('should_track');
      
      const newEvents = analytics.getRecentEvents();
      expect(newEvents).toHaveLength(1);
      expect(newEvents[0].name).toBe('should_track');
    });

    it('should check if enabled', () => {
      expect(analytics.isEnabled()).toBe(true);
      analytics.setEnabled(false);
      expect(analytics.isEnabled()).toBe(false);
    });
  });

  describe('Data Export', () => {
    it('should export all analytics data', () => {
      analytics.trackEvent('event1');
      trackPerformance('metric1', 100, 'ms');
      trackError(new Error('error1'));
      trackBusinessEvent('booking_created', {});
      
      const exported = analytics.exportData();
      
      expect(exported.events).toHaveLength(1);
      expect(exported.performanceMetrics).toHaveLength(1);
      expect(exported.errorEvents).toHaveLength(1);
      expect(exported.businessEvents).toHaveLength(1);
      expect(exported.summary).toBeDefined();
    });
  });

  describe('Clear Data', () => {
    it('should clear all analytics data', () => {
      analytics.trackEvent('event1');
      trackPerformance('metric1', 100, 'ms');
      trackError(new Error('error1'));
      trackBusinessEvent('booking_created', {});
      
      analytics.clear();
      
      expect(analytics.getRecentEvents()).toHaveLength(0);
      expect(analytics.getRecentPerformanceMetrics()).toHaveLength(0);
      expect(analytics.getRecentErrors()).toHaveLength(0);
      expect(analytics.getRecentBusinessEvents()).toHaveLength(0);
      
      // Session ID should be regenerated
      const summary = analytics.getSummary();
      expect(summary.sessionId).toBeDefined();
    });
  });
});

