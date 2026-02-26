/**
 * Vehicle Store Tests
 */

import { useVehicleStore } from '../../store/vehicleStore';
import { VehicleService } from '../../services/vehicle.service';
import { Vehicle } from '../../types';

// Mock the VehicleService
jest.mock('../../services/vehicle.service');

describe('useVehicleStore', () => {
  const mockVehicle: Vehicle = {
    id: 'vehicle-1',
    agencyId: 'agency-1',
    vehicleNumber: 'DL01AB1234',
    insuranceCompanyName: 'Test Insurance',
    insuranceExpiryDate: new Date('2025-12-31'),
    vehicleCapacity: 5000,
    amount: 10000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVehicle2: Vehicle = {
    id: 'vehicle-2',
    agencyId: 'agency-1',
    vehicleNumber: 'DL01CD5678',
    insuranceCompanyName: 'Test Insurance 2',
    insuranceExpiryDate: new Date('2025-12-31'),
    vehicleCapacity: 3000,
    amount: 8000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset store state before each test
    useVehicleStore.setState({
      vehicles: [],
      selectedVehicle: null,
      isLoading: false,
      error: null,
      unsubscribeAgencyVehicles: null,
      currentAgencyId: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useVehicleStore.getState();

      expect(state.vehicles).toEqual([]);
      expect(state.selectedVehicle).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.unsubscribeAgencyVehicles).toBeNull();
      expect(state.currentAgencyId).toBeNull();
    });
  });

  describe('fetchAllVehicles', () => {
    it('should fetch all vehicles successfully', async () => {
      const vehicles = [mockVehicle, mockVehicle2];
      (VehicleService.getAllVehicles as jest.Mock).mockResolvedValue(vehicles);

      await useVehicleStore.getState().fetchAllVehicles();

      const state = useVehicleStore.getState();
      expect(state.vehicles).toEqual(vehicles);
      expect(state.isLoading).toBe(false);
      expect(VehicleService.getAllVehicles).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      (VehicleService.getAllVehicles as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(useVehicleStore.getState().fetchAllVehicles()).rejects.toThrow('Fetch error');

      const state = useVehicleStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('fetchVehiclesByAgency', () => {
    it('should fetch vehicles by agency successfully', async () => {
      const vehicles = [mockVehicle, mockVehicle2];
      (VehicleService.getVehiclesByAgency as jest.Mock).mockResolvedValue(vehicles);

      const result = await useVehicleStore.getState().fetchVehiclesByAgency('agency-1');

      expect(result).toEqual(vehicles);
      const state = useVehicleStore.getState();
      expect(state.vehicles).toEqual(vehicles);
      expect(state.isLoading).toBe(false);
      expect(VehicleService.getVehiclesByAgency).toHaveBeenCalledWith('agency-1');
    });

    it('should handle fetch errors', async () => {
      (VehicleService.getVehiclesByAgency as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(
        useVehicleStore.getState().fetchVehiclesByAgency('agency-1')
      ).rejects.toThrow('Fetch error');

      const state = useVehicleStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('addVehicle', () => {
    it('should add vehicle successfully', async () => {
      const newVehicle = { ...mockVehicle };
      (VehicleService.createVehicle as jest.Mock).mockResolvedValue(newVehicle);

      await useVehicleStore.getState().addVehicle({
        agencyId: 'agency-1',
        vehicleNumber: 'DL01AB1234',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 5000,
        amount: 10000,
      });

      const state = useVehicleStore.getState();
      expect(state.vehicles).toHaveLength(1);
      expect(state.vehicles[0]).toEqual(newVehicle);
      expect(state.isLoading).toBe(false);
      expect(VehicleService.createVehicle).toHaveBeenCalled();
    });

    it('should handle add vehicle errors', async () => {
      (VehicleService.createVehicle as jest.Mock).mockRejectedValue(new Error('Create error'));

      await expect(
        useVehicleStore.getState().addVehicle({
          agencyId: 'agency-1',
          vehicleNumber: 'DL01AB1234',
          insuranceCompanyName: 'Test Insurance',
          insuranceExpiryDate: new Date('2025-12-31'),
          vehicleCapacity: 5000,
          amount: 10000,
        })
      ).rejects.toThrow('Create error');

      const state = useVehicleStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Create error');
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle successfully', async () => {
      useVehicleStore.setState({ vehicles: [mockVehicle] });
      (VehicleService.updateVehicle as jest.Mock).mockResolvedValue(undefined);

      await useVehicleStore.getState().updateVehicle('vehicle-1', { amount: 12000 });

      const state = useVehicleStore.getState();
      expect(state.vehicles[0].amount).toBe(12000);
      expect(state.isLoading).toBe(false);
      expect(VehicleService.updateVehicle).toHaveBeenCalledWith('vehicle-1', { amount: 12000 });
    });

    it('should handle update errors', async () => {
      useVehicleStore.setState({ vehicles: [mockVehicle] });
      (VehicleService.updateVehicle as jest.Mock).mockRejectedValue(new Error('Update error'));

      await expect(
        useVehicleStore.getState().updateVehicle('vehicle-1', { amount: 12000 })
      ).rejects.toThrow('Update error');

      const state = useVehicleStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Update error');
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle successfully', async () => {
      useVehicleStore.setState({ vehicles: [mockVehicle], selectedVehicle: mockVehicle });
      (VehicleService.deleteVehicle as jest.Mock).mockResolvedValue(undefined);

      await useVehicleStore.getState().deleteVehicle('vehicle-1');

      const state = useVehicleStore.getState();
      expect(state.vehicles).toHaveLength(0);
      expect(state.selectedVehicle).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(VehicleService.deleteVehicle).toHaveBeenCalledWith('vehicle-1');
    });

    it('should not clear selectedVehicle if it is different vehicle', async () => {
      useVehicleStore.setState({
        vehicles: [mockVehicle, mockVehicle2],
        selectedVehicle: mockVehicle2,
      });
      (VehicleService.deleteVehicle as jest.Mock).mockResolvedValue(undefined);

      await useVehicleStore.getState().deleteVehicle('vehicle-1');

      const state = useVehicleStore.getState();
      expect(state.vehicles).toHaveLength(1);
      expect(state.selectedVehicle).toEqual(mockVehicle2);
    });

    it('should handle delete errors', async () => {
      useVehicleStore.setState({ vehicles: [mockVehicle] });
      (VehicleService.deleteVehicle as jest.Mock).mockRejectedValue(new Error('Delete error'));

      await expect(
        useVehicleStore.getState().deleteVehicle('vehicle-1')
      ).rejects.toThrow('Delete error');

      const state = useVehicleStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Delete error');
    });
  });

  describe('subscribeToAgencyVehicles', () => {
    it('should subscribe to agency vehicles updates', () => {
      const mockUnsubscribe = jest.fn();
      (VehicleService.subscribeToAgencyVehiclesUpdates as jest.Mock).mockReturnValue(mockUnsubscribe);

      useVehicleStore.getState().subscribeToAgencyVehicles('agency-1');

      const state = useVehicleStore.getState();
      expect(state.unsubscribeAgencyVehicles).toBe(mockUnsubscribe);
      expect(state.currentAgencyId).toBe('agency-1');
      expect(VehicleService.subscribeToAgencyVehiclesUpdates).toHaveBeenCalledWith(
        'agency-1',
        expect.any(Function)
      );
    });

    it('should clean up existing subscription before creating new one', () => {
      const oldUnsubscribe = jest.fn();
      useVehicleStore.setState({ unsubscribeAgencyVehicles: oldUnsubscribe });

      const newUnsubscribe = jest.fn();
      (VehicleService.subscribeToAgencyVehiclesUpdates as jest.Mock).mockReturnValue(newUnsubscribe);

      useVehicleStore.getState().subscribeToAgencyVehicles('agency-2');

      expect(oldUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useVehicleStore.getState().unsubscribeAgencyVehicles).toBe(newUnsubscribe);
      expect(useVehicleStore.getState().currentAgencyId).toBe('agency-2');
    });

    it('should update vehicles when subscription callback is called', () => {
      let callback: ((vehicles: Vehicle[]) => void) | undefined;
      (VehicleService.subscribeToAgencyVehiclesUpdates as jest.Mock).mockImplementation((agencyId, cb) => {
        callback = cb;
        return jest.fn();
      });

      useVehicleStore.getState().subscribeToAgencyVehicles('agency-1');

      const updatedVehicles = [mockVehicle, mockVehicle2];
      callback?.(updatedVehicles);

      expect(useVehicleStore.getState().vehicles).toEqual(updatedVehicles);
    });
  });

  describe('unsubscribeFromAgencyVehicles', () => {
    it('should unsubscribe and clear subscription', () => {
      const mockUnsubscribe = jest.fn();
      useVehicleStore.setState({
        unsubscribeAgencyVehicles: mockUnsubscribe,
        currentAgencyId: 'agency-1',
      });

      useVehicleStore.getState().unsubscribeFromAgencyVehicles();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useVehicleStore.getState().unsubscribeAgencyVehicles).toBeNull();
      expect(useVehicleStore.getState().currentAgencyId).toBeNull();
    });

    it('should handle when no subscription exists', () => {
      useVehicleStore.setState({ unsubscribeAgencyVehicles: null });

      expect(() => {
        useVehicleStore.getState().unsubscribeFromAgencyVehicles();
      }).not.toThrow();
    });
  });

  describe('setSelectedVehicle', () => {
    it('should set selected vehicle', () => {
      useVehicleStore.getState().setSelectedVehicle(mockVehicle);
      expect(useVehicleStore.getState().selectedVehicle).toEqual(mockVehicle);
    });

    it('should set selected vehicle to null', () => {
      useVehicleStore.getState().setSelectedVehicle(null);
      expect(useVehicleStore.getState().selectedVehicle).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useVehicleStore.getState().setLoading(true);
      expect(useVehicleStore.getState().isLoading).toBe(true);

      useVehicleStore.getState().setLoading(false);
      expect(useVehicleStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useVehicleStore.getState().setError('Test error');
      expect(useVehicleStore.getState().error).toBe('Test error');
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useVehicleStore.setState({ error: 'Test error' });
      useVehicleStore.getState().clearError();
      expect(useVehicleStore.getState().error).toBeNull();
    });
  });
});

