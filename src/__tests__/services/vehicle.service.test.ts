/**
 * Vehicle Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleService } from '../../services/vehicle.service';
import { LocalStorageService } from '../../services/localStorage';
import { Vehicle } from '../../types';

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
});

// Restore all mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
});

describe('VehicleService', () => {
  const mockVehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
    agencyId: 'agency-1',
    vehicleNumber: 'ABC123',
    vehicleType: 'tanker',
    capacity: 10000,
    isAvailable: true,
    driverId: 'driver-1',
  };

  describe('getAllVehicles', () => {
    beforeEach(async () => {
      await LocalStorageService.saveVehicle({
        ...mockVehicle,
        id: 'vehicle-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should return all vehicles', async () => {
      const vehicles = await VehicleService.getAllVehicles();

      expect(vehicles.length).toBeGreaterThanOrEqual(1);
      expect(vehicles[0].vehicleNumber).toBe('ABC123');
    });

    it('should return empty array when no vehicles exist', async () => {
      await AsyncStorage.clear();

      const vehicles = await VehicleService.getAllVehicles();

      expect(vehicles).toEqual([]);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getVehicles').mockRejectedValue(new Error('Fetch error'));

      await expect(VehicleService.getAllVehicles()).rejects.toThrow('Fetch error');
    });
  });

  describe('getVehiclesByAgency', () => {
    beforeEach(async () => {
      await LocalStorageService.saveVehicle({
        ...mockVehicle,
        id: 'vehicle-1',
        agencyId: 'agency-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await LocalStorageService.saveVehicle({
        ...mockVehicle,
        id: 'vehicle-2',
        agencyId: 'agency-2',
        vehicleNumber: 'XYZ789',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should return vehicles for specific agency', async () => {
      const vehicles = await VehicleService.getVehiclesByAgency('agency-1');

      expect(vehicles.length).toBe(1);
      expect(vehicles[0].agencyId).toBe('agency-1');
      expect(vehicles[0].vehicleNumber).toBe('ABC123');
    });

    it('should return empty array when no vehicles for agency', async () => {
      const vehicles = await VehicleService.getVehiclesByAgency('agency-999');

      expect(vehicles).toEqual([]);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getVehicles').mockRejectedValue(new Error('Fetch error'));

      await expect(VehicleService.getVehiclesByAgency('agency-1')).rejects.toThrow('Fetch error');
    });
  });

  describe('getVehicleById', () => {
    let vehicleId: string;

    beforeEach(async () => {
      const vehicle = await LocalStorageService.saveVehicle({
        ...mockVehicle,
        id: 'vehicle-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vehicleId = 'vehicle-1';
    });

    it('should return vehicle by id', async () => {
      const vehicle = await VehicleService.getVehicleById(vehicleId);

      expect(vehicle).toBeTruthy();
      expect(vehicle?.id).toBe(vehicleId);
      expect(vehicle?.vehicleNumber).toBe('ABC123');
    });

    it('should return null for non-existent vehicle', async () => {
      const vehicle = await VehicleService.getVehicleById('non-existent');

      expect(vehicle).toBeNull();
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getVehicleById').mockRejectedValue(new Error('Fetch error'));

      await expect(VehicleService.getVehicleById(vehicleId)).rejects.toThrow('Fetch error');
    });
  });

  describe('createVehicle', () => {
    it('should create a new vehicle with generated id', async () => {
      const vehicle = await VehicleService.createVehicle(mockVehicle);

      expect(vehicle.id).toBeTruthy();
      expect(typeof vehicle.id).toBe('string');
      expect(vehicle.vehicleNumber).toBe('ABC123');
      expect(vehicle.createdAt).toBeInstanceOf(Date);
      expect(vehicle.updatedAt).toBeInstanceOf(Date);

      const savedVehicle = await LocalStorageService.getVehicleById(vehicle.id);
      expect(savedVehicle).toBeTruthy();
    });

    it('should create vehicle with all provided fields', async () => {
      const vehicleData = {
        ...mockVehicle,
        driverId: 'driver-2',
        capacity: 15000,
      };

      const vehicle = await VehicleService.createVehicle(vehicleData);

      expect(vehicle.driverId).toBe('driver-2');
      expect(vehicle.capacity).toBe(15000);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'saveVehicle').mockRejectedValue(new Error('Save error'));

      await expect(VehicleService.createVehicle(mockVehicle)).rejects.toThrow('Save error');
    });
  });

  describe('updateVehicle', () => {
    let vehicleId: string;

    beforeEach(async () => {
      const vehicle = await LocalStorageService.saveVehicle({
        ...mockVehicle,
        id: 'vehicle-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vehicleId = 'vehicle-1';
    });

    it('should update vehicle fields', async () => {
      const updates = {
        isAvailable: false,
        driverId: 'driver-2',
      };

      await VehicleService.updateVehicle(vehicleId, updates);

      const updatedVehicle = await LocalStorageService.getVehicleById(vehicleId);
      expect(updatedVehicle?.isAvailable).toBe(false);
      expect(updatedVehicle?.driverId).toBe('driver-2');
    });

    it('should update vehicle number', async () => {
      await VehicleService.updateVehicle(vehicleId, {
        vehicleNumber: 'NEW123',
      });

      const updatedVehicle = await LocalStorageService.getVehicleById(vehicleId);
      expect(updatedVehicle?.vehicleNumber).toBe('NEW123');
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'updateVehicle').mockRejectedValue(new Error('Update error'));

      await expect(
        VehicleService.updateVehicle(vehicleId, { isAvailable: false })
      ).rejects.toThrow('Update error');
    });
  });

  describe('deleteVehicle', () => {
    let vehicleId: string;

    beforeEach(async () => {
      const vehicle = await LocalStorageService.saveVehicle({
        ...mockVehicle,
        id: 'vehicle-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vehicleId = 'vehicle-1';
    });

    it('should delete vehicle by id', async () => {
      await VehicleService.deleteVehicle(vehicleId);

      const vehicle = await LocalStorageService.getVehicleById(vehicleId);
      expect(vehicle).toBeNull();
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'deleteVehicle').mockRejectedValue(new Error('Delete error'));

      await expect(VehicleService.deleteVehicle(vehicleId)).rejects.toThrow('Delete error');
    });
  });

  describe('subscribeToVehicleUpdates', () => {
    it('should return a no-op unsubscribe function', () => {
      const unsubscribe = VehicleService.subscribeToVehicleUpdates('vehicle-1', () => {});

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should accept callback without throwing', () => {
      const callback = jest.fn();
      const unsubscribe = VehicleService.subscribeToVehicleUpdates('vehicle-1', callback);

      expect(callback).not.toHaveBeenCalled();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('subscribeToAgencyVehiclesUpdates', () => {
    it('should return a no-op unsubscribe function', () => {
      const unsubscribe = VehicleService.subscribeToAgencyVehiclesUpdates('agency-1', () => {});

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should accept callback without throwing', () => {
      const callback = jest.fn();
      const unsubscribe = VehicleService.subscribeToAgencyVehiclesUpdates('agency-1', callback);

      expect(callback).not.toHaveBeenCalled();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('subscribeToAllVehiclesUpdates', () => {
    it('should return a no-op unsubscribe function', () => {
      const unsubscribe = VehicleService.subscribeToAllVehiclesUpdates(() => {});

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should accept callback without throwing', () => {
      const callback = jest.fn();
      const unsubscribe = VehicleService.subscribeToAllVehiclesUpdates(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});

