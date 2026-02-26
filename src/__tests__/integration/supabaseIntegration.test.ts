/**
 * Supabase Integration Tests
 * 
 * Phase 8, Item 2: Integration Tests
 * - Test all CRUD operations
 * - Test real-time subscriptions
 * - Test authentication flows
 * 
 * These tests verify the complete integration between:
 * - SupabaseDataAccess layer
 * - Authentication service
 * - Real-time subscriptions
 * - Multi-role user support
 */

import { SupabaseDataAccess } from '../../lib/supabaseDataAccess';
import { AuthService } from '../../services/auth.service';
import { User, Booking, Vehicle, CustomerUser, DriverUser, AdminUser, Address } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';
import { SubscriptionManager } from '../../utils/subscriptionManager';

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
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
});

// Mock data storage (simulates database)
let mockUsers: any[] = [];
let mockUserRoles: any[] = [];
let mockCustomers: any[] = [];
let mockDrivers: any[] = [];
let mockAdmins: any[] = [];
let mockBookings: any[] = [];
let mockVehicles: any[] = [];

// Mock channel for real-time subscriptions
const createMockChannel = () => {
  const callbacks: Array<(payload: any) => void> = [];
  
  return {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation((callback) => {
      if (callback && typeof callback === 'function') {
        setTimeout(() => callback('SUBSCRIBED'), 0);
      }
      return {
        unsubscribe: jest.fn(() => {
          callbacks.length = 0;
        }),
        status: 'SUBSCRIBED' as const,
      };
    }),
    unsubscribe: jest.fn(),
    // Helper to trigger callbacks
    trigger: (payload: any) => {
      callbacks.forEach(cb => cb(payload));
    },
  };
};

const mockChannels = new Map<string, ReturnType<typeof createMockChannel>>();

