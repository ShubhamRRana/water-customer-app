/**
 * Data Access Layer Interface
 * 
 * This interface abstracts the data persistence layer to allow easy migration
 * from LocalStorage to Supabase (or any other backend service).
 * 
 * All services should use these interfaces instead of directly calling
 * LocalStorageService or Supabase client.
 */

import { User, Booking, Vehicle, BankAccount, Expense } from '../types/index';

/**
 * Generic subscription callback type
 */
export type SubscriptionCallback<T> = (data: T | null) => void;
export type CollectionSubscriptionCallback<T> = (data: T | null, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;

/**
 * Unsubscribe function returned by subscription methods
 */
export type Unsubscribe = () => void;

/**
 * Pagination and sorting options for queries
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Booking query options with filtering and pagination
 */
export interface BookingQueryOptions extends PaginationOptions {
  status?: string[];
}

/**
 * User data access interface
 */
export interface IUserDataAccess {
  getCurrentUser(): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  removeUser(): Promise<void>;
  getUserById(id: string): Promise<User | null>;
  getUsers(options?: { createdByAdminId?: string }): Promise<User[]>;
  saveUserToCollection(user: User): Promise<void>;
  updateUserProfile(id: string, updates: Partial<User>): Promise<void>;
  subscribeToUserUpdates(id: string, callback: SubscriptionCallback<User>): Unsubscribe;
  subscribeToAllUsersUpdates(callback: CollectionSubscriptionCallback<User>): Unsubscribe;
  /** Permanently delete a customer account and all related data (bookings, customer row, roles, user). */
  deleteCustomerAccount(customerId: string): Promise<void>;
  /** Permanently delete an admin account and all related data (expenses, bank accounts, admin row, roles, user). */
  deleteAdminAccount(adminId: string): Promise<void>;
  /** Permanently delete a driver account (unassign from bookings, then drivers, user_roles, users). Caller must be admin. */
  deleteDriverAccount(driverId: string): Promise<void>;
}

/**
 * Booking data access interface
 */
export interface IBookingDataAccess {
  saveBooking(booking: Booking): Promise<void>;
  updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void>;
  getBookings(options?: PaginationOptions): Promise<Booking[]>;
  getBookingById(bookingId: string): Promise<Booking | null>;
  getBookingsByCustomer(customerId: string, options?: PaginationOptions): Promise<Booking[]>;
  getBookingsByDriver(driverId: string, options?: BookingQueryOptions): Promise<Booking[]>;
  getAvailableBookings(options?: PaginationOptions): Promise<Booking[]>;
  subscribeToBookingUpdates(bookingId: string, callback: SubscriptionCallback<Booking>): Unsubscribe;
}

/**
 * Vehicle data access interface
 */
export interface IVehicleDataAccess {
  saveVehicle(vehicle: Vehicle): Promise<void>;
  updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void>;
  getVehicles(): Promise<Vehicle[]>;
  getVehicleById(vehicleId: string): Promise<Vehicle | null>;
  deleteVehicle(vehicleId: string): Promise<void>;
  getVehiclesByAgency(agencyId: string): Promise<Vehicle[]>;
  subscribeToVehicleUpdates(vehicleId: string, callback: SubscriptionCallback<Vehicle>): Unsubscribe;
  subscribeToAgencyVehiclesUpdates(agencyId: string, callback: CollectionSubscriptionCallback<Vehicle>): Unsubscribe;
}

/**
 * Bank account data access interface
 */
export interface IBankAccountDataAccess {
  getBankAccounts(adminId: string): Promise<BankAccount[]>;
  getBankAccountById(accountId: string, adminId: string): Promise<BankAccount | null>;
  getDefaultBankAccount(adminId: string): Promise<BankAccount | null>;
  saveBankAccount(bankAccount: BankAccount, adminId: string): Promise<void>;
  updateBankAccount(accountId: string, updates: Partial<BankAccount>, adminId: string): Promise<void>;
  deleteBankAccount(accountId: string, adminId: string): Promise<void>;
}

/**
 * Expense data access interface
 */
export interface IExpenseDataAccess {
  getExpenses(adminId: string): Promise<Expense[]>;
  getExpenseById(expenseId: string, adminId: string): Promise<Expense | null>;
  saveExpense(expense: Expense, adminId: string): Promise<void>;
  updateExpense(expenseId: string, updates: Partial<Expense>, adminId: string): Promise<void>;
  deleteExpense(expenseId: string, adminId: string): Promise<void>;
}

/**
 * Complete data access layer interface
 */
export interface IDataAccessLayer {
  users: IUserDataAccess;
  bookings: IBookingDataAccess;
  vehicles: IVehicleDataAccess;
  bankAccounts: IBankAccountDataAccess;
  expenses: IExpenseDataAccess;
  generateId(): string;
  initialize(): Promise<void>;
}

