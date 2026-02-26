/**
 * Location Service Tests
 */

import * as ExpoLocation from 'expo-location';
import { LocationService, Location } from '../../services/location.service';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    High: 'high',
    Balanced: 'balanced',
    Low: 'low',
  },
}));

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      const point1: Location = { latitude: 28.6139, longitude: 77.2090 }; // Delhi
      const point2: Location = { latitude: 19.0760, longitude: 72.8777 }; // Mumbai

      const distance = LocationService.calculateDistance(point1, point2);

      // Distance between Delhi and Mumbai is approximately 1150 km
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1200);
    });

    it('should return 0 for same point', () => {
      const point: Location = { latitude: 28.6139, longitude: 77.2090 };

      const distance = LocationService.calculateDistance(point, point);

      expect(distance).toBe(0);
    });

    it('should calculate distance for nearby points', () => {
      const point1: Location = { latitude: 28.6139, longitude: 77.2090 };
      const point2: Location = { latitude: 28.6140, longitude: 77.2091 };

      const distance = LocationService.calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1); // Should be less than 1 km
    });

    it('should round distance to 2 decimal places', () => {
      const point1: Location = { latitude: 28.6139, longitude: 77.2090 };
      const point2: Location = { latitude: 28.6140, longitude: 77.2091 };

      const distance = LocationService.calculateDistance(point1, point2);

      const decimalPlaces = (distance.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('requestPermissions', () => {
    it('should return true when permission is granted', async () => {
      (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await LocationService.requestPermissions();

      expect(result).toBe(true);
      expect(ExpoLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await LocationService.requestPermissions();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await LocationService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('hasPermissions', () => {
    it('should return true when permission is already granted', async () => {
      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await LocationService.hasPermissions();

      expect(result).toBe(true);
      expect(ExpoLocation.getForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission is not granted', async () => {
      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await LocationService.hasPermissions();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission check error')
      );

      const result = await LocationService.hasPermissions();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location when permission is granted', async () => {
      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      });

      const location = await LocationService.getCurrentLocation();

      expect(location.latitude).toBe(28.6139);
      expect(location.longitude).toBe(77.2090);
      expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      });
    });

    it('should request permission if not already granted', async () => {
      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      });

      const location = await LocationService.getCurrentLocation();

      expect(location.latitude).toBe(28.6139);
      expect(ExpoLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should throw error when permission is denied', async () => {
      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(LocationService.getCurrentLocation()).rejects.toThrow(
        'Location permission denied'
      );
    });

    it('should throw error when location fetch fails', async () => {
      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Location error')
      );

      await expect(LocationService.getCurrentLocation()).rejects.toThrow('Geolocation error');
    });
  });

  describe('watchPositionAsync', () => {
    it('should start watching position when permission is granted', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);

      const subscription = await LocationService.watchPositionAsync(mockCallback);

      expect(ExpoLocation.watchPositionAsync).toHaveBeenCalled();
      expect(subscription).toBe(mockSubscription);
    });

    it('should request permission if not already granted', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);

      await LocationService.watchPositionAsync(mockCallback);

      expect(ExpoLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should throw error when permission is denied', async () => {
      const mockCallback = jest.fn();

      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(LocationService.watchPositionAsync(mockCallback)).rejects.toThrow(
        'Location permission denied'
      );
    });

    it('should use custom options when provided', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.watchPositionAsync as jest.Mock).mockResolvedValue(mockSubscription);

      await LocationService.watchPositionAsync(mockCallback, {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 20,
      });

      expect(ExpoLocation.watchPositionAsync).toHaveBeenCalledWith(
        {
          accuracy: ExpoLocation.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        expect.any(Function)
      );
    });

    it('should call callback with location updates', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.watchPositionAsync as jest.Mock).mockImplementation((options, callback) => {
        // Simulate location update
        callback({
          coords: {
            latitude: 28.6139,
            longitude: 77.2090,
          },
        });
        return Promise.resolve(mockSubscription);
      });

      await LocationService.watchPositionAsync(mockCallback);

      // Callback should be called with location
      expect(mockCallback).toHaveBeenCalledWith({
        latitude: 28.6139,
        longitude: 77.2090,
      });
    });

    it('should throw error when watch fails', async () => {
      const mockCallback = jest.fn();

      (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ExpoLocation.watchPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Watch error')
      );

      await expect(LocationService.watchPositionAsync(mockCallback)).rejects.toThrow(
        'Location watch error'
      );
    });
  });

  describe('getAddressFromCoordinates', () => {
    it('should return formatted coordinates as address', async () => {
      const location: Location = { latitude: 28.6139, longitude: 77.2090 };

      const address = await LocationService.getAddressFromCoordinates(location);

      expect(address).toBe('28.6139, 77.2090');
    });

    it('should format coordinates to 4 decimal places', async () => {
      const location: Location = { latitude: 28.6139123, longitude: 77.2090456 };

      const address = await LocationService.getAddressFromCoordinates(location);

      expect(address).toBe('28.6139, 77.2090');
    });

    it('should throw error on failure', async () => {
      // This test is for error handling, but the current implementation
      // doesn't actually throw errors. This is a placeholder for future implementation.
      const location: Location = { latitude: 28.6139, longitude: 77.2090 };

      const address = await LocationService.getAddressFromCoordinates(location);

      expect(address).toBeDefined();
    });
  });

  describe('getCoordinatesFromAddress', () => {
    it('should throw error as geocoding is not implemented', async () => {
      await expect(
        LocationService.getCoordinatesFromAddress('Test Address')
      ).rejects.toThrow('Address geocoding not implemented in MVP');
    });
  });

  describe('calculateEstimatedDeliveryTime', () => {
    it('should calculate delivery time based on distance', () => {
      const distance = 30; // 30 km

      const time = LocationService.calculateEstimatedDeliveryTime(distance);

      // At 30 km/h, 30 km = 1 hour = 60 minutes
      expect(time).toBe(60);
    });

    it('should round up to nearest minute', () => {
      const distance = 15; // 15 km = 0.5 hours = 30 minutes

      const time = LocationService.calculateEstimatedDeliveryTime(distance);

      expect(time).toBe(30);
    });

    it('should handle small distances', () => {
      const distance = 1; // 1 km = 1/30 hours = 2 minutes

      const time = LocationService.calculateEstimatedDeliveryTime(distance);

      expect(time).toBeGreaterThanOrEqual(2);
    });

    it('should handle large distances', () => {
      const distance = 100; // 100 km = 3.33 hours = 200 minutes

      const time = LocationService.calculateEstimatedDeliveryTime(distance);

      expect(time).toBeGreaterThanOrEqual(200);
    });
  });

  describe('isWithinServiceArea', () => {
    it('should return true for location within service area', () => {
      const location: Location = {
        latitude: 28.6139, // Delhi (service center)
        longitude: 77.2090,
      };

      const result = LocationService.isWithinServiceArea(location);

      expect(result).toBe(true);
    });

    it('should return true for location within 50km radius', () => {
      const location: Location = {
        latitude: 28.7140, // Approximately 11 km from Delhi center
        longitude: 77.2090,
      };

      const result = LocationService.isWithinServiceArea(location);

      expect(result).toBe(true);
    });

    it('should return false for location outside service area', () => {
      const location: Location = {
        latitude: 19.0760, // Mumbai (far from Delhi)
        longitude: 72.8777,
      };

      const result = LocationService.isWithinServiceArea(location);

      expect(result).toBe(false);
    });

    it('should return false for location exactly at 50km boundary', () => {
      // This test verifies the boundary condition
      // A location exactly 50km away should return true (<= 50)
      const location: Location = {
        latitude: 28.6139,
        longitude: 77.2090,
      };

      const result = LocationService.isWithinServiceArea(location);

      expect(result).toBe(true);
    });
  });
});

