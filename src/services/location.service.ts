// Location service for handling maps and distance calculations
// Using Haversine formula for distance calculation in MVP
// 
// This service provides utility functions for distance calculations and location operations.
// Uses expo-location for React Native compatibility.

import * as ExpoLocation from 'expo-location';
import { LOCATION_CONFIG } from '../constants/config';
import { handleError } from '../utils/errorHandler';
import { getErrorMessage } from '../utils/errors';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DistanceResult {
  distance: number; // in kilometers
  duration?: number; // in minutes (if available)
}

export class LocationService {
  // Calculate distance between two points using Haversine formula
  static calculateDistance(point1: Location, point2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Request location permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      handleError(error, {
        context: { operation: 'requestPermissions' },
        userFacing: false,
      });
      return false;
    }
  }

  /**
   * Check if location permissions are granted
   */
  static async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      handleError(error, {
        context: { operation: 'hasPermissions' },
        userFacing: false,
      });
      return false;
    }
  }

  /**
   * Get current location using device GPS (React Native compatible)
   */
  static async getCurrentLocation(): Promise<Location> {
    try {
      // Check permissions first
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      // Get current position
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'getCurrentLocation' },
        userFacing: false,
      });
      const errorMessage = getErrorMessage(error, 'Failed to get location');
      throw new Error(`Geolocation error: ${errorMessage}`);
    }
  }

  /**
   * Start watching location updates
   */
  static async watchPositionAsync(
    callback: (location: Location) => void,
    options?: {
      accuracy?: ExpoLocation.Accuracy;
      timeInterval?: number;
      distanceInterval?: number;
    }
  ): Promise<ExpoLocation.LocationSubscription> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      return await ExpoLocation.watchPositionAsync(
        {
          accuracy: options?.accuracy ?? ExpoLocation.Accuracy.High,
          timeInterval: options?.timeInterval ?? 5000,
          distanceInterval: options?.distanceInterval ?? 10,
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    } catch (error) {
      handleError(error, {
        context: { operation: 'watchPositionAsync' },
        userFacing: false,
      });
      const errorMessage = getErrorMessage(error, 'Failed to watch location');
      throw new Error(`Location watch error: ${errorMessage}`);
    }
  }

  // Reverse geocoding - get address from coordinates
  static async getAddressFromCoordinates(location: Location): Promise<string> {
    try {
      // This would typically use Google Maps Geocoding API
      // For MVP, we'll return a placeholder
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    } catch (error) {
      handleError(error, {
        context: { operation: 'getAddressFromCoordinates', location },
        userFacing: false,
      });
      throw new Error('Failed to get address from coordinates');
    }
  }

  // Get coordinates from address (geocoding)
  static async getCoordinatesFromAddress(address: string): Promise<Location> {
    try {
      // This would typically use Google Maps Geocoding API
      // For MVP, we'll return a placeholder
      throw new Error('Address geocoding not implemented in MVP');
    } catch (error) {
      // Preserve the original error message if it's our intentional error
      if (error instanceof Error && error.message === 'Address geocoding not implemented in MVP') {
        throw error;
      }
      handleError(error, {
        context: { operation: 'getCoordinatesFromAddress', address },
        userFacing: false,
      });
      throw new Error('Failed to get coordinates from address');
    }
  }

  // Calculate estimated delivery time based on distance
  static calculateEstimatedDeliveryTime(distance: number): number {
    // Assuming average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const timeInHours = distance / averageSpeed;
    return Math.ceil(timeInHours * 60); // Convert to minutes and round up
  }

  // Validate if location is within service area
  static isWithinServiceArea(location: Location): boolean {
    const serviceCenter: Location = {
      latitude: LOCATION_CONFIG.defaultCenter.latitude,
      longitude: LOCATION_CONFIG.defaultCenter.longitude,
    };
    
    const distance = this.calculateDistance(location, serviceCenter);
    return distance <= LOCATION_CONFIG.serviceRadius;
  }
}
