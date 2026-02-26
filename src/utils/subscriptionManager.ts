/**
 * Subscription Manager
 * 
 * Manages real-time subscriptions for database changes using Supabase Realtime.
 * Includes performance monitoring and metrics collection.
 */

import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SubscriptionConfig {
  channelName: string;
  table: string;
  filter?: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onError?: (error: Error) => void;
}

export interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
}

/**
 * Performance metrics for a subscription
 */
export interface SubscriptionMetrics {
  channelName: string;
  table: string;
  eventCount: number;
  errorCount: number;
  lastEventTime: Date | null;
  firstEventTime: Date | null;
  averageLatency: number; // milliseconds
  totalLatency: number;
  status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';
  createdAt: Date;
  lastError: Error | null;
}

/**
 * Subscription Manager for real-time database subscriptions
 * Uses Supabase Realtime channels for database change notifications
 * Includes performance monitoring and metrics collection
 */
export class SubscriptionManager {
  private static channels: Map<string, RealtimeChannel> = new Map();
  private static metrics: Map<string, SubscriptionMetrics> = new Map();

  /**
   * Subscribe to real-time database changes
   * 
   * @param config - Subscription configuration
   * @param callback - Callback function to handle payload updates
   * @returns Unsubscribe function
   */
  static subscribe<T = any>(
    config: SubscriptionConfig,
    callback: (payload: RealtimePayload<T>) => void | Promise<void>
  ): () => void {
    // Get or create channel for this subscription
    let channel = this.channels.get(config.channelName);
    
    if (!channel) {
      // Initialize metrics for this subscription
      const metrics: SubscriptionMetrics = {
        channelName: config.channelName,
        table: config.table,
        eventCount: 0,
        errorCount: 0,
        lastEventTime: null,
        firstEventTime: null,
        averageLatency: 0,
        totalLatency: 0,
        status: 'CLOSED',
        createdAt: new Date(),
        lastError: null,
      };
      this.metrics.set(config.channelName, metrics);

      const subscriptionStartTime = Date.now();
      
      channel = supabase
        .channel(config.channelName)
        .on(
          'postgres_changes',
          {
            event: config.event === '*' ? '*' : config.event.toLowerCase() as any,
            schema: 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload) => {
            const eventStartTime = Date.now();
            const realtimePayload: RealtimePayload<T> = {
              eventType: payload.eventType.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new as T,
              old: payload.old as T,
            };
            
            try {
              const callbackStartTime = Date.now();
              const result = callback(realtimePayload);
              
              // Handle async callbacks
              if (result instanceof Promise) {
                result
                  .then(() => {
                    const callbackEndTime = Date.now();
                    this.updateMetrics(config.channelName, callbackEndTime - callbackStartTime, null);
                  })
                  .catch((error) => {
                    const callbackEndTime = Date.now();
                    this.updateMetrics(config.channelName, callbackEndTime - callbackStartTime, error);
                    if (config.onError) {
                      config.onError(error instanceof Error ? error : new Error(String(error)));
                    } else {
                      // Subscription callback error
                    }
                  });
              } else {
                const callbackEndTime = Date.now();
                this.updateMetrics(config.channelName, callbackEndTime - callbackStartTime, null);
              }
            } catch (error) {
              const callbackEndTime = Date.now();
              const errorObj = error instanceof Error ? error : new Error(String(error));
              this.updateMetrics(config.channelName, callbackEndTime - eventStartTime, errorObj);
              if (config.onError) {
                config.onError(error instanceof Error ? error : new Error(String(error)));
              } else {
                // Subscription callback error
              }
            }
          }
        )
        .subscribe((status) => {
          const metrics = this.metrics.get(config.channelName);
          if (metrics) {
            if (status === 'SUBSCRIBED') {
              metrics.status = 'SUBSCRIBED';
              const subscriptionLatency = Date.now() - subscriptionStartTime;
            } else if (status === 'CHANNEL_ERROR') {
              metrics.status = 'CHANNEL_ERROR';
              const error = new Error(`Failed to subscribe to ${config.channelName}`);
              metrics.lastError = error;
              metrics.errorCount++;
              if (config.onError) {
                config.onError(error);
              } else {
                // Subscription error
              }
            } else if (status === 'TIMED_OUT') {
              metrics.status = 'TIMED_OUT';
            } else if (status === 'CLOSED') {
              metrics.status = 'CLOSED';
            }
          }
        });
      
      this.channels.set(config.channelName, channel);
    }

    // Return unsubscribe function
    return () => {
      const channel = this.channels.get(config.channelName);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(config.channelName);
        const metrics = this.metrics.get(config.channelName);
        if (metrics) {
          metrics.status = 'CLOSED';
        }
      }
    };
  }

  /**
   * Update metrics for a subscription
   */
  private static updateMetrics(
    channelName: string,
    latency: number,
    error: Error | null
  ): void {
    const metrics = this.metrics.get(channelName);
    if (!metrics) return;

    const now = new Date();
    metrics.eventCount++;
    metrics.lastEventTime = now;
    if (!metrics.firstEventTime) {
      metrics.firstEventTime = now;
    }

    if (error) {
      metrics.errorCount++;
      metrics.lastError = error;
    }

    // Update average latency
    metrics.totalLatency += latency;
    metrics.averageLatency = metrics.totalLatency / metrics.eventCount;
  }

  /**
   * Unsubscribe from a specific channel
   */
  static unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  static unsubscribeAll(): void {
    for (const [channelName, channel] of this.channels.entries()) {
      supabase.removeChannel(channel);
      const metrics = this.metrics.get(channelName);
      if (metrics) {
        metrics.status = 'CLOSED';
      }
    }
    this.channels.clear();
  }

  /**
   * Get performance metrics for a specific subscription
   */
  static getMetrics(channelName: string): SubscriptionMetrics | null {
    return this.metrics.get(channelName) || null;
  }

  /**
   * Get all subscription metrics
   */
  static getAllMetrics(): SubscriptionMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics summary across all subscriptions
   */
  static getMetricsSummary(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalEvents: number;
    totalErrors: number;
    averageLatency: number;
    subscriptions: SubscriptionMetrics[];
  } {
    const allMetrics = this.getAllMetrics();
    const activeSubscriptions = allMetrics.filter(m => m.status === 'SUBSCRIBED').length;
    const totalEvents = allMetrics.reduce((sum, m) => sum + m.eventCount, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalLatency = allMetrics.reduce((sum, m) => sum + m.totalLatency, 0);
    const averageLatency = totalEvents > 0 ? totalLatency / totalEvents : 0;

    return {
      totalSubscriptions: allMetrics.length,
      activeSubscriptions,
      totalEvents,
      totalErrors,
      averageLatency,
      subscriptions: allMetrics,
    };
  }

  /**
   * Reset metrics for a specific subscription
   */
  static resetMetrics(channelName: string): void {
    const metrics = this.metrics.get(channelName);
    if (metrics) {
      metrics.eventCount = 0;
      metrics.errorCount = 0;
      metrics.lastEventTime = null;
      metrics.firstEventTime = null;
      metrics.averageLatency = 0;
      metrics.totalLatency = 0;
      metrics.lastError = null;
    }
  }

  /**
   * Clear all metrics
   */
  static clearAllMetrics(): void {
    this.metrics.clear();
  }
}