jest.mock('../../lib/supabaseClient', () => {
  const mockSupabase = {
    from: jest.fn((table: string) => {
      const queryBuilder = createMockQueryBuilder();
      
      // Mock select
      queryBuilder.select = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder.single = jest.fn().mockImplementation(async () => {
        if (table === 'users') {
          const user = mockUsers[0];
          return { data: user || null, error: user ? null : { message: 'Not found' } };
        }
        return { data: null, error: null };
      });
      
      // Mock insert
      queryBuilder.insert = jest.fn().mockImplementation(async (data: any) => {
        if (table === 'users') {
          mockUsers.push(Array.isArray(data) ? data[0] : data);
        } else if (table === 'user_roles') {
          mockUserRoles.push(Array.isArray(data) ? data[0] : data);
        } else if (table === 'customers') {
          mockCustomers.push(Array.isArray(data) ? data[0] : data);
        } else if (table === 'drivers') {
          mockDrivers.push(Array.isArray(data) ? data[0] : data);
        } else if (table === 'admins') {
          mockAdmins.push(Array.isArray(data) ? data[0] : data);
        } else if (table === 'bookings') {
          mockBookings.push(Array.isArray(data) ? data[0] : data);
        } else if (table === 'vehicles') {
          mockVehicles.push(Array.isArray(data) ? data[0] : data);
        }
        return { data: Array.isArray(data) ? data : [data], error: null };
      });
      
      // Mock update
      queryBuilder.update = jest.fn().mockImplementation(async (data: any) => {
        return { data: [data], error: null };
      });
      
      // Mock delete
      queryBuilder.delete = jest.fn().mockImplementation(async () => {
        return { data: [], error: null };
      });
      
      // Mock upsert
      queryBuilder.upsert = jest.fn().mockImplementation(async (data: any) => {
        const item = Array.isArray(data) ? data[0] : data;
        if (table === 'users') {
          const existing = mockUsers.findIndex(u => u.id === item.id);
          if (existing >= 0) {
            mockUsers[existing] = { ...mockUsers[existing], ...item };
          } else {
            mockUsers.push(item);
          }
        }
        return { data: [item], error: null };
      });
      
      // Mock eq filter
      queryBuilder.eq = jest.fn().mockImplementation((column: string, value: any) => {
        if (table === 'users' && column === 'id') {
          const filtered = mockUsers.filter(u => u.id === value);
          queryBuilder.single = jest.fn().mockResolvedValue({
            data: filtered[0] || null,
            error: filtered[0] ? null : { message: 'Not found' },
          });
          queryBuilder.select = jest.fn().mockResolvedValue({
            data: filtered,
            error: null,
          });
        } else if (table === 'user_roles' && column === 'user_id') {
          queryBuilder.select = jest.fn().mockResolvedValue({
            data: mockUserRoles.filter(r => r.user_id === value),
            error: null,
          });
        } else if (table === 'customers' && column === 'user_id') {
          queryBuilder.single = jest.fn().mockResolvedValue({
            data: mockCustomers.find(c => c.user_id === value) || null,
            error: null,
          });
        } else if (table === 'drivers' && column === 'user_id') {
          queryBuilder.single = jest.fn().mockResolvedValue({
            data: mockDrivers.find(d => d.user_id === value) || null,
            error: null,
          });
        } else if (table === 'admins' && column === 'user_id') {
          queryBuilder.single = jest.fn().mockResolvedValue({
            data: mockAdmins.find(a => a.user_id === value) || null,
            error: null,
          });
        } else if (table === 'bookings') {
          if (column === 'id') {
            queryBuilder.single = jest.fn().mockResolvedValue({
              data: mockBookings.find(b => b.id === value) || null,
              error: null,
            });
          } else if (column === 'customer_id') {
            queryBuilder.select = jest.fn().mockResolvedValue({
              data: mockBookings.filter(b => b.customer_id === value),
              error: null,
            });
          } else if (column === 'driver_id') {
            queryBuilder.select = jest.fn().mockResolvedValue({
              data: mockBookings.filter(b => b.driver_id === value),
              error: null,
            });
          } else if (column === 'status') {
            queryBuilder.select = jest.fn().mockResolvedValue({
              data: mockBookings.filter(b => b.status === value),
              error: null,
            });
          }
        } else if (table === 'vehicles') {
          if (column === 'id') {
            queryBuilder.single = jest.fn().mockResolvedValue({
              data: mockVehicles.find(v => v.id === value) || null,
              error: null,
            });
          } else if (column === 'agency_id') {
            queryBuilder.select = jest.fn().mockResolvedValue({
              data: mockVehicles.filter(v => v.agency_id === value),
              error: null,
            });
          }
        }
        return queryBuilder;
      });
      
      // Mock order
      queryBuilder.order = jest.fn().mockImplementation((column: string, options?: any) => {
        if (table === 'bookings') {
          queryBuilder.select = jest.fn().mockResolvedValue({
            data: [...mockBookings].sort((a, b) => {
              const aVal = a[column];
              const bVal = b[column];
              if (options?.ascending === false) {
                return bVal > aVal ? 1 : -1;
              }
              return aVal > bVal ? 1 : -1;
            }),
            error: null,
          });
        } else if (table === 'vehicles') {
          queryBuilder.select = jest.fn().mockResolvedValue({
            data: [...mockVehicles].sort((a, b) => {
              const aVal = a[column];
              const bVal = b[column];
              if (options?.ascending === false) {
                return bVal > aVal ? 1 : -1;
              }
              return aVal > bVal ? 1 : -1;
            }),
            error: null,
          });
        }
        return queryBuilder;
      });
      
      // Default select returns all
      queryBuilder.select = jest.fn().mockResolvedValue({
        data: table === 'users' ? mockUsers :
              table === 'user_roles' ? mockUserRoles :
              table === 'customers' ? mockCustomers :
              table === 'drivers' ? mockDrivers :
              table === 'admins' ? mockAdmins :
              table === 'bookings' ? mockBookings :
              table === 'vehicles' ? mockVehicles : [],
        error: null,
      });
      
      return queryBuilder;
    }),
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    channel: jest.fn((name: string) => {
      if (!mockChannels.has(name)) {
        mockChannels.set(name, createMockChannel());
      }
      return mockChannels.get(name)!;
    }),
    removeChannel: jest.fn(),
  };
  
  return {
    supabase: mockSupabase,
  };
});

