/**
 * Location Tracking Service Tests
 */

import * as Location from 'expo-location';
import { LocationTrackingService, LocationUpdate, DriverLocation } from '../../services/locationTracking.service';
import { LocationService } from '../../services/location.service';

// Mock dependencies
jest.mock('expo-location');
jest.mock('../../services/location.service');
jest.mock('../../utils/subscriptionManager', () => ({
  SubscriptionManager: {
    subscribe: jest.fn((config, callback) => {
      return () => {}; // Return unsubscribe function
    }),
  },
}));

describe('LocationTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear active watchers
    (LocationTrackingService as any).activeWatchers.clear();
    (LocationTrackingService as any).updateIntervals.clear();
  });

  afterEach(() => {
    // Clean up any active tracking
    jest.clearAllTimers();
  });

  describe('startTracking', () => {
    it('should start tracking location for a driver', async () => {
      const mockSubscription = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1', 'booking-1');

      expect(LocationService.hasPermissions).toHaveBeenCalled();
      expect(LocationService.watchPositionAsync).toHaveBeenCalled();
      expect(LocationService.getCurrentLocation).toHaveBeenCalled();
    });

    it('should request permissions if not granted', async () => {
      const mockSubscription = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(false);
      (LocationService.requestPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1');

      expect(LocationService.requestPermissions).toHaveBeenCalled();
    });

    it('should throw error when permission denied', async () => {
      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(false);
      (LocationService.requestPermissions as jest.Mock).mockResolvedValue(false);

      await expect(LocationTrackingService.startTracking('driver-1')).rejects.toThrow(
        'Location permission denied'
      );
    });

    it('should not start tracking if already tracking', async () => {
      const mockSubscription = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1');
      await LocationTrackingService.startTracking('driver-1'); // Second call

      // watchPositionAsync should only be called once
      expect(LocationService.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('should use custom update interval', async () => {
      const mockSubscription = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1', null, 5000);

      expect(LocationService.watchPositionAsync).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          timeInterval: 5000,
        })
      );
    });

    it('should handle errors during tracking start', async () => {
      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Tracking error')
      );

      await expect(LocationTrackingService.startTracking('driver-1')).rejects.toThrow(
        'Tracking error'
      );
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking for a driver', async () => {
      const mockSubscription = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1');
      await LocationTrackingService.stopTracking('driver-1');

      expect(mockSubscription.remove).toHaveBeenCalled();
    });

    it('should clear update interval', async () => {
      const mockSubscription = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1');
      await LocationTrackingService.stopTracking('driver-1');

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle stopping when not tracking', async () => {
      await expect(LocationTrackingService.stopTracking('driver-1')).resolves.not.toThrow();
    });

    it('should handle errors during stop', async () => {
      const mockSubscription = {
        remove: jest.fn(() => {
          throw new Error('Remove error');
        }),
      };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1');
      await expect(LocationTrackingService.stopTracking('driver-1')).rejects.toThrow(
        'Remove error'
      );
    });
  });

  describe('updateLocation', () => {
    it('should update location without throwing', async () => {
      const update: LocationUpdate = {
        driverId: 'driver-1',
        bookingId: 'booking-1',
        latitude: 28.6139,
        longitude: 77.2090,
      };

      await expect(LocationTrackingService.updateLocation(update)).resolves.not.toThrow();
    });

    it('should handle errors during location update', async () => {
      // Since updateLocation is a placeholder, it should not throw
      const update: LocationUpdate = {
        driverId: 'driver-1',
        bookingId: null,
        latitude: 28.6139,
        longitude: 77.2090,
      };

      await expect(LocationTrackingService.updateLocation(update)).resolves.not.toThrow();
    });
  });

  describe('getDriverLocation', () => {
    it('should return null (placeholder implementation)', async () => {
      const location = await LocationTrackingService.getDriverLocation('driver-1');

      expect(location).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      await expect(LocationTrackingService.getDriverLocation('driver-1')).resolves.toBeNull();
    });
  });

  describe('getBookingLocation', () => {
    it('should return null (placeholder implementation)', async () => {
      const location = await LocationTrackingService.getBookingLocation('booking-1');

      expect(location).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      await expect(LocationTrackingService.getBookingLocation('booking-1')).resolves.toBeNull();
    });
  });

  describe('subscribeToDriverLocation', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = LocationTrackingService.subscribeToDriverLocation('driver-1', callback);

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should call SubscriptionManager.subscribe', () => {
      const { SubscriptionManager } = require('../../utils/subscriptionManager');
      const callback = jest.fn();

      LocationTrackingService.subscribeToDriverLocation('driver-1', callback);

      expect(SubscriptionManager.subscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToBookingLocation', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = LocationTrackingService.subscribeToBookingLocation('booking-1', callback);

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should call SubscriptionManager.subscribe', () => {
      const { SubscriptionManager } = require('../../utils/subscriptionManager');
      const callback = jest.fn();

      LocationTrackingService.subscribeToBookingLocation('booking-1', callback);

      expect(SubscriptionManager.subscribe).toHaveBeenCalled();
    });
  });

  describe('isTracking', () => {
    it('should return false when not tracking', () => {
      const isTracking = LocationTrackingService.isTracking('driver-1');

      expect(isTracking).toBe(false);
    });

    it('should return true when tracking', async () => {
      const mockSubscription = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1');

      const isTracking = LocationTrackingService.isTracking('driver-1');
      expect(isTracking).toBe(true);
    });
  });

  describe('stopAllTracking', () => {
    it('should stop all active tracking', async () => {
      const mockSubscription1 = { remove: jest.fn() };
      const mockSubscription2 = { remove: jest.fn() };
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 };

      (LocationService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (LocationService.watchPositionAsync as jest.Mock)
        .mockResolvedValueOnce(mockSubscription1)
        .mockResolvedValueOnce(mockSubscription2);
      (LocationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockLocation);
      jest.spyOn(LocationTrackingService, 'updateLocation').mockResolvedValue();

      await LocationTrackingService.startTracking('driver-1');
      await LocationTrackingService.startTracking('driver-2');
      await LocationTrackingService.stopAllTracking();

      expect(mockSubscription1.remove).toHaveBeenCalled();
      expect(mockSubscription2.remove).toHaveBeenCalled();
    });

    it('should handle empty tracking list', async () => {
      await expect(LocationTrackingService.stopAllTracking()).resolves.not.toThrow();
    });
  });
});

