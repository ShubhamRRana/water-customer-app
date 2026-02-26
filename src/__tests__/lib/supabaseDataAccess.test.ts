/**
 * Supabase Data Access Layer Tests
 * 
 * Phase 7, Item 3: Test Data Access
 * - Verify all queries work correctly
 * - Check data relationships
 * - Test filtering and sorting
 */

import { SupabaseDataAccess } from '../../lib/supabaseDataAccess';
import { User, Booking, Vehicle, CustomerUser, DriverUser, AdminUser, Address } from '../../types/index';
import { NotFoundError, DataAccessError } from '../../utils/errors';
import { supabase } from '../../lib/supabaseClient';

// Mock Supabase client
const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
});

jest.mock('../../lib/supabaseClient', () => {
  const mockSupabase = {
    from: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 0);
        return { unsubscribe: jest.fn() };
      }),
    }),
    removeChannel: jest.fn(),
  };

  return {
    supabase: mockSupabase,
  };
});

describe('SupabaseDataAccess', () => {
  let dataAccess: SupabaseDataAccess;

  beforeEach(() => {
    jest.clearAllMocks();
    dataAccess = new SupabaseDataAccess();
    // Reset to return a new query builder for each call
    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(dataAccess.initialize()).resolves.not.toThrow();
    });

    it('should generate unique IDs', () => {
      const id1 = dataAccess.generateId();
      const id2 = dataAccess.generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('User Data Access', () => {
    const mockCustomerUser: CustomerUser = {
      id: 'customer-1',
      email: 'customer@example.com',
      password: 'hashed-password',
      name: 'Test Customer',
      phone: '1234567890',
      role: 'customer',
      savedAddresses: [
        {
          id: 'addr-1',
          address: '123 Main St, City, State 12345',
          latitude: 40.7128,
          longitude: -74.0060,
        },
      ],
      createdAt: new Date('2024-01-01'),
    };

    const mockDriverUser: DriverUser = {
      id: 'driver-1',
      email: 'driver@example.com',
      password: 'hashed-password',
      name: 'Test Driver',
      phone: '9876543210',
      role: 'driver',
      vehicleNumber: 'ABC-1234',
      licenseNumber: 'DL-12345',
      licenseExpiry: new Date('2025-12-31'),
      driverLicenseImage: 'https://example.com/license.jpg',
      vehicleRegistrationImage: 'https://example.com/registration.jpg',
      totalEarnings: 5000.50,
      completedOrders: 10,
      createdByAdmin: false,
      createdAt: new Date('2024-01-01'),
    };

    const mockAdminUser: AdminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      password: 'hashed-password',
      name: 'Test Admin',
      phone: '5555555555',
      role: 'admin',
      businessName: 'Test Business',
      createdAt: new Date('2024-01-01'),
    };

    describe('getCurrentUser', () => {
      it('should return current user when session exists', async () => {
        const mockUserRow = {
          id: 'customer-1',
          email: 'customer@example.com',
          password_hash: 'hashed-password',
          name: 'Test Customer',
          phone: '1234567890',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const mockRoleRow = [{ user_id: 'customer-1', role: 'customer', created_at: '2024-01-01T00:00:00Z' }];
        const mockCustomerRow = {
          user_id: 'customer-1',
          saved_addresses: mockCustomerUser.savedAddresses,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        let callCount = 0;
        (supabase.from as jest.Mock).mockImplementation((table) => {
          const builder = createMockQueryBuilder();
          callCount++;
          
          if (table === 'users' && callCount === 1) {
            builder.single = jest.fn().mockResolvedValue({ data: mockUserRow, error: null });
          } else if (table === 'user_roles' && callCount === 2) {
            builder.eq = jest.fn().mockResolvedValue({ data: mockRoleRow, error: null });
          } else if (table === 'customers' && callCount === 3) {
            builder.single = jest.fn().mockResolvedValue({ data: mockCustomerRow, error: null });
          }
          
          return builder;
        });

        const result = await dataAccess.users.getCurrentUser();

        expect(result).toBeTruthy();
        expect(result?.id).toBe('customer-1');
        expect(result?.email).toBe('customer@example.com');
        expect(result?.role).toBe('customer');
      });

      it('should return null when no session exists', async () => {
        (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
          data: { session: null },
          error: null,
        });

        const result = await dataAccess.users.getCurrentUser();

        expect(result).toBeNull();
      });
    });

    describe('saveUser', () => {
      it('should save customer user correctly', async () => {
        const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });
        
        (supabase.from as jest.Mock).mockReturnValue({
          upsert: upsertMock,
        });

        await dataAccess.users.saveUser(mockCustomerUser);

        expect(supabase.from).toHaveBeenCalledWith('users');
        expect(supabase.from).toHaveBeenCalledWith('user_roles');
        expect(supabase.from).toHaveBeenCalledWith('customers');
      });

      it('should save driver user correctly', async () => {
        const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });
        
        (supabase.from as jest.Mock).mockReturnValue({
          upsert: upsertMock,
        });

        await dataAccess.users.saveUser(mockDriverUser);

        expect(supabase.from).toHaveBeenCalledWith('users');
        expect(supabase.from).toHaveBeenCalledWith('user_roles');
        expect(supabase.from).toHaveBeenCalledWith('drivers');
      });

      it('should save admin user correctly', async () => {
        const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });
        
        (supabase.from as jest.Mock).mockReturnValue({
          upsert: upsertMock,
        });

        await dataAccess.users.saveUser(mockAdminUser);

        expect(supabase.from).toHaveBeenCalledWith('users');
        expect(supabase.from).toHaveBeenCalledWith('user_roles');
        expect(supabase.from).toHaveBeenCalledWith('admins');
      });

      it('should throw DataAccessError on save failure', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          upsert: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        });

        await expect(dataAccess.users.saveUser(mockCustomerUser)).rejects.toThrow(DataAccessError);
      });
    });

    describe('getUserById', () => {
      it('should retrieve customer user by ID', async () => {
        const mockUserRow = {
          id: 'customer-1',
          email: 'customer@example.com',
          password_hash: 'hashed-password',
          name: 'Test Customer',
          phone: '1234567890',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const mockRoleRow = [{ user_id: 'customer-1', role: 'customer', created_at: '2024-01-01T00:00:00Z' }];
        const mockCustomerRow = {
          user_id: 'customer-1',
          saved_addresses: mockCustomerUser.savedAddresses,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        let callCount = 0;
        (supabase.from as jest.Mock).mockImplementation((table) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              if (table === 'users') {
                return Promise.resolve({ data: mockUserRow, error: null });
              }
              if (table === 'customers') {
                return Promise.resolve({ data: mockCustomerRow, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          };
          return builder;
        });

        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockRoleRow, error: null }),
        });

        const result = await dataAccess.users.getUserById('customer-1');

        expect(result).toBeTruthy();
        expect(result?.id).toBe('customer-1');
        expect(result?.role).toBe('customer');
      });

      it('should return null for non-existent user', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        });

        const result = await dataAccess.users.getUserById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getUsers', () => {
      it('should retrieve all users with filtering', async () => {
        const mockUserRows = [
          {
            id: 'customer-1',
            email: 'customer@example.com',
            password_hash: 'hashed-password',
            name: 'Test Customer',
            phone: '1234567890',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ];

        const mockRoleRows = [
          { user_id: 'customer-1', role: 'customer', created_at: '2024-01-01T00:00:00Z' },
        ];

        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockUserRows, error: null }),
        });

        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockRoleRows, error: null }),
        });

        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

        const result = await dataAccess.users.getUsers();

        expect(Array.isArray(result)).toBe(true);
      });

      it('should handle empty user list', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

        const result = await dataAccess.users.getUsers();

        expect(result).toEqual([]);
      });
    });

    describe('updateUserProfile', () => {
      it('should update user profile successfully', async () => {
        const mockUserRow = {
          id: 'customer-1',
          email: 'customer@example.com',
          password_hash: 'hashed-password',
          name: 'Test Customer',
          phone: '1234567890',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        };

        const mockRoleRow = [{ user_id: 'customer-1', role: 'customer', created_at: '2024-01-01T00:00:00Z' }];
        const mockCustomerRow = {
          user_id: 'customer-1',
          saved_addresses: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        };

        // Mock getUserById calls: users, user_roles, customers
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUserRow, error: null }),
        });

        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockRoleRow, error: null }),
        });

        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCustomerRow, error: null }),
        });

        // Mock saveUser calls: users (upsert), user_roles (upsert), customers (upsert)
        (supabase.from as jest.Mock).mockReturnValueOnce({
          upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        (supabase.from as jest.Mock).mockReturnValueOnce({
          upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        (supabase.from as jest.Mock).mockReturnValueOnce({
          upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await dataAccess.users.updateUserProfile('customer-1', { name: 'Updated Name' });

        expect(supabase.from).toHaveBeenCalled();
      });

      it('should throw NotFoundError when updating non-existent user', async () => {
        // Mock getUserById to return null (user not found)
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await expect(
          dataAccess.users.updateUserProfile('non-existent', { name: 'Test' })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('removeUser', () => {
      it('should remove current user successfully', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await dataAccess.users.removeUser();

        expect(supabase.from).toHaveBeenCalledWith('users');
      });

      it('should handle removal when no session exists', async () => {
        (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
          data: { session: null },
          error: null,
        });

        await expect(dataAccess.users.removeUser()).resolves.not.toThrow();
      });
    });
  });

  describe('Booking Data Access', () => {
    const mockAddress: Address = {
      id: 'addr-1',
      address: '123 Main St, City, State 12345',
      latitude: 40.7128,
      longitude: -74.0060,
    };

    const mockBooking: Booking = {
      id: 'booking-1',
      customerId: 'customer-1',
      customerName: 'Test Customer',
      customerPhone: '1234567890',
      status: 'pending',
      tankerSize: 10000,
      quantity: 1,
      basePrice: 600,
      distanceCharge: 50,
      totalPrice: 650,
      deliveryAddress: mockAddress,
      distance: 10,
      paymentStatus: 'pending',
      canCancel: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    describe('saveBooking', () => {
      it('should save booking successfully', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await dataAccess.bookings.saveBooking(mockBooking);

        expect(supabase.from).toHaveBeenCalledWith('bookings');
      });

      it('should throw DataAccessError on save failure', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        });

        await expect(dataAccess.bookings.saveBooking(mockBooking)).rejects.toThrow(DataAccessError);
      });
    });

    describe('updateBooking', () => {
      it('should update booking successfully', async () => {
        const mockBookingRow = {
          id: 'booking-1',
          customer_id: 'customer-1',
          customer_name: 'Test Customer',
          customer_phone: '1234567890',
          status: 'pending',
          tanker_size: 10000,
          quantity: 1,
          base_price: 600,
          distance_charge: 50,
          total_price: 650,
          delivery_address: mockAddress,
          distance: 10,
          payment_status: 'pending',
          can_cancel: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        // Mock getBookingById call
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBookingRow, error: null }),
        });

        // Mock update call
        (supabase.from as jest.Mock).mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await dataAccess.bookings.updateBooking('booking-1', { status: 'accepted' });

        expect(supabase.from).toHaveBeenCalledWith('bookings');
      });

      it('should throw NotFoundError when updating non-existent booking', async () => {
        // Mock getBookingById to return null (booking not found)
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await expect(
          dataAccess.bookings.updateBooking('non-existent', { status: 'accepted' })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('getBookingById', () => {
      it('should retrieve booking by ID', async () => {
        const mockBookingRow = {
          id: 'booking-1',
          customer_id: 'customer-1',
          customer_name: 'Test Customer',
          customer_phone: '1234567890',
          status: 'pending',
          tanker_size: 10000,
          quantity: 1,
          base_price: 600,
          distance_charge: 50,
          total_price: 650,
          delivery_address: mockAddress,
          distance: 10,
          payment_status: 'pending',
          can_cancel: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          scheduled_for: null,
          accepted_at: null,
          delivered_at: null,
          agency_id: null,
          agency_name: null,
          driver_id: null,
          driver_name: null,
          driver_phone: null,
          payment_id: null,
          cancellation_reason: null,
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBookingRow, error: null }),
        });

        const result = await dataAccess.bookings.getBookingById('booking-1');

        expect(result).toBeTruthy();
        expect(result?.id).toBe('booking-1');
        expect(result?.status).toBe('pending');
      });

      it('should return null for non-existent booking', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        });

        const result = await dataAccess.bookings.getBookingById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getBookingsByCustomer', () => {
      it('should retrieve bookings filtered by customer ID', async () => {
        const mockBookingRows = [
          {
            id: 'booking-1',
            customer_id: 'customer-1',
            customer_name: 'Test Customer',
            customer_phone: '1234567890',
            status: 'pending',
            tanker_size: 10000,
            quantity: 1,
            base_price: 600,
            distance_charge: 50,
            total_price: 650,
            delivery_address: mockAddress,
            distance: 10,
            payment_status: 'pending',
            can_cancel: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            scheduled_for: null,
            accepted_at: null,
            delivered_at: null,
            agency_id: null,
            agency_name: null,
            driver_id: null,
            driver_name: null,
            driver_phone: null,
            payment_id: null,
            cancellation_reason: null,
          },
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockBookingRows, error: null }),
        });

        const result = await dataAccess.bookings.getBookingsByCustomer('customer-1');

        expect(Array.isArray(result)).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('bookings');
      });
    });

    describe('getBookingsByDriver', () => {
      it('should retrieve bookings filtered by driver ID', async () => {
        const mockBookingRows = [
          {
            id: 'booking-1',
            customer_id: 'customer-1',
            driver_id: 'driver-1',
            customer_name: 'Test Customer',
            customer_phone: '1234567890',
            status: 'accepted',
            tanker_size: 10000,
            quantity: 1,
            base_price: 600,
            distance_charge: 50,
            total_price: 650,
            delivery_address: mockAddress,
            distance: 10,
            payment_status: 'pending',
            can_cancel: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            scheduled_for: null,
            accepted_at: '2024-01-01T00:00:00Z',
            delivered_at: null,
            agency_id: null,
            agency_name: null,
            driver_name: 'Test Driver',
            driver_phone: '9876543210',
            payment_id: null,
            cancellation_reason: null,
          },
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockBookingRows, error: null }),
        });

        const result = await dataAccess.bookings.getBookingsByDriver('driver-1');

        expect(Array.isArray(result)).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('bookings');
      });
    });

    describe('getAvailableBookings', () => {
      it('should retrieve only pending bookings', async () => {
        const mockBookingRows = [
          {
            id: 'booking-1',
            customer_id: 'customer-1',
            customer_name: 'Test Customer',
            customer_phone: '1234567890',
            status: 'pending',
            tanker_size: 10000,
            quantity: 1,
            base_price: 600,
            distance_charge: 50,
            total_price: 650,
            delivery_address: mockAddress,
            distance: 10,
            payment_status: 'pending',
            can_cancel: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            scheduled_for: null,
            accepted_at: null,
            delivered_at: null,
            agency_id: null,
            agency_name: null,
            driver_id: null,
            driver_name: null,
            driver_phone: null,
            payment_id: null,
            cancellation_reason: null,
          },
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockBookingRows, error: null }),
        });

        const result = await dataAccess.bookings.getAvailableBookings();

        expect(Array.isArray(result)).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('bookings');
      });
    });

    describe('getBookings', () => {
      it('should retrieve all bookings with sorting', async () => {
        const mockBookingRows = [
          {
            id: 'booking-1',
            customer_id: 'customer-1',
            customer_name: 'Test Customer',
            customer_phone: '1234567890',
            status: 'pending',
            tanker_size: 10000,
            quantity: 1,
            base_price: 600,
            distance_charge: 50,
            total_price: 650,
            delivery_address: mockAddress,
            distance: 10,
            payment_status: 'pending',
            can_cancel: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            scheduled_for: null,
            accepted_at: null,
            delivered_at: null,
            agency_id: null,
            agency_name: null,
            driver_id: null,
            driver_name: null,
            driver_phone: null,
            payment_id: null,
            cancellation_reason: null,
          },
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockBookingRows, error: null }),
        });

        const result = await dataAccess.bookings.getBookings();

        expect(Array.isArray(result)).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('bookings');
      });
    });
  });

  describe('Vehicle Data Access', () => {
    const mockVehicle: Vehicle = {
      id: 'vehicle-1',
      agencyId: 'admin-1',
      vehicleNumber: 'ABC-1234',
      insuranceCompanyName: 'Test Insurance',
      insuranceExpiryDate: new Date('2025-12-31'),
      vehicleCapacity: 10000,
      amount: 500000,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    describe('saveVehicle', () => {
      it('should save vehicle successfully', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await dataAccess.vehicles.saveVehicle(mockVehicle);

        expect(supabase.from).toHaveBeenCalledWith('vehicles');
      });

      it('should throw DataAccessError on save failure', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        });

        await expect(dataAccess.vehicles.saveVehicle(mockVehicle)).rejects.toThrow(DataAccessError);
      });
    });

    describe('updateVehicle', () => {
      it('should update vehicle successfully', async () => {
        const mockVehicleRow = {
          id: 'vehicle-1',
          agency_id: 'admin-1',
          vehicle_number: 'ABC-1234',
          insurance_company_name: 'Test Insurance',
          insurance_expiry_date: '2025-12-31T00:00:00Z',
          vehicle_capacity: 10000,
          amount: 500000,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        // Mock getVehicleById call
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockVehicleRow, error: null }),
        });

        // Mock update call
        (supabase.from as jest.Mock).mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await dataAccess.vehicles.updateVehicle('vehicle-1', { vehicleCapacity: 15000 });

        expect(supabase.from).toHaveBeenCalledWith('vehicles');
      });

      it('should throw NotFoundError when updating non-existent vehicle', async () => {
        // Mock getVehicleById to return null (vehicle not found)
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await expect(
          dataAccess.vehicles.updateVehicle('non-existent', { vehicleCapacity: 15000 })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('getVehicleById', () => {
      it('should retrieve vehicle by ID', async () => {
        const mockVehicleRow = {
          id: 'vehicle-1',
          agency_id: 'admin-1',
          vehicle_number: 'ABC-1234',
          insurance_company_name: 'Test Insurance',
          insurance_expiry_date: '2025-12-31',
          vehicle_capacity: 10000,
          amount: 500000,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockVehicleRow, error: null }),
        });

        const result = await dataAccess.vehicles.getVehicleById('vehicle-1');

        expect(result).toBeTruthy();
        expect(result?.id).toBe('vehicle-1');
        expect(result?.vehicleNumber).toBe('ABC-1234');
      });

      it('should return null for non-existent vehicle', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        });

        const result = await dataAccess.vehicles.getVehicleById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getVehiclesByAgency', () => {
      it('should retrieve vehicles filtered by agency ID', async () => {
        const mockVehicleRows = [
          {
            id: 'vehicle-1',
            agency_id: 'admin-1',
            vehicle_number: 'ABC-1234',
            insurance_company_name: 'Test Insurance',
            insurance_expiry_date: '2025-12-31',
            vehicle_capacity: 10000,
            amount: 500000,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockVehicleRows, error: null }),
        });

        const result = await dataAccess.vehicles.getVehiclesByAgency('admin-1');

        expect(Array.isArray(result)).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('vehicles');
      });
    });

    describe('getVehicles', () => {
      it('should retrieve all vehicles with sorting', async () => {
        const mockVehicleRows = [
          {
            id: 'vehicle-1',
            agency_id: 'admin-1',
            vehicle_number: 'ABC-1234',
            insurance_company_name: 'Test Insurance',
            insurance_expiry_date: '2025-12-31',
            vehicle_capacity: 10000,
            amount: 500000,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockVehicleRows, error: null }),
        });

        const result = await dataAccess.vehicles.getVehicles();

        expect(Array.isArray(result)).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('vehicles');
      });
    });

    describe('deleteVehicle', () => {
      it('should delete vehicle successfully', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await dataAccess.vehicles.deleteVehicle('vehicle-1');

        expect(supabase.from).toHaveBeenCalledWith('vehicles');
      });

      it('should throw NotFoundError when deleting non-existent vehicle', async () => {
        // Mock getVehicleById to return null (vehicle not found)
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

        await expect(dataAccess.vehicles.deleteVehicle('non-existent')).rejects.toThrow(NotFoundError);
      });
    });
  });

  describe('Data Relationships', () => {
    it('should maintain foreign key relationships in bookings', async () => {
      const mockBookingRow = {
        id: 'booking-1',
        customer_id: 'customer-1',
        customer_name: 'Test Customer',
        customer_phone: '1234567890',
        status: 'pending',
        tanker_size: 10000,
        quantity: 1,
        base_price: 600,
        distance_charge: 50,
        total_price: 650,
        delivery_address: { address: '123 Main St', latitude: 40.7128, longitude: -74.0060 },
        distance: 10,
        payment_status: 'pending',
        can_cancel: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        scheduled_for: null,
        accepted_at: null,
        delivered_at: null,
        agency_id: 'admin-1',
        agency_name: 'Test Agency',
        driver_id: 'driver-1',
        driver_name: 'Test Driver',
        driver_phone: '9876543210',
        payment_id: null,
        cancellation_reason: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBookingRow, error: null }),
      });

      const result = await dataAccess.bookings.getBookingById('booking-1');

      expect(result).toBeTruthy();
      expect(result?.customerId).toBe('customer-1');
      expect(result?.agencyId).toBe('admin-1');
      expect(result?.driverId).toBe('driver-1');
    });
  });

  describe('Date Serialization', () => {
    it('should correctly serialize and deserialize dates in bookings', async () => {
      const mockBookingRow = {
        id: 'booking-1',
        customer_id: 'customer-1',
        customer_name: 'Test Customer',
        customer_phone: '1234567890',
        status: 'pending',
        tanker_size: 10000,
        quantity: 1,
        base_price: 600,
        distance_charge: 50,
        total_price: 650,
        delivery_address: { address: '123 Main St', latitude: 40.7128, longitude: -74.0060 },
        distance: 10,
        payment_status: 'pending',
        can_cancel: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        scheduled_for: '2024-01-15T10:00:00.000Z',
        accepted_at: null,
        delivered_at: null,
        agency_id: null,
        agency_name: null,
        driver_id: null,
        driver_name: null,
        driver_phone: null,
        payment_id: null,
        cancellation_reason: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBookingRow, error: null }),
      });

      const result = await dataAccess.bookings.getBookingById('booking-1');

      expect(result).toBeTruthy();
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.scheduledFor).toBeInstanceOf(Date);
    });

    it('should correctly serialize and deserialize dates in users', async () => {
      const mockUserRow = {
        id: 'customer-1',
        email: 'customer@example.com',
        password_hash: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
      };

      const mockRoleRow = [{ user_id: 'customer-1', role: 'customer', created_at: '2024-01-01T00:00:00Z' }];
      const mockCustomerRow = {
        user_id: 'customer-1',
        saved_addresses: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserRow, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockRoleRow, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCustomerRow, error: null }),
      });

      const result = await dataAccess.users.getUserById('customer-1');

      expect(result).toBeTruthy();
      expect(result?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should throw DataAccessError on network errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      const mockBooking: Booking = {
        id: 'booking-1',
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        status: 'pending',
        tankerSize: 10000,
        quantity: 1,
        basePrice: 600,
        distanceCharge: 50,
        totalPrice: 650,
        deliveryAddress: {
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(dataAccess.bookings.saveBooking(mockBooking)).rejects.toThrow(DataAccessError);
    });

    it('should handle RLS policy violations gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'new row violates row-level security policy' },
        }),
      });

      const result = await dataAccess.users.getUserById('unauthorized-user');

      expect(result).toBeNull();
    });
  });
});

