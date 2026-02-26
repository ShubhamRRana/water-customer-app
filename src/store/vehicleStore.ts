import { create } from 'zustand';
import { Vehicle } from '../types';
import { VehicleService } from '../services/vehicle.service';
import { handleError } from '../utils/errorHandler';
import { ErrorSeverity } from '../utils/errorLogger';
import { getErrorMessage } from '../utils/errors';

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
  unsubscribeAgencyVehicles: (() => void) | null;
  currentAgencyId: string | null;
  
  // Actions
  fetchAllVehicles: () => Promise<void>;
  fetchVehiclesByAgency: (agencyId: string) => Promise<Vehicle[]>;
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  subscribeToAgencyVehicles: (agencyId: string) => void;
  unsubscribeFromAgencyVehicles: () => void;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  isLoading: false,
  error: null,
  unsubscribeAgencyVehicles: null,
  currentAgencyId: null,

  fetchAllVehicles: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehicles = await VehicleService.getAllVehicles();
      set({ vehicles, isLoading: false });
    } catch (error) {
      handleError(error, {
        context: { operation: 'fetchAllVehicles' },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to fetch vehicles');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchVehiclesByAgency: async (agencyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const vehicles = await VehicleService.getVehiclesByAgency(agencyId);
      set({ vehicles, isLoading: false });
      return vehicles;
    } catch (error) {
      handleError(error, {
        context: { operation: 'fetchVehiclesByAgency', agencyId },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to fetch vehicles by agency');
      set({ isLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  addVehicle: async (vehicleData) => {
    set({ isLoading: true, error: null });
    try {
      const newVehicle = await VehicleService.createVehicle(vehicleData);
      
      // Update local state
      const { vehicles } = get();
      set({ vehicles: [...vehicles, newVehicle], isLoading: false });
    } catch (error) {
      handleError(error, {
        context: { operation: 'addVehicle', agencyId: vehicleData.agencyId },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to add vehicle');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateVehicle: async (vehicleId, updates) => {
    set({ isLoading: true, error: null });
    try {
      await VehicleService.updateVehicle(vehicleId, updates);
      
      // Update local state
      const { vehicles } = get();
      const updatedVehicles = vehicles.map(vehicle =>
        vehicle.id === vehicleId ? { ...vehicle, ...updates } : vehicle
      );
      set({ vehicles: updatedVehicles, isLoading: false });
    } catch (error) {
      handleError(error, {
        context: { operation: 'updateVehicle', vehicleId },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to update vehicle');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  deleteVehicle: async (vehicleId) => {
    set({ isLoading: true, error: null });
    try {
      await VehicleService.deleteVehicle(vehicleId);
      
      // Update local state
      const { vehicles } = get();
      set({ 
        vehicles: vehicles.filter(v => v.id !== vehicleId), 
        selectedVehicle: get().selectedVehicle?.id === vehicleId ? null : get().selectedVehicle,
        isLoading: false 
      });
    } catch (error) {
      handleError(error, {
        context: { operation: 'deleteVehicle', vehicleId },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to delete vehicle');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  subscribeToAgencyVehicles: (agencyId: string) => {
    const { unsubscribeAgencyVehicles } = get();
    // Clean up existing subscription if any
    if (unsubscribeAgencyVehicles) {
      unsubscribeAgencyVehicles();
    }

    const unsubscribe = VehicleService.subscribeToAgencyVehiclesUpdates(agencyId, (vehicles) => {
      set({ vehicles });
    });

    set({ unsubscribeAgencyVehicles: unsubscribe, currentAgencyId: agencyId });
  },

  unsubscribeFromAgencyVehicles: () => {
    const { unsubscribeAgencyVehicles } = get();
    if (unsubscribeAgencyVehicles) {
      unsubscribeAgencyVehicles();
      set({ unsubscribeAgencyVehicles: null, currentAgencyId: null });
    }
  },

  setSelectedVehicle: (vehicle) => {
    set({ selectedVehicle: vehicle });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

