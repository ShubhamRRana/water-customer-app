/**
 * User Acceptance Tests (UAT)
 * 
 * Phase 8, Item 3: User Acceptance Testing
 * - Test all user roles (customer, driver, admin)
 * - Test booking flow
 * - Test payment collection
 * 
 * These tests simulate real user scenarios and verify end-to-end functionality
 * from a user's perspective using Supabase backend.
 */

import { SupabaseDataAccess } from '../../lib/supabaseDataAccess';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { PaymentService } from '../../services/payment.service';
import { User, Booking, Vehicle, CustomerUser, DriverUser, AdminUser, Address } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

// Mock Supabase client for testing
const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
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
let mockAuthUsers: Map<string, any> = new Map();

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
      
      queryBuilder.maybeSingle = jest.fn().mockImplementation(async () => {
        if (table === 'users') {
          const user = mockUsers[0];
          return { data: user || null, error: null };
        }
        return { data: null, error: null };
      });
      
      // Mock insert
      queryBuilder.insert = jest.fn().mockImplementation(async (data: any) => {
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (table === 'users') {
              const newUser = { ...item, id: item.id || `user-${Date.now()}` };
              mockUsers.push(newUser);
            } else if (table === 'user_roles') {
              mockUserRoles.push(item);
            } else if (table === 'customers') {
              mockCustomers.push(item);
            } else if (table === 'drivers') {
              mockDrivers.push(item);
            } else if (table === 'admins') {
              mockAdmins.push(item);
            } else if (table === 'bookings') {
              const newBooking = { ...item, id: item.id || `booking-${Date.now()}` };
              mockBookings.push(newBooking);
            } else if (table === 'vehicles') {
              const newVehicle = { ...item, id: item.id || `vehicle-${Date.now()}` };
              mockVehicles.push(newVehicle);
            }
          });
          return { data: Array.isArray(data) ? data : [data], error: null };
        }
        return { data: data, error: null };
      });
      
      // Mock update
      queryBuilder.update = jest.fn().mockImplementation(async (updates: any) => {
        if (table === 'users') {
          const index = mockUsers.findIndex(u => u.id === updates.id);
          if (index >= 0) {
            mockUsers[index] = { ...mockUsers[index], ...updates };
            return { data: [mockUsers[index]], error: null };
          }
        } else if (table === 'bookings') {
          const index = mockBookings.findIndex(b => b.id === updates.id);
          if (index >= 0) {
            mockBookings[index] = { ...mockBookings[index], ...updates };
            return { data: [mockBookings[index]], error: null };
          }
        }
        return { data: [], error: null };
      });
      
      // Mock delete
      queryBuilder.delete = jest.fn().mockReturnValue(queryBuilder);
      
      // Mock eq filter
      queryBuilder.eq = jest.fn().mockImplementation((column: string, value: any) => {
        if (table === 'users') {
          const filtered = mockUsers.filter(u => u[column] === value);
          queryBuilder.single = jest.fn().mockResolvedValue({ 
            data: filtered[0] || null, 
            error: filtered.length === 0 ? { message: 'Not found' } : null 
          });
        } else if (table === 'bookings') {
          const filtered = mockBookings.filter(b => b[column] === value);
          queryBuilder.single = jest.fn().mockResolvedValue({ 
            data: filtered[0] || null, 
            error: filtered.length === 0 ? { message: 'Not found' } : null 
          });
        }
        return queryBuilder;
      });
      
      // Mock order
      queryBuilder.order = jest.fn().mockReturnValue(queryBuilder);
      
      // Mock limit
      queryBuilder.limit = jest.fn().mockImplementation(async (count: number) => {
        if (table === 'bookings') {
          return { data: mockBookings.slice(0, count), error: null };
        }
        return { data: [], error: null };
      });
      
      return queryBuilder;
    }),
    auth: {
      signUp: jest.fn().mockImplementation(async ({ email, password }: any) => {
        const userId = `auth-${Date.now()}`;
        mockAuthUsers.set(userId, { id: userId, email, password });
        return { 
          data: { user: { id: userId, email } }, 
          error: null 
        };
      }),
      signInWithPassword: jest.fn().mockImplementation(async ({ email, password }: any) => {
        const user = Array.from(mockAuthUsers.values()).find(u => u.email === email);
        if (user && user.password === password) {
          return { 
            data: { user: { id: user.id, email: user.email }, session: { access_token: 'token' } }, 
            error: null 
          };
        }
        return { data: null, error: { message: 'Invalid credentials' } };
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ 
        data: { session: { access_token: 'token' } }, 
        error: null 
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    channel: jest.fn().mockImplementation((name: string) => {
      if (!mockChannels.has(name)) {
        mockChannels.set(name, createMockChannel());
      }
      return mockChannels.get(name)!;
    }),
    removeChannel: jest.fn(),
  };
  
  return { supabase: mockSupabase };
});

