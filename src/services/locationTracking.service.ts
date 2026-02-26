/**
 * Location Tracking Service
 * 
 * Handles real-time location tracking for drivers during active bookings.
 * Provides real-time location updates for active bookings.
 */

import { LocationService } from './location.service';
import * as Location from 'expo-location';
import { SubscriptionManager } from '../utils/subscriptionManager';
import { supabase } from '../lib/supabaseClient';
import { deserializeDate } from '../utils/dateSerialization';
import { handleAsyncOperationWithRethrow, handleError } from '../utils/errorHandler';

export interface DriverLocation {
  id: string;
  driverId: string;
  bookingId: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface LocationUpdate {
  driverId: string;
  bookingId: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

/**
 * Location Tracking Service for driver location updates
 */
export class LocationTrackingService {
  private static activeWatchers = new Map<string, Location.LocationSubscription>();
  private static updateIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Start tracking location for a driver
   * @param driverId - The driver's user ID
   * @param bookingId - Optional booking ID if tracking for a specific booking
   * @param updateInterval - How often to update location (in milliseconds, default: 10 seconds)
   */
  static async startTracking(
    driverId: string,
    bookingId: string | null = null,
    updateInterval: number = 10000
  ): Promise<void> {
    try {
      // Check if already tracking
      if (this.activeWatchers.has(driverId)) {
        return;
      }

      // Request permissions
      const hasPermission = await LocationService.hasPermissions();
      if (!hasPermission) {
        const granted = await LocationService.requestPermissions();
        if (!granted) {
          throw new Error('Location permission denied. Cannot start tracking.');
        }
      }

      // Start watching position
      const subscription = await LocationService.watchPositionAsync(
        async (location) => {
          await this.updateLocation({
            driverId,
            bookingId,
            latitude: location.latitude,
            longitude: location.longitude,
          });
        },
        {
          accuracy: Location.Accuracy.High,
          timeInterval: updateInterval,
          distanceInterval: 10, // Update every 10 meters
        }
      );

      this.activeWatchers.set(driverId, subscription);

      // Also set up periodic updates as backup
      const interval = setInterval(async () => {
        try {
          const currentLocation = await LocationService.getCurrentLocation();
          await this.updateLocation({
            driverId,
            bookingId,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          });
        } catch (error) {
          handleError(error, {
            context: { operation: 'startTracking', phase: 'periodicUpdate', driverId, bookingId },
            userFacing: false,
          });
        }
      }, updateInterval);

      this.updateIntervals.set(driverId, interval);

      // Send initial location
      const initialLocation = await LocationService.getCurrentLocation();
      await this.updateLocation({
        driverId,
        bookingId,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
    } catch (error) {
      handleError(error, {
        context: { operation: 'startTracking', driverId, bookingId },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Stop tracking location for a driver
   */
  static async stopTracking(driverId: string): Promise<void> {
    try {
      // Stop watcher
      const watcher = this.activeWatchers.get(driverId);
      if (watcher) {
        watcher.remove();
        this.activeWatchers.delete(driverId);
      }

      // Clear interval
      const interval = this.updateIntervals.get(driverId);
      if (interval) {
        clearInterval(interval);
        this.updateIntervals.delete(driverId);
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'stopTracking', driverId },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Update driver location in database
   */
  static async updateLocation(update: LocationUpdate): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const { error } = await supabase
          .from('driver_locations')
          .upsert({
            driver_id: update.driverId,
            booking_id: update.bookingId || null,
            latitude: update.latitude,
            longitude: update.longitude,
            accuracy: update.accuracy || null,
            heading: update.heading || null,
            speed: update.speed || null,
          }, {
            onConflict: 'driver_id,booking_id',
          });

        if (error) {
          throw error;
        }
      },
      {
        context: { operation: 'updateLocation', driverId: update.driverId, bookingId: update.bookingId },
        userFacing: false,
      }
    );
  }

  /**
   * Get current location for a driver
   */
  static async getDriverLocation(driverId: string): Promise<DriverLocation | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const { data, error } = await supabase
          .from('driver_locations')
          .select('*')
          .eq('driver_id', driverId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          return null;
        }

        const row = data[0];
        return {
          id: row.id,
          driverId: row.driver_id,
          bookingId: row.booking_id || null,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: row.accuracy ? Number(row.accuracy) : undefined,
          heading: row.heading ? Number(row.heading) : undefined,
          speed: row.speed ? Number(row.speed) : undefined,
          timestamp: deserializeDate(row.updated_at) || new Date(),
        };
      },
      {
        context: { operation: 'getDriverLocation', driverId },
        userFacing: false,
      }
    );
  }

  /**
   * Get location for a specific booking
   */
  static async getBookingLocation(bookingId: string): Promise<DriverLocation | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const { data, error } = await supabase
          .from('driver_locations')
          .select('*')
          .eq('booking_id', bookingId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          return null;
        }

        const row = data[0];
        return {
          id: row.id,
          driverId: row.driver_id,
          bookingId: row.booking_id || null,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: row.accuracy ? Number(row.accuracy) : undefined,
          heading: row.heading ? Number(row.heading) : undefined,
          speed: row.speed ? Number(row.speed) : undefined,
          timestamp: deserializeDate(row.updated_at) || new Date(),
        };
      },
      {
        context: { operation: 'getBookingLocation', bookingId },
        userFacing: false,
      }
    );
  }

  /**
   * Subscribe to real-time location updates for a driver
   */
  static subscribeToDriverLocation(
    driverId: string,
    callback: (location: DriverLocation | null) => void
  ): () => void {
    return SubscriptionManager.subscribe(
      {
        channelName: `driver-location:${driverId}`,
        table: 'driver_locations',
        filter: `driver_id=eq.${driverId}`,
        event: 'UPDATE',
        onError: (error) => {
          handleError(error, {
            context: { operation: 'subscribeToDriverLocation', driverId },
            userFacing: false,
          });
        },
      },
      async (payload) => {
        try {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const location: DriverLocation = {
              id: payload.new.id,
              driverId: payload.new.driver_id,
              bookingId: payload.new.booking_id,
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              accuracy: payload.new.accuracy,
              heading: payload.new.heading,
              speed: payload.new.speed,
              timestamp: new Date(payload.new.updated_at),
            };
            callback(location);
          }
        } catch (error) {
          callback(null);
        }
      }
    );
  }

