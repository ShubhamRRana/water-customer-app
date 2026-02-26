/**
 * Analytics and Monitoring System
 * 
 * Provides comprehensive analytics and monitoring capabilities for the application.
 * Tracks user actions, performance metrics, errors, and business events.
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ErrorEvent {
  error: Error;
  context?: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface BusinessEvent {
  type: 'booking_created' | 'booking_completed' | 'payment_processed' | 'user_registered' | 'driver_assigned' | 'vehicle_added';
  properties: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

/**
 * Analytics Manager
 * Centralized analytics and monitoring system
 */
class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private errorEvents: ErrorEvent[] = [];
  private businessEvents: BusinessEvent[] = [];
  private sessionId: string;
  private maxEvents: number = 1000; // Maximum events to keep in memory
  private enabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a custom analytics event
   */
  trackEvent(name: string, properties?: Record<string, unknown>, userId?: string): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: new Date(),
      userId,
      sessionId: this.sessionId,
    };

    this.events.push(event);
    this.trimEvents();

    // In production, you would send this to your analytics service
    // Example: sendToAnalyticsService(event);
  }

  /**
   * Track a performance metric
   */
  trackPerformance(name: string, value: number, unit: 'ms' | 'bytes' | 'count', metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      metadata,
    };

    this.performanceMetrics.push(metric);
    this.trimPerformanceMetrics();

    // In production, you would send this to your monitoring service
    // Example: sendToMonitoringService(metric);
  }

  /**
   * Track an error event
   */
  trackError(error: Error, context?: Record<string, unknown>, userId?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    if (!this.enabled) return;

    const errorEvent: ErrorEvent = {
      error,
      context,
      userId,
      timestamp: new Date(),
      severity,
    };

    this.errorEvents.push(errorEvent);
    this.trimErrorEvents();

    // In production, you would send this to your error tracking service
    // Example: sendToErrorTrackingService(errorEvent);
  }

  /**
   * Track a business event
   */
  trackBusinessEvent(
    type: BusinessEvent['type'],
    properties: Record<string, unknown>,
    userId?: string
  ): void {
    if (!this.enabled) return;

    const event: BusinessEvent = {
      type,
      properties,
      timestamp: new Date(),
      userId,
    };

    this.businessEvents.push(event);
    this.trimBusinessEvents();

    // In production, you would send this to your analytics service
    // Example: sendToAnalyticsService(event);
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string, properties?: Record<string, unknown>, userId?: string): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    }, userId);
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, properties?: Record<string, unknown>, userId?: string): void {
    this.trackEvent('user_action', {
      action,
      ...properties,
    }, userId);
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, method: string, duration: number, statusCode: number, error?: Error): void {
    this.trackPerformance(`api_${method.toLowerCase()}_${endpoint}`, duration, 'ms', {
      endpoint,
      method,
      statusCode,
      success: !error,
    });

    if (error) {
      this.trackError(error, {
        endpoint,
        method,
        statusCode,
      }, undefined, statusCode >= 500 ? 'high' : 'medium');
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(query: string, duration: number, error?: Error): void {
    this.trackPerformance('database_query', duration, 'ms', {
      query: query.substring(0, 100), // Truncate long queries
    });

    if (error) {
      this.trackError(error, {
        query: query.substring(0, 100),
      }, undefined, 'high');
    }
  }

  /**
   * Get analytics summary
   */
  getSummary(): {
    totalEvents: number;
    totalPerformanceMetrics: number;
    totalErrors: number;
    totalBusinessEvents: number;
    sessionId: string;
    sessionDuration: number;
  } {
    const sessionStart = this.events[0]?.timestamp || new Date();
    const sessionDuration = Date.now() - sessionStart.getTime();

    return {
      totalEvents: this.events.length,
      totalPerformanceMetrics: this.performanceMetrics.length,
      totalErrors: this.errorEvents.length,
      totalBusinessEvents: this.businessEvents.length,
      sessionId: this.sessionId,
      sessionDuration,
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): AnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get recent performance metrics
   */
  getRecentPerformanceMetrics(limit: number = 50): PerformanceMetric[] {
    return this.performanceMetrics.slice(-limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50): ErrorEvent[] {
    return this.errorEvents.slice(-limit);
  }

  /**
   * Get recent business events
   */
  getRecentBusinessEvents(limit: number = 50): BusinessEvent[] {
    return this.businessEvents.slice(-limit);
  }

  /**
   * Get error rate (errors per minute)
   */
  getErrorRate(): number {
    if (this.errorEvents.length === 0) return 0;

    const firstError = this.errorEvents[0].timestamp;
    const lastError = this.errorEvents[this.errorEvents.length - 1].timestamp;
    const durationMinutes = (lastError.getTime() - firstError.getTime()) / (1000 * 60);

    return durationMinutes > 0 ? this.errorEvents.length / durationMinutes : 0;
  }

  /**
   * Get average performance metric value
   */
  getAveragePerformance(metricName: string): number | null {
    const metrics = this.performanceMetrics.filter(m => m.name === metricName);
    if (metrics.length === 0) return null;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Clear all analytics data
   */
  clear(): void {
    this.events = [];
    this.performanceMetrics = [];
    this.errorEvents = [];
    this.businessEvents = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Trim events array to max size
   */
  private trimEvents(): void {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Trim performance metrics array to max size
   */
  private trimPerformanceMetrics(): void {
    if (this.performanceMetrics.length > this.maxEvents) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxEvents);
    }
  }

  /**
   * Trim error events array to max size
   */
  private trimErrorEvents(): void {
    if (this.errorEvents.length > this.maxEvents) {
      this.errorEvents = this.errorEvents.slice(-this.maxEvents);
    }
  }

  /**
   * Trim business events array to max size
   */
  private trimBusinessEvents(): void {
    if (this.businessEvents.length > this.maxEvents) {
      this.businessEvents = this.businessEvents.slice(-this.maxEvents);
    }
  }

  /**
   * Export analytics data for external analysis
   */
  exportData(): {
    events: AnalyticsEvent[];
    performanceMetrics: PerformanceMetric[];
    errorEvents: ErrorEvent[];
    businessEvents: BusinessEvent[];
    summary: ReturnType<AnalyticsManager['getSummary']>;
  } {
    return {
      events: [...this.events],
      performanceMetrics: [...this.performanceMetrics],
      errorEvents: [...this.errorEvents],
      businessEvents: [...this.businessEvents],
      summary: this.getSummary(),
    };
  }
}

/**
 * Global analytics instance
 */
export const analytics = new AnalyticsManager();

/**
 * Helper functions for common analytics operations
 */
export const trackScreenView = (screenName: string, properties?: Record<string, unknown>, userId?: string) => {
  analytics.trackScreenView(screenName, properties, userId);
};

export const trackUserAction = (action: string, properties?: Record<string, unknown>, userId?: string) => {
  analytics.trackUserAction(action, properties, userId);
};

export const trackError = (error: Error, context?: Record<string, unknown>, userId?: string, severity?: 'low' | 'medium' | 'high' | 'critical') => {
  analytics.trackError(error, context, userId, severity);
};

export const trackPerformance = (name: string, value: number, unit: 'ms' | 'bytes' | 'count', metadata?: Record<string, unknown>) => {
  analytics.trackPerformance(name, value, unit, metadata);
};

export const trackBusinessEvent = (
  type: BusinessEvent['type'],
  properties: Record<string, unknown>,
  userId?: string
) => {
  analytics.trackBusinessEvent(type, properties, userId);
};