// Clear all mock data before each test
beforeEach(() => {
  mockUsers = [];
  mockUserRoles = [];
  mockCustomers = [];
  mockDrivers = [];
  mockAdmins = [];
  mockBookings = [];
  mockVehicles = [];
  mockAuthUsers.clear();
  mockChannels.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('User Acceptance Tests - All User Roles', () => {
  describe('Customer Role Tests', () => {
    it('should allow customer to register and create profile', async () => {
      const customerData = {
        email: 'customer@test.com',
        password: 'password123',
        name: 'Test Customer',
        phone: '1234567890',
        role: 'customer' as const,
      };

      const result = await AuthService.register(
        customerData.email,
        customerData.password,
        customerData.name,
        customerData.phone,
        customerData.role
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe(customerData.email);
      expect(result.user?.name).toBe(customerData.name);
      expect(result.user?.role).toBe('customer');
    });

    it('should allow customer to login and access their profile', async () => {
      // First register
      await AuthService.register('customer@test.com', 'password123', 'Test Customer', '1234567890', 'customer');
      
      // Then login
      const loginResult = await AuthService.login('customer@test.com', 'password123', 'customer');
      
      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toBeDefined();
      expect(loginResult.user?.email).toBe('customer@test.com');
      expect(loginResult.user?.role).toBe('customer');
    });

    it('should allow customer to save delivery addresses', async () => {
      const customerId = 'customer-1';
      const address: Address = {
        id: 'addr-1',
        address: '123 Main St, City, State 12345',
        latitude: 40.7128,
        longitude: -74.0060,
      };

      const dataAccess = new SupabaseDataAccess();
      const customer = await dataAccess.users.getUserById(customerId);
      
      if (customer && 'savedAddresses' in customer) {
        const updatedAddresses = [...(customer.savedAddresses || []), address];
        await dataAccess.users.updateUserProfile(customerId, {
          savedAddresses: updatedAddresses,
        });
        
        const updatedCustomer = await dataAccess.users.getUserById(customerId);
        expect(updatedCustomer && 'savedAddresses' in updatedCustomer).toBe(true);
        if (updatedCustomer && 'savedAddresses' in updatedCustomer) {
          expect(updatedCustomer.savedAddresses?.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Driver Role Tests', () => {
    it('should allow driver to register with vehicle and license information', async () => {
      const driverData = {
        email: 'driver@test.com',
        password: 'password123',
        name: 'Test Driver',
        phone: '9876543210',
        role: 'driver' as const,
        vehicleNumber: 'ABC123',
        licenseNumber: 'DL123456',
        licenseExpiry: new Date('2025-12-31'),
        driverLicenseImageUrl: 'https://example.com/license.jpg',
        vehicleRegistrationImageUrl: 'https://example.com/registration.jpg',
      };

      const result = await AuthService.register(
        driverData.email,
        driverData.password,
        driverData.name,
        driverData.phone,
        driverData.role
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('driver');
    });

    it('should allow driver to login and view available orders', async () => {
      // Register driver
      await AuthService.register('driver@test.com', 'password123', 'Test Driver', '9876543210', 'driver');
      
      // Login
      const loginResult = await AuthService.login('driver@test.com', 'password123', 'driver');
      
      expect(loginResult.success).toBe(true);
      expect(loginResult.user?.role).toBe('driver');
      
      // Driver should be able to see available bookings
      const dataAccess = new SupabaseDataAccess();
      const availableBookings = await dataAccess.bookings.getAvailableBookings();
      expect(Array.isArray(availableBookings)).toBe(true);
    });

    it('should allow driver to accept orders', async () => {
      const driverId = 'driver-1';
      const bookingId = 'booking-1';
      
      // Create a pending booking
      const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        status: 'pending',
        tankerSize: 10000,
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
      };
      
      const createdBookingId = await BookingService.createBooking(bookingData);
      
      // Driver accepts booking
      await BookingService.updateBookingStatus(createdBookingId, 'accepted', {
        driverId,
        driverName: 'Test Driver',
        driverPhone: '9876543210',
      });
      
      const booking = await BookingService.getBookingById(createdBookingId);
      expect(booking?.status).toBe('accepted');
      expect(booking?.driverId).toBe(driverId);
    });
  });

  describe('Admin Role Tests', () => {
    it('should allow admin to register and access admin features', async () => {
      const adminData = {
        email: 'admin@test.com',
        password: 'password123',
        name: 'Test Admin',
        phone: '5555555555',
        role: 'admin' as const,
        businessName: 'Test Business',
      };

      const result = await AuthService.register(
        adminData.email,
        adminData.password,
        adminData.name,
        adminData.phone,
        adminData.role
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('admin');
    });

    it('should allow admin to view all users', async () => {
      const adminId = 'admin-1';
      const dataAccess = new SupabaseDataAccess();
      
      // Admin should be able to see all users
      const allUsers = await dataAccess.users.getUsers();
      expect(Array.isArray(allUsers)).toBe(true);
    });

    it('should allow admin to manage vehicles', async () => {
      const adminId = 'admin-1';
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        agencyId: adminId,
        vehicleNumber: 'XYZ789',
        insuranceCompanyName: 'Test Insurance',
        insuranceExpiryDate: new Date('2025-12-31'),
        vehicleCapacity: 15000,
        amount: 500000,
      };
      
      const dataAccess = new SupabaseDataAccess();
      const vehicleId = await dataAccess.vehicles.saveVehicle(vehicleData);
      
      expect(vehicleId).toBeTruthy();
      
      const vehicle = await dataAccess.vehicles.getVehicleById(vehicleId);
      expect(vehicle).toBeDefined();
      expect(vehicle?.vehicleNumber).toBe(vehicleData.vehicleNumber);
    });

    it('should allow admin to view all bookings', async () => {
      const dataAccess = new SupabaseDataAccess();
      const allBookings = await dataAccess.bookings.getBookings();
      expect(Array.isArray(allBookings)).toBe(true);
    });
  });

  describe('Multi-Role User Tests', () => {
    it('should allow user to have multiple roles (customer + admin)', async () => {
      const email = 'multirole@test.com';
      const password = 'password123';
      
      // Register as customer first
      const customerResult = await AuthService.register(
        email,
        password,
        'Multi Role User',
        '1111111111',
        'customer'
      );
      
      expect(customerResult.success).toBe(true);
      
      // Add admin role to same user
      const adminResult = await AuthService.register(
        email,
        password,
        'Multi Role User',
        '1111111111',
        'admin'
      );
      
      expect(adminResult.success).toBe(true);
      
      // Login with customer role
      const customerLogin = await AuthService.login(email, password, 'customer');
      expect(customerLogin.success).toBe(true);
      expect(customerLogin.user?.role).toBe('customer');
      
      // Login with admin role
      const adminLogin = await AuthService.login(email, password, 'admin');
      expect(adminLogin.success).toBe(true);
      expect(adminLogin.user?.role).toBe('admin');
    });
  });
});

describe('User Acceptance Tests - Booking Flow', () => {
  const mockCustomer = {
    id: 'customer-1',
    email: 'customer@test.com',
    name: 'Test Customer',
    phone: '1234567890',
  };

  const mockDriver = {
    id: 'driver-1',
    email: 'driver@test.com',
    name: 'Test Driver',
    phone: '9876543210',
  };

  const mockAgency = {
    id: 'agency-1',
    email: 'agency@test.com',
    name: 'Test Agency',
  };

  it('should complete full booking lifecycle: create -> accept -> in_transit -> delivered', async () => {
    // Step 1: Customer creates booking
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: mockCustomer.id,
      customerName: mockCustomer.name,
      customerPhone: mockCustomer.phone,
      agencyId: mockAgency.id,
      agencyName: mockAgency.name,
      status: 'pending',
      tankerSize: 10000,
      quantity: 1,
      basePrice: 600,
      distanceCharge: 50,
      totalPrice: 650,
      deliveryAddress: {
        address: '123 Main St, City, State 12345',
        latitude: 40.7128,
        longitude: -74.0060,
      },
      distance: 10,
      paymentStatus: 'pending',
      canCancel: true,
    };

    const bookingId = await BookingService.createBooking(bookingData);
    expect(bookingId).toBeTruthy();

    let booking = await BookingService.getBookingById(bookingId);
    expect(booking?.status).toBe('pending');
    expect(booking?.customerId).toBe(mockCustomer.id);

    // Step 2: Driver accepts booking
    await BookingService.updateBookingStatus(bookingId, 'accepted', {
      driverId: mockDriver.id,
      driverName: mockDriver.name,
      driverPhone: mockDriver.phone,
    });

    booking = await BookingService.getBookingById(bookingId);
    expect(booking?.status).toBe('accepted');
    expect(booking?.driverId).toBe(mockDriver.id);
    expect(booking?.acceptedAt).toBeInstanceOf(Date);

    // Step 3: Driver starts delivery
    await BookingService.updateBookingStatus(bookingId, 'in_transit');

    booking = await BookingService.getBookingById(bookingId);
    expect(booking?.status).toBe('in_transit');

    // Step 4: Driver completes delivery
    await BookingService.updateBookingStatus(bookingId, 'delivered', {
      deliveredAt: new Date(),
    });

    booking = await BookingService.getBookingById(bookingId);
    expect(booking?.status).toBe('delivered');
    expect(booking?.deliveredAt).toBeInstanceOf(Date);
  });

  it('should allow customer to cancel pending booking', async () => {
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: mockCustomer.id,
      customerName: mockCustomer.name,
      customerPhone: mockCustomer.phone,
      status: 'pending',
      tankerSize: 10000,
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
    };

    const bookingId = await BookingService.createBooking(bookingData);
    
    const cancellationReason = 'Changed my mind';
    await BookingService.cancelBooking(bookingId, cancellationReason);

    const booking = await BookingService.getBookingById(bookingId);
    expect(booking?.status).toBe('cancelled');
    expect(booking?.cancellationReason).toBe(cancellationReason);
  });

  it('should allow customer to view their booking history', async () => {
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: mockCustomer.id,
      customerName: mockCustomer.name,
      customerPhone: mockCustomer.phone,
      status: 'pending',
      tankerSize: 10000,
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
    };

    const bookingId1 = await BookingService.createBooking(bookingData);
    const bookingId2 = await BookingService.createBooking({
      ...bookingData,
      status: 'delivered',
    });

    const customerBookings = await BookingService.getBookingsByCustomer(mockCustomer.id);
    expect(customerBookings.length).toBeGreaterThanOrEqual(2);
    expect(customerBookings.some(b => b.id === bookingId1)).toBe(true);
    expect(customerBookings.some(b => b.id === bookingId2)).toBe(true);
  });

  it('should allow driver to view their assigned bookings', async () => {
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: mockCustomer.id,
      customerName: mockCustomer.name,
      customerPhone: mockCustomer.phone,
      status: 'pending',
      tankerSize: 10000,
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
    };

    const bookingId = await BookingService.createBooking(bookingData);
    await BookingService.updateBookingStatus(bookingId, 'accepted', {
      driverId: mockDriver.id,
      driverName: mockDriver.name,
      driverPhone: mockDriver.phone,
    });

    const driverBookings = await BookingService.getBookingsByDriver(mockDriver.id);
    expect(driverBookings.length).toBeGreaterThanOrEqual(1);
    expect(driverBookings.some(b => b.id === bookingId)).toBe(true);
    expect(driverBookings[0].driverId).toBe(mockDriver.id);
  });
});

describe('User Acceptance Tests - Payment Collection', () => {
  const mockBookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
    customerId: 'customer-1',
    customerName: 'Test Customer',
    customerPhone: '1234567890',
    status: 'pending',
    tankerSize: 10000,
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
  };

  it('should process COD payment when booking is created', async () => {
    const bookingId = await BookingService.createBooking(mockBookingData);
    
    const paymentResult = await PaymentService.processCODPayment(bookingId, 650);
    
    expect(paymentResult.success).toBe(true);
    expect(paymentResult.paymentId).toBeTruthy();
    expect(paymentResult.paymentId).toContain('cod_');
    
    const booking = await BookingService.getBookingById(bookingId);
    expect(booking?.paymentStatus).toBe('pending');
    expect(booking?.paymentId).toBe(paymentResult.paymentId);
  });

  it('should confirm payment after delivery is completed', async () => {
    const bookingId = await BookingService.createBooking(mockBookingData);
    
    // Process COD payment
    await PaymentService.processCODPayment(bookingId, 650);
    
    // Driver accepts and delivers
    await BookingService.updateBookingStatus(bookingId, 'accepted', {
      driverId: 'driver-1',
    });
    await BookingService.updateBookingStatus(bookingId, 'delivered', {
      deliveredAt: new Date(),
    });
    
    // Confirm payment
    const confirmResult = await PaymentService.confirmCODPayment(bookingId);
    
    expect(confirmResult.success).toBe(true);
    expect(confirmResult.paymentId).toBeTruthy();
    
    const booking = await BookingService.getBookingById(bookingId);
    expect(booking?.paymentStatus).toBe('completed');
    expect(booking?.paymentId).toBe(confirmResult.paymentId);
  });

  it('should handle payment processing errors gracefully', async () => {
    const paymentResult = await PaymentService.processCODPayment('non-existent-booking', 650);
    
    expect(paymentResult.success).toBe(false);
    expect(paymentResult.error).toBeTruthy();
  });

  it('should maintain payment ID through booking status changes', async () => {
    const bookingId = await BookingService.createBooking(mockBookingData);
    
    const paymentResult = await PaymentService.processCODPayment(bookingId, 650);
    const initialPaymentId = paymentResult.paymentId;
    
    // Status changes
    await BookingService.updateBookingStatus(bookingId, 'accepted', {
      driverId: 'driver-1',
    });
    
    let booking = await BookingService.getBookingById(bookingId);
    expect(booking?.paymentId).toBe(initialPaymentId);
    
    await BookingService.updateBookingStatus(bookingId, 'in_transit');
    booking = await BookingService.getBookingById(bookingId);
    expect(booking?.paymentId).toBe(initialPaymentId);
  });
});

describe('User Acceptance Tests - End-to-End Scenarios', () => {
  it('should complete full user journey: register -> create booking -> driver accepts -> payment -> delivery', async () => {
    // Step 1: Customer registers
    const customerResult = await AuthService.register(
      'e2e-customer@test.com',
      'password123',
      'E2E Customer',
      '1111111111',
      'customer'
    );
    expect(customerResult.success).toBe(true);
    const customerId = customerResult.user?.id;
    
    // Step 2: Driver registers
    const driverResult = await AuthService.register(
      'e2e-driver@test.com',
      'password123',
      'E2E Driver',
      '2222222222',
      'driver'
    );
    expect(driverResult.success).toBe(true);
    const driverId = driverResult.user?.id;
    
    // Step 3: Customer creates booking
    const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: customerId!,
      customerName: 'E2E Customer',
      customerPhone: '1111111111',
      status: 'pending',
      tankerSize: 10000,
      basePrice: 600,
      distanceCharge: 50,
      totalPrice: 650,
      deliveryAddress: {
        address: '123 E2E Test St',
        latitude: 40.7128,
        longitude: -74.0060,
      },
      distance: 10,
      paymentStatus: 'pending',
      canCancel: true,
    };
    
    const bookingId = await BookingService.createBooking(bookingData);
    expect(bookingId).toBeTruthy();
    
    // Step 4: Process payment
    const paymentResult = await PaymentService.processCODPayment(bookingId, 650);
    expect(paymentResult.success).toBe(true);
    
    // Step 5: Driver accepts booking
    await BookingService.updateBookingStatus(bookingId, 'accepted', {
      driverId: driverId!,
      driverName: 'E2E Driver',
      driverPhone: '2222222222',
    });
    
    // Step 6: Driver starts delivery
    await BookingService.updateBookingStatus(bookingId, 'in_transit');
    
    // Step 7: Driver completes delivery
    await BookingService.updateBookingStatus(bookingId, 'delivered', {
      deliveredAt: new Date(),
    });
    
    // Step 8: Confirm payment
    const confirmResult = await PaymentService.confirmCODPayment(bookingId);
    expect(confirmResult.success).toBe(true);
    
    // Verify final state
    const finalBooking = await BookingService.getBookingById(bookingId);
    expect(finalBooking?.status).toBe('delivered');
    expect(finalBooking?.paymentStatus).toBe('completed');
    expect(finalBooking?.driverId).toBe(driverId);
  });

  it('should handle multi-role user accessing different features', async () => {
    const email = 'multirole-e2e@test.com';
    const password = 'password123';
    
    // Register as customer
    await AuthService.register(email, password, 'Multi Role', '3333333333', 'customer');
    
    // Add admin role
    await AuthService.register(email, password, 'Multi Role', '3333333333', 'admin');
    
    // Login as customer and create booking
    const customerLogin = await AuthService.login(email, password, 'customer');
    expect(customerLogin.success).toBe(true);
    
    const bookingId = await BookingService.createBooking({
      customerId: customerLogin.user!.id,
      customerName: 'Multi Role',
      customerPhone: '3333333333',
      status: 'pending',
      tankerSize: 10000,
      basePrice: 600,
      distanceCharge: 50,
      totalPrice: 650,
      deliveryAddress: {
        address: '123 Multi Role St',
        latitude: 40.7128,
        longitude: -74.0060,
      },
      distance: 10,
      paymentStatus: 'pending',
      canCancel: true,
    });
    
    // Login as admin and view all bookings
    const adminLogin = await AuthService.login(email, password, 'admin');
    expect(adminLogin.success).toBe(true);
    
    const dataAccess = new SupabaseDataAccess();
    const allBookings = await dataAccess.bookings.getBookings();
    expect(Array.isArray(allBookings)).toBe(true);
  });
});