  /**
   * Subscribe to real-time location updates for a booking
   */
  static subscribeToBookingLocation(
    bookingId: string,
    callback: (location: DriverLocation | null) => void
  ): () => void {
    return SubscriptionManager.subscribe(
      {
        channelName: `booking-location:${bookingId}`,
        table: 'driver_locations',
        filter: `booking_id=eq.${bookingId}`,
        event: 'UPDATE',
        onError: (error) => {
          handleError(error, {
            context: { operation: 'subscribeToBookingLocation', bookingId },
            userFacing: false,
          });
        },
      },
      async (payload) => {
        try {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const location: DriverLocation = {
              id: payload.new.id,
              driverId: payload.new.driver_id,
              bookingId: payload.new.booking_id,
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              accuracy: payload.new.accuracy,
              heading: payload.new.heading,
              speed: payload.new.speed,
              timestamp: new Date(payload.new.updated_at),
            };
            callback(location);
          }
        } catch (error) {
          callback(null);
        }
      }
    );
  }

  /**
   * Check if tracking is active for a driver
   */
  static isTracking(driverId: string): boolean {
    return this.activeWatchers.has(driverId);
  }

  /**
   * Stop all active tracking
   */
  static async stopAllTracking(): Promise<void> {
    const driverIds = Array.from(this.activeWatchers.keys());
    await Promise.all(driverIds.map((id) => this.stopTracking(id)));
  }
}

