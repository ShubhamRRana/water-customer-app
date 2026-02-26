import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Booking, Vehicle, BankAccount, BookingStatus } from '../types/index';
import {
  serializeUserDates,
  deserializeUserDates,
  serializeBookingDates,
  deserializeBookingDates,
  serializeVehicleDates,
  deserializeVehicleDates,
} from '../utils/dateSerialization';

/**
 * @deprecated This service is deprecated and will be removed in a future version.
 * All production code should use the `dataAccess` abstraction layer instead.
 * This service is kept for backward compatibility and testing purposes only.
 * 
 * Migration guide: See DATA_ACCESS_LAYER_GUIDE.md for details on using the dataAccess layer.
 * 
 * @see {@link ../lib/index.ts} for the dataAccess singleton
 * @see {@link DATA_ACCESS_LAYER_GUIDE.md} for migration instructions
 */
// Local storage service to replace Firebase functionality
export class LocalStorageService {
  // Generic methods for storing and retrieving data
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      throw new Error(`Failed to store data: ${error}`);
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      throw new Error(`Failed to retrieve data: ${error}`);
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove data: ${error}`);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  // User management methods
  static async saveUser(user: User): Promise<void> {
    const serialized = serializeUserDates(user as any);
    await this.setItem('current_user', serialized);
  }

  static async getCurrentUser(): Promise<User | null> {
    const user = await this.getItem<any>('current_user');
    return user ? (deserializeUserDates(user) as unknown as User) : null;
  }

  static async removeUser(): Promise<void> {
    await this.removeItem('current_user');
  }

  // Booking management methods
  static async saveBooking(booking: Booking): Promise<void> {
    try {
      // Validate booking has required fields
      if (!booking.id || !booking.customerId || !booking.customerName) {
        throw new Error('Booking is missing required fields (id, customerId, or customerName)');
      }

      if (!booking.createdAt || !booking.updatedAt) {
        throw new Error('Booking is missing required date fields (createdAt or updatedAt)');
      }

      // Validate dates are valid Date objects
      if (!(booking.createdAt instanceof Date) || isNaN(booking.createdAt.getTime())) {
        throw new Error('Invalid createdAt date');
      }

      if (!(booking.updatedAt instanceof Date) || isNaN(booking.updatedAt.getTime())) {
        throw new Error('Invalid updatedAt date');
      }

      if (booking.scheduledFor && (!(booking.scheduledFor instanceof Date) || isNaN(booking.scheduledFor.getTime()))) {
        throw new Error('Invalid scheduledFor date');
      }

      const bookings = await this.getBookings();
      const updatedBookings = [...bookings, booking];
      const serialized = updatedBookings.map(b => serializeBookingDates(b as any));
      await this.setItem('bookings', serialized);
    } catch (error) {
      throw error;
    }
  }

  static async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    const bookings = await this.getBookings();
    const updatedBookings = bookings.map(booking => {
      if (booking.id === bookingId) {
        return { ...booking, ...updates };
      }
      return booking;
    });
    const serialized = updatedBookings.map(b => serializeBookingDates(b as any));
    await this.setItem('bookings', serialized);
  }

  static async getBookings(): Promise<Booking[]> {
    const bookings = await this.getItem<any[]>('bookings');
    if (!bookings) return [];
    return bookings.map(booking => deserializeBookingDates(booking) as unknown as Booking);
  }

  static async getBookingById(bookingId: string): Promise<Booking | null> {
    const bookings = await this.getBookings();
    return bookings.find(booking => booking.id === bookingId) || null;
  }

  static async getBookingsByCustomer(
    customerId: string, 
    options?: { limit?: number; offset?: number; sortBy?: 'createdAt' | 'updatedAt'; sortOrder?: 'asc' | 'desc' }
  ): Promise<Booking[]> {
    const bookings = await this.getBookings();
    let filtered = bookings.filter(booking => booking.customerId === customerId);
    
    // Sort bookings
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    filtered.sort((a, b) => {
      const aVal = a[sortBy]?.getTime() || 0;
      const bVal = b[sortBy]?.getTime() || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit;
    if (limit) {
      filtered = filtered.slice(offset, offset + limit);
    } else if (offset > 0) {
      filtered = filtered.slice(offset);
    }
    
    return filtered;
  }

  static async getBookingsByDriver(
    driverId: string, 
    options?: { 
      status?: BookingStatus[]; 
      limit?: number; 
      offset?: number; 
      sortBy?: 'createdAt' | 'updatedAt' | 'deliveredAt'; 
      sortOrder?: 'asc' | 'desc' 
    }
  ): Promise<Booking[]> {
    const bookings = await this.getBookings();
    let filtered = bookings.filter(booking => booking.driverId === driverId);
    
    // Filter by status if provided
    if (options?.status && options.status.length > 0) {
      filtered = filtered.filter(booking => options.status!.includes(booking.status));
    }
    
    // Sort bookings
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    filtered.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;
      
      if (sortBy === 'deliveredAt') {
        aVal = a.deliveredAt?.getTime() || 0;
        bVal = b.deliveredAt?.getTime() || 0;
      } else {
        aVal = a[sortBy]?.getTime() || 0;
        bVal = b[sortBy]?.getTime() || 0;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit;
    if (limit) {
      filtered = filtered.slice(offset, offset + limit);
    } else if (offset > 0) {
      filtered = filtered.slice(offset);
    }
    
    return filtered;
  }

  static async getAvailableBookings(
    options?: { limit?: number; offset?: number; sortBy?: 'createdAt'; sortOrder?: 'asc' | 'desc' }
  ): Promise<Booking[]> {
    const bookings = await this.getBookings();
    let filtered = bookings.filter(booking => booking.status === 'pending' && !booking.driverId);
    
    // Sort bookings
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    filtered.sort((a, b) => {
      const aVal = a[sortBy]?.getTime() || 0;
      const bVal = b[sortBy]?.getTime() || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit;
    if (limit) {
      filtered = filtered.slice(offset, offset + limit);
    } else if (offset > 0) {
      filtered = filtered.slice(offset);
    }
    
    return filtered;
  }

  /**
   * Get bookings for earnings calculation with date filtering
   * Optimized to only fetch completed bookings within date range
   */
  static async getBookingsForEarnings(
    driverId: string,
    options?: { 
      startDate?: Date; 
      endDate?: Date; 
      status?: BookingStatus[];
    }
  ): Promise<Booking[]> {
    const bookings = await this.getBookings();
    let filtered = bookings.filter(booking => 
      booking.driverId === driverId && 
      booking.status === 'delivered'
    );
    
    // Filter by date range if provided
    if (options?.startDate) {
      filtered = filtered.filter(booking => 
        booking.deliveredAt && booking.deliveredAt >= options.startDate!
      );
    }
    
    if (options?.endDate) {
      filtered = filtered.filter(booking => 
        booking.deliveredAt && booking.deliveredAt <= options.endDate!
      );
    }
    
    return filtered;
  }

  /**
   * Batch fetch users by IDs - eliminates N+1 query problem
   */
  static async getUsersByIds(userIds: string[]): Promise<Map<string, User>> {
    const users = await this.getUsers();
    const userMap = new Map<string, User>();
    
    // Create a Set for O(1) lookup
    const userIdSet = new Set(userIds);
    
    // Filter and map users
    users.forEach(user => {
      if (userIdSet.has(user.id)) {
        userMap.set(user.id, user);
      }
    });
    
    return userMap;
  }

  // User collection management
  static async saveUserToCollection(user: User): Promise<void> {
    const users = await this.getUsers();
    const existingUserIndex = users.findIndex(u => u.id === user.id);
    
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = user;
    } else {
      users.push(user);
    }
    
    const serialized = users.map(u => serializeUserDates(u as any));
    await this.setItem('users_collection', serialized);
  }

  static async getUsers(): Promise<User[]> {
    const users = await this.getItem<any[]>('users_collection');
    if (!users) return [];
    return users.map(user => deserializeUserDates(user) as unknown as User);
  }

  static async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(user => user.id === id) || null;
  }

  static async updateUserProfile(id: string, updates: Partial<User>): Promise<void> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], ...updates } as User;
      const serialized = users.map(u => serializeUserDates(u as any));
      await this.setItem('users_collection', serialized);
    } else {
      throw new Error('User not found');
    }
  }

  // Vehicle management methods
  static async saveVehicle(vehicle: Vehicle): Promise<void> {
    const vehicles = await this.getVehicles();
    const existingVehicleIndex = vehicles.findIndex(v => v.id === vehicle.id);
    
    if (existingVehicleIndex >= 0) {
      vehicles[existingVehicleIndex] = { ...vehicle, updatedAt: new Date() };
    } else {
      // Preserve existing dates if provided, otherwise create new ones
      const vehicleToAdd = {
        ...vehicle,
        createdAt: vehicle.createdAt || new Date(),
        updatedAt: vehicle.updatedAt || new Date(),
      };
      vehicles.push(vehicleToAdd);
    }
    
    const serialized = vehicles.map(v => serializeVehicleDates(v as any));
    await this.setItem('vehicles_collection', serialized);
  }

  static async getVehicles(): Promise<Vehicle[]> {
    const vehicles = await this.getItem<any[]>('vehicles_collection');
    if (!vehicles) return [];
    return vehicles.map(vehicle => deserializeVehicleDates(vehicle) as unknown as Vehicle);
  }

  static async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    const vehicles = await this.getVehicles();
    return vehicles.find(vehicle => vehicle.id === vehicleId) || null;
  }

  static async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
    const vehicles = await this.getVehicles();
    const vehicleIndex = vehicles.findIndex(vehicle => vehicle.id === vehicleId);
    
    if (vehicleIndex >= 0) {
      vehicles[vehicleIndex] = { ...vehicles[vehicleIndex], ...updates, updatedAt: new Date() } as Vehicle;
      const serialized = vehicles.map(v => serializeVehicleDates(v as any));
      await this.setItem('vehicles_collection', serialized);
    } else {
      throw new Error('Vehicle not found');
    }
  }

  static async deleteVehicle(vehicleId: string): Promise<void> {
    const vehicles = await this.getVehicles();
    const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== vehicleId);
    const serialized = updatedVehicles.map(vehicle => serializeVehicleDates(vehicle as any));
    await this.setItem('vehicles_collection', serialized);
  }

  // Bank account management methods
  static async saveBankAccount(bankAccount: BankAccount, adminId: string): Promise<void> {
    // Get all bank accounts (from all admins)
    const allBankAccounts = await this.getItem<any[]>('bank_accounts_collection') || [];
    const bankAccounts = allBankAccounts.map(account => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
    })) as BankAccount[];
    
    // Ensure the account belongs to this admin
    if (bankAccount.adminId !== adminId) {
      throw new Error('Bank account does not belong to this admin');
    }
    
    const existingAccountIndex = bankAccounts.findIndex(ba => ba.id === bankAccount.id && ba.adminId === adminId);
    
    if (existingAccountIndex >= 0) {
      bankAccounts[existingAccountIndex] = { ...bankAccount, updatedAt: new Date() };
    } else {
      const accountToAdd = {
        ...bankAccount,
        adminId,
        createdAt: bankAccount.createdAt || new Date(),
        updatedAt: bankAccount.updatedAt || new Date(),
      };
      bankAccounts.push(accountToAdd);
    }
    
    // If this account is set as default, unset all other accounts for this admin only
    if (bankAccount.isDefault) {
      bankAccounts.forEach(account => {
        if (account.id !== bankAccount.id && account.adminId === adminId) {
          account.isDefault = false;
        }
      });
    }
    
    const serialized = bankAccounts.map(ba => ({
      ...ba,
      createdAt: ba.createdAt.toISOString(),
      updatedAt: ba.updatedAt.toISOString(),
    }));
    await this.setItem('bank_accounts_collection', serialized);
  }

  static async getBankAccounts(adminId: string): Promise<BankAccount[]> {
    const allBankAccounts = await this.getItem<any[]>('bank_accounts_collection');
    if (!allBankAccounts) return [];
    
    // Filter by adminId and return only accounts belonging to this admin
    return allBankAccounts
      .filter(account => account.adminId === adminId)
      .map(account => ({
        ...account,
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt),
      })) as BankAccount[];
  }

  static async getBankAccountById(accountId: string, adminId: string): Promise<BankAccount | null> {
    const allBankAccounts = await this.getItem<any[]>('bank_accounts_collection');
    if (!allBankAccounts) return null;
    
    const account = allBankAccounts.find(
      acc => acc.id === accountId && acc.adminId === adminId
    );
    
    if (!account) return null;
    
    return {
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
    } as BankAccount;
  }

  static async getDefaultBankAccount(adminId: string): Promise<BankAccount | null> {
    const bankAccounts = await this.getBankAccounts(adminId);
    return bankAccounts.find(account => account.isDefault) || null;
  }

  static async updateBankAccount(accountId: string, updates: Partial<BankAccount>, adminId: string): Promise<void> {
    // Get all bank accounts (from all admins)
    const allBankAccounts = await this.getItem<any[]>('bank_accounts_collection') || [];
    const bankAccounts = allBankAccounts.map(account => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
    })) as BankAccount[];
    
    const accountIndex = bankAccounts.findIndex(account => account.id === accountId && account.adminId === adminId);
    
    if (accountIndex >= 0) {
      bankAccounts[accountIndex] = { ...bankAccounts[accountIndex], ...updates, updatedAt: new Date() } as BankAccount;
      
      // If setting as default, unset all other accounts for this admin only
      if (updates.isDefault === true) {
        bankAccounts.forEach(account => {
          if (account.id !== accountId && account.adminId === adminId) {
            account.isDefault = false;
          }
        });
      }
      
      const serialized = bankAccounts.map(ba => ({
        ...ba,
        createdAt: ba.createdAt.toISOString(),
        updatedAt: ba.updatedAt.toISOString(),
      }));
      await this.setItem('bank_accounts_collection', serialized);
    } else {
      throw new Error('Bank account not found or does not belong to this admin');
    }
  }

  static async deleteBankAccount(accountId: string, adminId: string): Promise<void> {
    // Get all bank accounts (from all admins)
    const allBankAccounts = await this.getItem<any[]>('bank_accounts_collection') || [];
    const bankAccounts = allBankAccounts.map(account => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
    })) as BankAccount[];
    
    // Only delete if it belongs to this admin
    const updatedAccounts = bankAccounts.filter(
      account => !(account.id === accountId && account.adminId === adminId)
    );
    
    const serialized = updatedAccounts.map(account => ({
      ...account,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }));
    await this.setItem('bank_accounts_collection', serialized);
  }

  // Generate unique IDs
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Initialize with sample data for development
  static async initializeSampleData(): Promise<void> {
    const hasInitialized = await this.getItem('initialized');
    if (hasInitialized) return;

    // Sample users - including multi-role example
    // Note: Email is now the primary identifier for authentication
    // Phone numbers are kept for contact purposes only
    const sampleUsers = [
      {
        id: 'admin_001',
        role: 'admin',
        email: 'admin@watertanker.app',
        password: 'admin123', // In production, this should be hashed
        phone: '9999999999', // Optional: for contact purposes
        name: 'Admin User',
        createdAt: new Date(),
      },
      {
        id: 'driver_001',
        role: 'driver',
        email: 'driver@watertanker.app',
        password: 'driver123', // In production, this should be hashed
        phone: '8888888888', // Optional: for contact purposes
        name: 'John Driver',
        vehicleNumber: 'DL01AB1234',
        licenseNumber: 'DL123456789',
        createdAt: new Date(),
        createdByAdmin: false, // Regular driver - should not be able to login
      },
      {
        id: 'driver_admin_001',
        role: 'driver',
        email: 'admin.driver@watertanker.app',
        password: 'driver123', // In production, this should be hashed
        phone: '6666666666', // Optional: for contact purposes
        name: 'Admin Created Driver',
        vehicleNumber: 'DL03EF9012',
        licenseNumber: 'DL111222333',
        createdAt: new Date(),
        createdByAdmin: true, // Admin-created driver - should be able to login
        totalEarnings: 0,
        completedOrders: 0,
      },
      {
        id: 'customer_001',
        role: 'customer',
        email: 'customer@watertanker.app',
        password: 'customer123', // In production, this should be hashed
        phone: '7777777777', // Optional: for contact purposes
        name: 'Jane Customer',
        createdAt: new Date(),
      },
      // Multi-role user example - same email with different roles
      {
        id: 'multi_customer_001',
        role: 'customer',
        email: 'multirole@watertanker.app',
        password: 'multi123', // In production, this should be hashed
        phone: '5555555555', // Optional: for contact purposes
        name: 'Multi Role User',
        createdAt: new Date(),
      },
      {
        id: 'multi_driver_001',
        role: 'driver',
        email: 'multirole@watertanker.app',
        password: 'multi123', // In production, this should be hashed
        phone: '5555555555', // Optional: for contact purposes
        name: 'Multi Role User',
        vehicleNumber: 'DL02CD5678',
        licenseNumber: 'DL987654321',
        createdAt: new Date(),
        createdByAdmin: true, // Admin-created driver - should be able to login for multi-role test
        totalEarnings: 0,
        completedOrders: 0,
      }
    ];

    // Serialize dates before storing
    const serializedUsers = sampleUsers.map(user => serializeUserDates(user as any));
    await this.setItem('users_collection', serializedUsers);
    await this.setItem('initialized', true);
  }
}
