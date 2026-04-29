/**
 * TanStack Query hooks for remote lists — replaces legacy Zustand store tests (Phase 4).
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useUsersByRoleQuery } from './useUsersByRoleQuery';
import { useVehiclesByAgencyQuery } from './useVehiclesByAgencyQuery';
import { useCustomerBookingsQuery } from './useCustomerBookingsQuery';
import type { AdminUser, Booking, Vehicle } from '../../types';

jest.mock('../../services/user.service', () => ({
  UserService: {
    getUsersByRole: jest.fn(),
  },
}));

jest.mock('../../services/vehicle.service', () => ({
  VehicleService: {
    getVehiclesByAgency: jest.fn(),
  },
}));

jest.mock('../../services/booking.service', () => ({
  BookingService: {
    getBookingsByCustomer: jest.fn(),
  },
}));

import { UserService } from '../../services/user.service';
import { VehicleService } from '../../services/vehicle.service';
import { BookingService } from '../../services/booking.service';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('server data query hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useUsersByRoleQuery', () => {
    it('loads users via UserService', async () => {
      const users: AdminUser[] = [
        {
          id: 'u1',
          email: 'a@b.com',
          password: 'x',
          name: 'Admin',
          role: 'admin',
          createdAt: new Date(),
        },
      ];
      (UserService.getUsersByRole as jest.Mock).mockResolvedValue(users);

      const qc = createTestQueryClient();
      const { result, unmount } = renderHook(() => useUsersByRoleQuery('admin'), {
        wrapper: createWrapper(qc),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(users);
      expect(UserService.getUsersByRole).toHaveBeenCalledWith('admin');
      unmount();
      qc.clear();
    });
  });

  describe('useVehiclesByAgencyQuery', () => {
    it('does not fetch when agencyId is missing', () => {
      const qc = createTestQueryClient();
      const { unmount } = renderHook(() => useVehiclesByAgencyQuery(null), {
        wrapper: createWrapper(qc),
      });

      expect(VehicleService.getVehiclesByAgency).not.toHaveBeenCalled();
      unmount();
      qc.clear();
    });

    it('loads vehicles when agencyId is set', async () => {
      const vehicles: Vehicle[] = [
        {
          id: 'v1',
          agencyId: 'ag1',
          vehicleNumber: 'AB01',
          insuranceCompanyName: 'Ins Co',
          insuranceExpiryDate: new Date(),
          vehicleCapacity: 1000,
          amount: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (VehicleService.getVehiclesByAgency as jest.Mock).mockResolvedValue(vehicles);

      const qc = createTestQueryClient();
      const { result, unmount } = renderHook(() => useVehiclesByAgencyQuery('ag1'), {
        wrapper: createWrapper(qc),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(vehicles);
      expect(VehicleService.getVehiclesByAgency).toHaveBeenCalledWith('ag1');
      unmount();
      qc.clear();
    });
  });

  describe('useCustomerBookingsQuery', () => {
    it('does not fetch when customerId is missing', () => {
      const qc = createTestQueryClient();
      const { unmount } = renderHook(() => useCustomerBookingsQuery(undefined), {
        wrapper: createWrapper(qc),
      });

      expect(BookingService.getBookingsByCustomer).not.toHaveBeenCalled();
      unmount();
      qc.clear();
    });

    it('loads bookings for customer', async () => {
      const bookings: Booking[] = [];
      (BookingService.getBookingsByCustomer as jest.Mock).mockResolvedValue(bookings);

      const qc = createTestQueryClient();
      const { result, unmount } = renderHook(() => useCustomerBookingsQuery('cust-1'), {
        wrapper: createWrapper(qc),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(bookings);
      expect(BookingService.getBookingsByCustomer).toHaveBeenCalledWith('cust-1');
      unmount();
      qc.clear();
    });
  });
});