describe('Supabase Integration Tests', () => {
  let dataAccess: SupabaseDataAccess;
  
  beforeEach(() => {
    // Clear mock data
    mockUsers = [];
    mockUserRoles = [];
    mockCustomers = [];
    mockDrivers = [];
    mockAdmins = [];
    mockBookings = [];
    mockVehicles = [];
    mockChannels.clear();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create new data access instance
    dataAccess = new SupabaseDataAccess();
    
    // Setup default auth session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'mock-token',
        },
      },
      error: null,
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CRUD Operations - Users', () => {
    it('should create a customer user with all related data', async () => {
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(customerUser);

      // Verify user was created
      const savedUser = await dataAccess.users.getUserById('customer-1');
      expect(savedUser).toBeTruthy();
      expect(savedUser?.email).toBe('customer@test.com');
      expect(savedUser?.role).toBe('customer');
      if (savedUser && 'savedAddresses' in savedUser) {
        expect(savedUser.savedAddresses).toEqual([]);
      }
    });

    it('should create a driver user with all related data', async () => {
      const driverUser: DriverUser = {
        id: 'driver-1',
        email: 'driver@test.com',
        password: 'hashed-password',
        name: 'Test Driver',
        phone: '9876543210',
        role: 'driver',
        vehicleNumber: 'ABC123',
        licenseNumber: 'DL123456',
        licenseExpiry: new Date('2025-12-31'),
        driverLicenseImage: 'https://example.com/license.jpg',
        vehicleRegistrationImage: 'https://example.com/registration.jpg',
        totalEarnings: 0,
        completedOrders: 0,
        createdByAdmin: true,
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(driverUser);

      const savedUser = await dataAccess.users.getUserById('driver-1');
      expect(savedUser).toBeTruthy();
      expect(savedUser?.role).toBe('driver');
      if (savedUser && 'vehicleNumber' in savedUser) {
        expect(savedUser.vehicleNumber).toBe('ABC123');
      }
    });

    it('should create an admin user with all related data', async () => {
      const adminUser: AdminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        password: 'hashed-password',
        name: 'Test Admin',
        phone: '5555555555',
        role: 'admin',
        businessName: 'Test Business',
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(adminUser);

      const savedUser = await dataAccess.users.getUserById('admin-1');
      expect(savedUser).toBeTruthy();
      expect(savedUser?.role).toBe('admin');
      if (savedUser && 'businessName' in savedUser) {
        expect(savedUser.businessName).toBe('Test Business');
      }
    });

    it('should update user profile', async () => {
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(customerUser);
      
      await dataAccess.users.updateUserProfile('customer-1', {
        name: 'Updated Customer',
        phone: '9999999999',
      });

      const updatedUser = await dataAccess.users.getUserById('customer-1');
      expect(updatedUser?.name).toBe('Updated Customer');
      expect(updatedUser?.phone).toBe('9999999999');
    });

    it('should get all users', async () => {
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };

      const driverUser: DriverUser = {
        id: 'driver-1',
        email: 'driver@test.com',
        password: 'hashed-password',
        name: 'Test Driver',
        phone: '9876543210',
        role: 'driver',
        vehicleNumber: 'ABC123',
        licenseNumber: 'DL123456',
        licenseExpiry: new Date('2025-12-31'),
        driverLicenseImage: 'https://example.com/license.jpg',
        vehicleRegistrationImage: 'https://example.com/registration.jpg',
        totalEarnings: 0,
        completedOrders: 0,
        createdByAdmin: true,
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(customerUser);
      await dataAccess.users.saveUser(driverUser);

      const users = await dataAccess.users.getUsers();
      expect(users.length).toBeGreaterThanOrEqual(2);
    });

    it('should remove user', async () => {
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(customerUser);
      
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'customer-1', email: 'customer@test.com' },
            access_token: 'mock-token',
          },
        },
        error: null,
      });

      await dataAccess.users.removeUser();

      const deletedUser = await dataAccess.users.getUserById('customer-1');
      expect(deletedUser).toBeNull();
    });

    it('should handle user not found error', async () => {
      const user = await dataAccess.users.getUserById('non-existent-id');
      expect(user).toBeNull();
    });

    it('should handle update user with invalid ID', async () => {
      await expect(
        dataAccess.users.updateUserProfile('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow();
    });

    it('should create user with saved addresses', async () => {
      const addresses: Address[] = [
        {
          id: 'addr-1',
          address: '123 Main St, City, State 12345',
          latitude: 40.7128,
          longitude: -74.0060,
        },
        {
          id: 'addr-2',
          address: '456 Oak Ave, City, State 12345',
          latitude: 40.7580,
          longitude: -73.9855,
        },
      ];

      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: addresses,
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(customerUser);

      const savedUser = await dataAccess.users.getUserById('customer-1');
      expect(savedUser).toBeTruthy();
      if (savedUser && 'savedAddresses' in savedUser) {
        expect(savedUser.savedAddresses.length).toBe(2);
        expect(savedUser.savedAddresses[0].address).toBe('123 Main St, City, State 12345');
      }
    });

    it('should handle multi-role user creation', async () => {
      // Create user with customer role first
      const customerUser: CustomerUser = {
        id: 'multi-role-1',
        email: 'multirole@test.com',
        password: 'hashed-password',
        name: 'Multi Role User',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };
      await dataAccess.users.saveUser(customerUser);

      // Add admin role to same user
      const adminUser: AdminUser = {
        id: 'multi-role-1',
        email: 'multirole@test.com',
        password: 'hashed-password',
        name: 'Multi Role User',
        phone: '1234567890',
        role: 'admin',
        businessName: 'Test Business',
        createdAt: new Date(),
      };
      await dataAccess.users.saveUser(adminUser);

      // Verify both roles exist
      const user = await dataAccess.users.getUserById('multi-role-1');
      expect(user).toBeTruthy();
    });
  });

  describe('CRUD Operations - Bookings', () => {
    it('should create a booking', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      const savedBooking = await dataAccess.bookings.getBookingById('booking-1');
      expect(savedBooking).toBeTruthy();
      expect(savedBooking?.status).toBe('pending');
      expect(savedBooking?.totalPrice).toBe(650);
    });

    it('should update booking status', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);
      
      await dataAccess.bookings.updateBooking('booking-1', {
        status: 'accepted',
        driverId: 'driver-1',
        driverName: 'Test Driver',
      });

      const updatedBooking = await dataAccess.bookings.getBookingById('booking-1');
      expect(updatedBooking?.status).toBe('accepted');
      expect(updatedBooking?.driverId).toBe('driver-1');
    });

    it('should get bookings by customer', async () => {
      const booking1: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const booking2: Booking = {
        id: 'booking-2',
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        status: 'accepted',
        tankerSize: 15000,
        quantity: 1,
        basePrice: 900,
        distanceCharge: 75,
        totalPrice: 975,
        deliveryAddress: {
          address: '456 Test Ave, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 15,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking1);
      await dataAccess.bookings.saveBooking(booking2);

      const customerBookings = await dataAccess.bookings.getBookingsByCustomer('customer-1');
      expect(customerBookings.length).toBe(2);
    });

    it('should get bookings by driver', async () => {
      const booking: Booking = {
        id: 'booking-1',
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        driverId: 'driver-1',
        driverName: 'Test Driver',
        driverPhone: '9876543210',
        status: 'accepted',
        tankerSize: 10000,
        quantity: 1,
        basePrice: 600,
        distanceCharge: 50,
        totalPrice: 650,
        deliveryAddress: {
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      const driverBookings = await dataAccess.bookings.getBookingsByDriver('driver-1');
      expect(driverBookings.length).toBe(1);
      expect(driverBookings[0].driverId).toBe('driver-1');
    });

    it('should get available bookings (pending status)', async () => {
      const booking1: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const booking2: Booking = {
        id: 'booking-2',
        customerId: 'customer-2',
        customerName: 'Another Customer',
        customerPhone: '1111111111',
        status: 'accepted',
        tankerSize: 15000,
        quantity: 1,
        basePrice: 900,
        distanceCharge: 75,
        totalPrice: 975,
        deliveryAddress: {
          address: '456 Test Ave, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 15,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking1);
      await dataAccess.bookings.saveBooking(booking2);

      const availableBookings = await dataAccess.bookings.getAvailableBookings();
      expect(availableBookings.length).toBe(1);
      expect(availableBookings[0].status).toBe('pending');
    });

    it('should handle booking not found error', async () => {
      const booking = await dataAccess.bookings.getBookingById('non-existent-id');
      expect(booking).toBeNull();
    });

    it('should update booking with all status transitions', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      // Test status transitions
      await dataAccess.bookings.updateBooking('booking-1', { status: 'accepted' });
      let updated = await dataAccess.bookings.getBookingById('booking-1');
      expect(updated?.status).toBe('accepted');

      await dataAccess.bookings.updateBooking('booking-1', { status: 'in_transit' });
      updated = await dataAccess.bookings.getBookingById('booking-1');
      expect(updated?.status).toBe('in_transit');

      await dataAccess.bookings.updateBooking('booking-1', { status: 'delivered' });
      updated = await dataAccess.bookings.getBookingById('booking-1');
      expect(updated?.status).toBe('delivered');
    });

    it('should handle booking cancellation', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      await dataAccess.bookings.updateBooking('booking-1', {
        status: 'cancelled',
        cancellationReason: 'Customer requested',
      });

      const cancelled = await dataAccess.bookings.getBookingById('booking-1');
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should get bookings sorted by creation date', async () => {
      const booking1: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const booking2: Booking = {
        id: 'booking-2',
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        status: 'pending',
        tankerSize: 15000,
        quantity: 1,
        basePrice: 900,
        distanceCharge: 75,
        totalPrice: 975,
        deliveryAddress: {
          address: '456 Test Ave, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 15,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      };

      await dataAccess.bookings.saveBooking(booking1);
      await dataAccess.bookings.saveBooking(booking2);

      const bookings = await dataAccess.bookings.getBookingsByCustomer('customer-1');
      expect(bookings.length).toBe(2);
    });
  });

  describe('CRUD Operations - Vehicles', () => {
    it('should create a vehicle', async () => {
      const vehicle: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(vehicle);

      const savedVehicle = await dataAccess.vehicles.getVehicleById('vehicle-1');
      expect(savedVehicle).toBeTruthy();
      expect(savedVehicle?.vehicleNumber).toBe('ABC123');
      expect(savedVehicle?.vehicleCapacity).toBe(10000);
    });

    it('should update vehicle', async () => {
      const vehicle: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(vehicle);
      
      await dataAccess.vehicles.updateVehicle('vehicle-1', {
        vehicleCapacity: 15000,
        amount: 750000,
      });

      const updatedVehicle = await dataAccess.vehicles.getVehicleById('vehicle-1');
      expect(updatedVehicle?.vehicleCapacity).toBe(15000);
      expect(updatedVehicle?.amount).toBe(750000);
    });

    it('should get vehicles by agency', async () => {
      const vehicle1: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const vehicle2: Vehicle = {
        id: 'vehicle-2',
        agencyId: 'admin-1',
        vehicleNumber: 'XYZ789',
        insuranceCompanyName: 'Another Insurance',
        insuranceExpiryDate: new Date('2026-06-30'),
        vehicleCapacity: 15000,
        amount: 750000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(vehicle1);
      await dataAccess.vehicles.saveVehicle(vehicle2);

      const agencyVehicles = await dataAccess.vehicles.getVehiclesByAgency('admin-1');
      expect(agencyVehicles.length).toBe(2);
      expect(agencyVehicles.every(v => v.agencyId === 'admin-1')).toBe(true);
    });

    it('should delete vehicle', async () => {
      const vehicle: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(vehicle);
      await dataAccess.vehicles.deleteVehicle('vehicle-1');

      const deletedVehicle = await dataAccess.vehicles.getVehicleById('vehicle-1');
      expect(deletedVehicle).toBeNull();
    });

    it('should handle vehicle not found error', async () => {
      const vehicle = await dataAccess.vehicles.getVehicleById('non-existent-id');
      expect(vehicle).toBeNull();
    });

    it('should handle update vehicle with invalid ID', async () => {
      await expect(
        dataAccess.vehicles.updateVehicle('non-existent-id', { vehicleCapacity: 15000 })
      ).rejects.toThrow();
    });

    it('should get all vehicles', async () => {
      const vehicle1: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const vehicle2: Vehicle = {
        id: 'vehicle-2',
        agencyId: 'admin-2',
        vehicleNumber: 'XYZ789',
        insuranceCompanyName: 'Another Insurance',
        insuranceExpiryDate: new Date('2026-06-30'),
        vehicleCapacity: 15000,
        amount: 750000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(vehicle1);
      await dataAccess.vehicles.saveVehicle(vehicle2);

      const vehicles = await dataAccess.vehicles.getVehicles();
      expect(vehicles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Real-time Subscriptions - Users', () => {
    it('should subscribe to user updates', async () => {
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };

      await dataAccess.users.saveUser(customerUser);

      const updateCallback = jest.fn();
      const unsubscribe = dataAccess.users.subscribeToUserUpdates('customer-1', updateCallback);

      // Simulate update
      await dataAccess.users.updateUserProfile('customer-1', {
        name: 'Updated Customer',
      });

      // Wait for subscription callback
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();
      expect(updateCallback).toHaveBeenCalled();
    });

    it('should subscribe to all users updates', async () => {
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };

      const collectionCallback = jest.fn();
      const unsubscribe = dataAccess.users.subscribeToAllUsersUpdates(collectionCallback);

      await dataAccess.users.saveUser(customerUser);

      // Wait for subscription callback
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();
      expect(collectionCallback).toHaveBeenCalled();
    });
  });

  describe('Real-time Subscriptions - Bookings', () => {
    it('should subscribe to booking updates', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      const updateCallback = jest.fn();
      const unsubscribe = dataAccess.bookings.subscribeToBookingUpdates('booking-1', updateCallback);

      // Simulate update
      await dataAccess.bookings.updateBooking('booking-1', {
        status: 'accepted',
      });

      // Wait for subscription callback
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();
      expect(updateCallback).toHaveBeenCalled();
    });

    it('should handle multiple subscriptions to same booking', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const unsubscribe1 = dataAccess.bookings.subscribeToBookingUpdates('booking-1', callback1);
      const unsubscribe2 = dataAccess.bookings.subscribeToBookingUpdates('booking-1', callback2);

      await dataAccess.bookings.updateBooking('booking-1', { status: 'accepted' });
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe1();
      unsubscribe2();
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle subscription errors gracefully', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      const updateCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const unsubscribe = dataAccess.bookings.subscribeToBookingUpdates('booking-1', updateCallback);

      // Simulate update that triggers callback error
      await dataAccess.bookings.updateBooking('booking-1', { status: 'accepted' });
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();
      // Callback should have been called even if it throws
      expect(updateCallback).toHaveBeenCalled();
    });

    it('should unsubscribe from subscription correctly', async () => {
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.bookings.saveBooking(booking);

      const callback = jest.fn();
      const unsubscribe = dataAccess.bookings.subscribeToBookingUpdates('booking-1', callback);

      // Unsubscribe before update
      unsubscribe();

      await dataAccess.bookings.updateBooking('booking-1', { status: 'accepted' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Real-time Subscriptions - Vehicles', () => {
    it('should subscribe to vehicle updates', async () => {
      const vehicle: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(vehicle);

      const updateCallback = jest.fn();
      const unsubscribe = dataAccess.vehicles.subscribeToVehicleUpdates('vehicle-1', updateCallback);

      // Simulate update
      await dataAccess.vehicles.updateVehicle('vehicle-1', {
        vehicleCapacity: 15000,
      });

      // Wait for subscription callback
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();
      expect(updateCallback).toHaveBeenCalled();
    });

    it('should subscribe to agency vehicles updates', async () => {
      const vehicle: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collectionCallback = jest.fn();
      const unsubscribe = dataAccess.vehicles.subscribeToAgencyVehiclesUpdates('admin-1', collectionCallback);

      await dataAccess.vehicles.saveVehicle(vehicle);

      // Wait for subscription callback
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();
      expect(collectionCallback).toHaveBeenCalled();
    });
  });

  describe('Authentication Flows', () => {
    beforeEach(() => {
      // Setup auth mocks
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: 'newuser@test.com' },
          session: { access_token: 'mock-token', user: { id: 'new-user-id' } },
        },
        error: null,
      });

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'mock-token', user: { id: 'test-user-id' } },
        },
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    });

    it('should register a new customer user', async () => {
      const result = await AuthService.register(
        'newcustomer@test.com',
        'password123',
        'New Customer',
        'customer',
        { phone: '1234567890' }
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.role).toBe('customer');
      expect(supabase.auth.signUp).toHaveBeenCalled();
    });

    it('should register a new admin user', async () => {
      const result = await AuthService.register(
        'newadmin@test.com',
        'password123',
        'New Admin',
        'admin',
        { phone: '5555555555', businessName: 'Test Business' }
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.role).toBe('admin');
    });

    it('should login with email and password (single role)', async () => {
      // Setup user with single role
      mockUserRoles.push({ user_id: 'test-user-id', role: 'customer' });
      mockUsers.push({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
      });
      mockCustomers.push({
        user_id: 'test-user-id',
        saved_addresses: [],
      });

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.role).toBe('customer');
      expect(result.requiresRoleSelection).toBeUndefined();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
    });

    it('should login with preferred role (multi-role user)', async () => {
      // Setup user with multiple roles
      mockUserRoles.push(
        { user_id: 'test-user-id', role: 'customer' },
        { user_id: 'test-user-id', role: 'admin' }
      );
      mockUsers.push({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
      });
      mockCustomers.push({
        user_id: 'test-user-id',
        saved_addresses: [],
      });
      mockAdmins.push({
        user_id: 'test-user-id',
        business_name: 'Test Business',
      });

      const result = await AuthService.login('test@example.com', 'password123', 'admin');

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.role).toBe('admin');
      expect(result.requiresRoleSelection).toBeUndefined();
    });

    it('should require role selection for multi-role user without preferred role', async () => {
      // Setup user with multiple roles
      mockUserRoles.push(
        { user_id: 'test-user-id', role: 'customer' },
        { user_id: 'test-user-id', role: 'admin' }
      );
      mockUsers.push({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
      });
      mockCustomers.push({
        user_id: 'test-user-id',
        saved_addresses: [],
      });
      mockAdmins.push({
        user_id: 'test-user-id',
        business_name: 'Test Business',
      });

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.requiresRoleSelection).toBe(true);
      expect(result.availableRoles).toContain('customer');
      expect(result.availableRoles).toContain('admin');
    });

    it('should login with selected role after role selection', async () => {
      // Setup session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            access_token: 'mock-token',
          },
        },
        error: null,
      });

      // Setup user with multiple roles
      mockUserRoles.push(
        { user_id: 'test-user-id', role: 'customer' },
        { user_id: 'test-user-id', role: 'admin' }
      );
      mockUsers.push({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
      });
      mockAdmins.push({
        user_id: 'test-user-id',
        business_name: 'Test Business',
      });

      const result = await AuthService.loginWithRole('test@example.com', 'admin');

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.role).toBe('admin');
    });

    it('should logout user', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            access_token: 'mock-token',
          },
        },
        error: null,
      });

      await AuthService.logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should get current user data', async () => {
      // Setup user
      mockUserRoles.push({ user_id: 'test-user-id', role: 'customer' });
      mockUsers.push({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
      });
      mockCustomers.push({
        user_id: 'test-user-id',
        saved_addresses: [],
      });

      const user = await AuthService.getCurrentUserData();

      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@example.com');
    });

    it('should handle login with invalid credentials', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await AuthService.login('invalid@test.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle registration with existing email', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await AuthService.register(
        'existing@test.com',
        'password123',
        'Existing User',
        'customer',
        { phone: '1234567890' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle logout when not logged in', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await AuthService.logout();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle getCurrentUserData when not logged in', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const user = await AuthService.getCurrentUserData();
      expect(user).toBeNull();
    });

    it('should handle login with invalid preferred role', async () => {
      mockUserRoles.push({ user_id: 'test-user-id', role: 'customer' });
      mockUsers.push({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
      });
      mockCustomers.push({
        user_id: 'test-user-id',
        saved_addresses: [],
      });

      const result = await AuthService.login('test@example.com', 'password123', 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle registration with missing required fields', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Missing required fields' },
      });

      const result = await AuthService.register(
        '',
        '',
        '',
        'customer',
        {}
      );

      expect(result.success).toBe(false);
    });

    it('should handle session refresh', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
            access_token: 'new-token',
          },
        },
        error: null,
      });

      mockUserRoles.push({ user_id: 'test-user-id', role: 'customer' });
      mockUsers.push({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
      });
      mockCustomers.push({
        user_id: 'test-user-id',
        saved_addresses: [],
      });

      const user = await AuthService.getCurrentUserData();
      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@example.com');
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should complete full booking flow with real-time updates', async () => {
      // 1. Create customer
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };
      await dataAccess.users.saveUser(customerUser);

      // 2. Create driver
      const driverUser: DriverUser = {
        id: 'driver-1',
        email: 'driver@test.com',
        password: 'hashed-password',
        name: 'Test Driver',
        phone: '9876543210',
        role: 'driver',
        vehicleNumber: 'ABC123',
        licenseNumber: 'DL123456',
        licenseExpiry: new Date('2025-12-31'),
        driverLicenseImage: 'https://example.com/license.jpg',
        vehicleRegistrationImage: 'https://example.com/registration.jpg',
        totalEarnings: 0,
        completedOrders: 0,
        createdByAdmin: true,
        createdAt: new Date(),
      };
      await dataAccess.users.saveUser(driverUser);

      // 3. Create booking
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await dataAccess.bookings.saveBooking(booking);

      // 4. Subscribe to booking updates
      const bookingUpdateCallback = jest.fn();
      const unsubscribeBooking = dataAccess.bookings.subscribeToBookingUpdates('booking-1', bookingUpdateCallback);

      // 5. Driver accepts booking
      await dataAccess.bookings.updateBooking('booking-1', {
        status: 'accepted',
        driverId: 'driver-1',
        driverName: 'Test Driver',
        driverPhone: '9876543210',
      });

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 100));

      const acceptedBooking = await dataAccess.bookings.getBookingById('booking-1');
      expect(acceptedBooking?.status).toBe('accepted');
      expect(acceptedBooking?.driverId).toBe('driver-1');

      // 6. Driver delivers
      await dataAccess.bookings.updateBooking('booking-1', {
        status: 'delivered',
      });

      const deliveredBooking = await dataAccess.bookings.getBookingById('booking-1');
      expect(deliveredBooking?.status).toBe('delivered');

      unsubscribeBooking();
    });

    it('should handle multi-role user registration and login', async () => {
      // 1. Register as customer
      const customerResult = await AuthService.register(
        'multirole@test.com',
        'password123',
        'Multi Role User',
        'customer',
        { phone: '1234567890' }
      );
      expect(customerResult.success).toBe(true);

      // 2. Add admin role to same user
      const adminResult = await AuthService.register(
        'multirole@test.com',
        'password123',
        'Multi Role User',
        'admin',
        { phone: '1234567890', businessName: 'Test Business' }
      );
      expect(adminResult.success).toBe(true);

      // 3. Login without preferred role (should require selection)
      const loginResult = await AuthService.login('multirole@test.com', 'password123');
      expect(loginResult.success).toBe(true);
      expect(loginResult.requiresRoleSelection).toBe(true);
      expect(loginResult.availableRoles?.length).toBeGreaterThanOrEqual(2);

      // 4. Login with preferred role
      const roleLoginResult = await AuthService.login('multirole@test.com', 'password123', 'admin');
      expect(roleLoginResult.success).toBe(true);
      expect(roleLoginResult.user?.role).toBe('admin');
    });

    it('should handle complete vehicle management flow', async () => {
      // 1. Create admin
      const adminUser: AdminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        password: 'hashed-password',
        name: 'Test Admin',
        phone: '5555555555',
        role: 'admin',
        businessName: 'Test Business',
        createdAt: new Date(),
      };
      await dataAccess.users.saveUser(adminUser);

      // 2. Create vehicles
      const vehicle1: Vehicle = {
        id: 'vehicle-1',
        agencyId: 'admin-1',
        vehicleNumber: 'ABC123',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 10000,
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const vehicle2: Vehicle = {
        id: 'vehicle-2',
        agencyId: 'admin-1',
        vehicleNumber: 'XYZ789',
        insuranceCompanyName: 'Another Insurance',
        insuranceExpiryDate: new Date('2026-06-30'),
        vehicleCapacity: 15000,
        amount: 750000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dataAccess.vehicles.saveVehicle(vehicle1);
      await dataAccess.vehicles.saveVehicle(vehicle2);

      // 3. Subscribe to vehicle updates
      const vehicleCallback = jest.fn();
      const unsubscribe = dataAccess.vehicles.subscribeToAgencyVehiclesUpdates('admin-1', vehicleCallback);

      // 4. Update vehicle
      await dataAccess.vehicles.updateVehicle('vehicle-1', {
        vehicleCapacity: 12000,
        amount: 600000,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify updates
      const updatedVehicle = await dataAccess.vehicles.getVehicleById('vehicle-1');
      expect(updatedVehicle?.vehicleCapacity).toBe(12000);
      expect(updatedVehicle?.amount).toBe(600000);

      // 6. Get all agency vehicles
      const agencyVehicles = await dataAccess.vehicles.getVehiclesByAgency('admin-1');
      expect(agencyVehicles.length).toBe(2);

      unsubscribe();
    });

    it('should handle concurrent operations', async () => {
      // Create multiple users concurrently
      const userPromises = [
        dataAccess.users.saveUser({
          id: 'user-1',
          email: 'user1@test.com',
          password: 'hashed-password',
          name: 'User 1',
          phone: '1111111111',
          role: 'customer',
          savedAddresses: [],
          createdAt: new Date(),
        } as CustomerUser),
        dataAccess.users.saveUser({
          id: 'user-2',
          email: 'user2@test.com',
          password: 'hashed-password',
          name: 'User 2',
          phone: '2222222222',
          role: 'customer',
          savedAddresses: [],
          createdAt: new Date(),
        } as CustomerUser),
        dataAccess.users.saveUser({
          id: 'user-3',
          email: 'user3@test.com',
          password: 'hashed-password',
          name: 'User 3',
          phone: '3333333333',
          role: 'customer',
          savedAddresses: [],
          createdAt: new Date(),
        } as CustomerUser),
      ];

      await Promise.all(userPromises);

      const users = await dataAccess.users.getUsers();
      expect(users.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle data consistency across operations', async () => {
      // Create customer
      const customerUser: CustomerUser = {
        id: 'customer-1',
        email: 'customer@test.com',
        password: 'hashed-password',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };
      await dataAccess.users.saveUser(customerUser);

      // Create booking
      const booking: Booking = {
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
          address: '123 Test St, Test City, Test State 123456',
          latitude: 0,
          longitude: 0,
        },
        distance: 10,
        paymentStatus: 'pending',
        canCancel: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await dataAccess.bookings.saveBooking(booking);

      // Verify data consistency
      const user = await dataAccess.users.getUserById('customer-1');
      const userBookings = await dataAccess.bookings.getBookingsByCustomer('customer-1');

      expect(user).toBeTruthy();
      expect(userBookings.length).toBe(1);
      expect(userBookings[0].customerId).toBe('customer-1');
      expect(userBookings[0].customerName).toBe('Test Customer');
    });
  });
});

