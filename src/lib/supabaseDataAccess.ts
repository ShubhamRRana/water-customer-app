/**
 * Supabase Data Access Layer Implementation
 * 
 * Implements IDataAccessLayer using Supabase client.
 * Handles multi-role users, date serialization, and real-time subscriptions.
 */

import { supabase } from './supabaseClient';
import {
  IDataAccessLayer,
  IUserDataAccess,
  IBookingDataAccess,
  IVehicleDataAccess,
  IBankAccountDataAccess,
  IExpenseDataAccess,
  SubscriptionCallback,
  CollectionSubscriptionCallback,
  Unsubscribe,
  PaginationOptions,
  BookingQueryOptions,
} from './dataAccess.interface';
import { SubscriptionManager } from '../utils/subscriptionManager';
import {
  User,
  CustomerUser,
  DriverUser,
  AdminUser,
  Booking,
  Vehicle,
  Address,
  BankAccount,
  Expense,
  isCustomerUser,
  isDriverUser,
  isAdminUser,
} from '../types/index';
import {
  DataAccessError,
  NotFoundError,
} from '../utils/errors';
import {
  deserializeBookingDates,
  deserializeVehicleDates,
  serializeDate,
  deserializeDate,
} from '../utils/dateSerialization';

/**
 * Database row types (snake_case as stored in Supabase)
 */
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRoleRow {
  user_id: string;
  role: 'customer' | 'driver' | 'admin';
  created_at: string;
}

interface CustomerRow {
  user_id: string;
  saved_addresses: unknown; // JSONB
  created_at: string;
  updated_at: string;
}

interface DriverRow {
  user_id: string;
  vehicle_number: string;
  license_number: string;
  license_expiry: string;
  driver_license_image_url: string;
  vehicle_registration_image_url: string;
  total_earnings: number;
  completed_orders: number;
  created_by_admin: boolean;
  created_by_admin_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminRow {
  user_id: string;
  business_name: string | null;
  created_at: string;
  updated_at: string;
}

interface BookingRow {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  agency_id: string | null;
  agency_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  status: string;
  tanker_size: number;
  quantity: number | null;
  base_price: number;
  distance_charge: number;
  total_price: number;
  delivery_address: unknown; // JSONB
  distance: number;
  scheduled_for: string | null;
  payment_status: string;
  payment_id: string | null;
  cancellation_reason: string | null;
  can_cancel: boolean;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
}

interface VehicleRow {
  id: string;
  agency_id: string;
  vehicle_number: string;
  insurance_company_name: string;
  insurance_expiry_date: string;
  vehicle_capacity: number;
  amount: number | null;
  created_at: string;
  updated_at: string;
}

interface BankAccountRow {
  id: string;
  admin_id: string;
  bank_name: string | null;
  qr_code_image_url: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface ExpenseRow {
  id: string;
  admin_id: string;
  expense_type: 'diesel' | 'maintenance';
  amount: number;
  description: string | null;
  receipt_image_url: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Helper: Get current user ID from Supabase Auth session
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Helper: Map database user row + role data to User union type
 */
function mapUserFromDb(
  userRow: UserRow,
  roles: UserRoleRow[],
  customerData?: CustomerRow | null,
  driverData?: DriverRow | null,
  adminData?: AdminRow | null,
  selectedRole?: 'customer' | 'driver' | 'admin'
): User | null {
  if (roles.length === 0) {
    return null;
  }

  // If selectedRole is provided, use that role; otherwise use the first role
  const role = selectedRole || roles[0]!.role;

  const baseUser = {
    id: userRow.id,
    email: userRow.email,
    password: userRow.password_hash, // Temporary, will be removed after auth migration
    name: userRow.name,
    ...(userRow.phone && { phone: userRow.phone }),
    createdAt: deserializeDate(userRow.created_at) || new Date(),
  };

  switch (role) {
    case 'customer': {
      if (!customerData) {
        return null;
      }
      const customer: CustomerUser = {
        ...baseUser,
        role: 'customer',
        savedAddresses: (customerData.saved_addresses as Address[]) || [],
      };
      return customer;
    }

    case 'driver': {
      if (!driverData) {
        return null;
      }
      const licenseExpiry = deserializeDate(driverData.license_expiry);
      const driver: DriverUser = {
        ...baseUser,
        role: 'driver',
        vehicleNumber: driverData.vehicle_number,
        licenseNumber: driverData.license_number,
        ...(licenseExpiry !== null && { licenseExpiry }),
        driverLicenseImage: driverData.driver_license_image_url,
        vehicleRegistrationImage: driverData.vehicle_registration_image_url,
        totalEarnings: Number(driverData.total_earnings),
        completedOrders: driverData.completed_orders,
        createdByAdmin: driverData.created_by_admin,
        ...(driverData.created_by_admin_id && { createdByAdminId: driverData.created_by_admin_id }),
        ...(driverData.emergency_contact_name && { emergencyContactName: driverData.emergency_contact_name }),
        ...(driverData.emergency_contact_phone && { emergencyContactPhone: driverData.emergency_contact_phone }),
      };
      return driver;
    }

    case 'admin': {
      const admin: AdminUser = {
        ...baseUser,
        role: 'admin',
        ...(adminData?.business_name && { businessName: adminData.business_name }),
      };
      return admin;
    }

    default:
      return null;
  }
}

/**
 * Helper: Map User to database rows (users + user_roles + role table)
 */
async function mapUserToDb(user: User): Promise<{
  userRow: Partial<UserRow>;
  roleRows: UserRoleRow[];
  customerRow?: Partial<CustomerRow>;
  driverRow?: Partial<DriverRow>;
  adminRow?: Partial<AdminRow>;
}> {
  const userRow: Partial<UserRow> = {
    id: user.id,
    email: user.email,
    password_hash: user.password, // Temporary
    name: user.name,
    phone: user.phone || null,
    created_at: serializeDate(user.createdAt) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const roleRows: UserRoleRow[] = [{
    user_id: user.id,
    role: user.role,
    created_at: new Date().toISOString(),
  }];

  let customerRow: Partial<CustomerRow> | undefined;
  let driverRow: Partial<DriverRow> | undefined;
  let adminRow: Partial<AdminRow> | undefined;

  if (isCustomerUser(user)) {
    customerRow = {
      user_id: user.id,
      saved_addresses: user.savedAddresses || [],
      created_at: serializeDate(user.createdAt) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else if (isDriverUser(user)) {
    driverRow = {
      user_id: user.id,
      vehicle_number: user.vehicleNumber || '',
      license_number: user.licenseNumber || '',
      license_expiry: serializeDate(user.licenseExpiry) || '',
      driver_license_image_url: user.driverLicenseImage || '',
      vehicle_registration_image_url: user.vehicleRegistrationImage || '',
      total_earnings: user.totalEarnings || 0,
      completed_orders: user.completedOrders || 0,
      created_by_admin: user.createdByAdmin || false,
      created_by_admin_id: (user as DriverUser).createdByAdminId || null,
      emergency_contact_name: user.emergencyContactName || null,
      emergency_contact_phone: user.emergencyContactPhone || null,
      created_at: serializeDate(user.createdAt) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else if (isAdminUser(user)) {
    adminRow = {
      user_id: user.id,
      business_name: user.businessName || null,
      created_at: serializeDate(user.createdAt) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    userRow,
    roleRows,
    ...(customerRow && { customerRow }),
    ...(driverRow && { driverRow }),
    ...(adminRow && { adminRow }),
  };
}

/**
 * Helper: Map BookingRow to Booking
 */
function mapBookingFromDb(row: BookingRow): Booking {
  const deserialized = deserializeBookingDates({
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scheduledFor: row.scheduled_for,
    acceptedAt: row.accepted_at,
    deliveredAt: row.delivered_at,
  });

  const deliveryAddress = row.delivery_address as Address;

  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    ...(row.agency_id && { agencyId: row.agency_id }),
    ...(row.agency_name && { agencyName: row.agency_name }),
    ...(row.driver_id && { driverId: row.driver_id }),
    ...(row.driver_name && { driverName: row.driver_name }),
    ...(row.driver_phone && { driverPhone: row.driver_phone }),
    status: row.status as Booking['status'],
    tankerSize: row.tanker_size,
    ...(row.quantity !== null && row.quantity !== undefined && { quantity: row.quantity }),
    basePrice: Number(row.base_price),
    distanceCharge: Number(row.distance_charge),
    totalPrice: Number(row.total_price),
    deliveryAddress,
    distance: Number(row.distance),
    ...(deserialized.scheduledFor && { scheduledFor: deserialized.scheduledFor }),
    paymentStatus: row.payment_status as Booking['paymentStatus'],
    ...(row.payment_id && { paymentId: row.payment_id }),
    ...(row.cancellation_reason && { cancellationReason: row.cancellation_reason }),
    canCancel: row.can_cancel,
    createdAt: deserialized.createdAt,
    updatedAt: deserialized.updatedAt,
    ...(deserialized.acceptedAt && { acceptedAt: deserialized.acceptedAt }),
    ...(deserialized.deliveredAt && { deliveredAt: deserialized.deliveredAt }),
  };
}

/**
 * Helper: Map Booking to BookingRow
 */
function mapBookingToDb(booking: Booking): Partial<BookingRow> {
  return {
    id: booking.id,
    customer_id: booking.customerId,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone,
    agency_id: booking.agencyId || null,
    agency_name: booking.agencyName || null,
    driver_id: booking.driverId || null,
    driver_name: booking.driverName || null,
    driver_phone: booking.driverPhone || null,
    status: booking.status,
    tanker_size: booking.tankerSize,
    quantity: booking.quantity || 1,
    base_price: booking.basePrice,
    distance_charge: booking.distanceCharge,
    total_price: booking.totalPrice,
    delivery_address: booking.deliveryAddress,
    distance: booking.distance,
    scheduled_for: serializeDate(booking.scheduledFor),
    payment_status: booking.paymentStatus,
    payment_id: booking.paymentId || null,
    cancellation_reason: booking.cancellationReason || null,
    can_cancel: booking.canCancel,
    created_at: serializeDate(booking.createdAt) || new Date().toISOString(),
    updated_at: serializeDate(booking.updatedAt) || new Date().toISOString(),
    accepted_at: serializeDate(booking.acceptedAt),
    delivered_at: serializeDate(booking.deliveredAt),
  };
}

/**
 * Helper: Map VehicleRow to Vehicle
 */
function mapVehicleFromDb(row: VehicleRow): Vehicle {
  const deserialized = deserializeVehicleDates({
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    insuranceExpiryDate: row.insurance_expiry_date,
  });

  return {
    id: row.id,
    agencyId: row.agency_id,
    vehicleNumber: row.vehicle_number,
    insuranceCompanyName: row.insurance_company_name,
    insuranceExpiryDate: deserialized.insuranceExpiryDate,
    vehicleCapacity: row.vehicle_capacity,
    ...(row.amount != null && { amount: Number(row.amount) }),
    createdAt: deserialized.createdAt,
    updatedAt: deserialized.updatedAt,
  };
}

/**
 * Helper: Map Vehicle to VehicleRow
 */
function mapVehicleToDb(vehicle: Vehicle): Partial<VehicleRow> {
  return {
    id: vehicle.id,
    agency_id: vehicle.agencyId,
    vehicle_number: vehicle.vehicleNumber,
    insurance_company_name: vehicle.insuranceCompanyName,
    insurance_expiry_date: serializeDate(vehicle.insuranceExpiryDate) || new Date().toISOString(),
    vehicle_capacity: vehicle.vehicleCapacity,
    amount: vehicle.amount ?? null,
    created_at: serializeDate(vehicle.createdAt) || new Date().toISOString(),
    updated_at: serializeDate(vehicle.updatedAt) || new Date().toISOString(),
  };
}

/**
 * Helper: Map BankAccountRow to BankAccount
 */
function mapBankAccountFromDb(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    adminId: row.admin_id,
    bankName: row.bank_name || '',
    qrCodeImageUrl: row.qr_code_image_url,
    isDefault: row.is_default,
    createdAt: deserializeDate(row.created_at) || new Date(),
    updatedAt: deserializeDate(row.updated_at) || new Date(),
  };
}

/**
 * Helper: Map BankAccount to BankAccountRow
 */
function mapBankAccountToDb(bankAccount: BankAccount): Partial<BankAccountRow> {
  return {
    id: bankAccount.id,
    admin_id: bankAccount.adminId,
    bank_name: bankAccount.bankName || null,
    qr_code_image_url: bankAccount.qrCodeImageUrl,
    is_default: bankAccount.isDefault,
    created_at: serializeDate(bankAccount.createdAt) || new Date().toISOString(),
    updated_at: serializeDate(bankAccount.updatedAt) || new Date().toISOString(),
  };
}

/**
 * Helper: Map ExpenseRow to Expense
 */
function mapExpenseFromDb(row: ExpenseRow): Expense {
  return {
    id: row.id,
    adminId: row.admin_id,
    expenseType: row.expense_type,
    amount: Number(row.amount),
    ...(row.description && { description: row.description }),
    ...(row.receipt_image_url && { receiptImageUrl: row.receipt_image_url }),
    expenseDate: deserializeDate(row.expense_date) || new Date(),
    createdAt: deserializeDate(row.created_at) || new Date(),
    updatedAt: deserializeDate(row.updated_at) || new Date(),
  };
}

/**
 * Helper: Map Expense to ExpenseRow
 */
function mapExpenseToDb(expense: Expense): Partial<ExpenseRow> {
  return {
    id: expense.id,
    admin_id: expense.adminId,
    expense_type: expense.expenseType,
    amount: expense.amount,
    description: expense.description || null,
    receipt_image_url: expense.receiptImageUrl || null,
    expense_date: serializeDate(expense.expenseDate) || new Date().toISOString(),
    created_at: serializeDate(expense.createdAt) || new Date().toISOString(),
    updated_at: serializeDate(expense.updatedAt) || new Date().toISOString(),
  };
}

/**
 * Supabase User Data Access Implementation
 */
class SupabaseUserDataAccess implements IUserDataAccess {
  async getCurrentUser(): Promise<User | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return null;
      }
      return await this.getUserById(userId);
    } catch (error) {
      throw new DataAccessError('Failed to get current user', 'getCurrentUser', { error });
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      const { userRow, roleRows, customerRow, driverRow, adminRow } = await mapUserToDb(user);

      // Insert or update user
      const { error: userError } = await supabase
        .from('users')
        .upsert(userRow, { onConflict: 'id' });

      if (userError) {
        throw userError;
      }

      // Insert or update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(roleRows[0], { onConflict: 'user_id,role' });

      if (roleError) {
        throw roleError;
      }

      // Insert or update role-specific data
      if (customerRow) {
        const { error } = await supabase
          .from('customers')
          .upsert(customerRow, { onConflict: 'user_id' });
        if (error) throw error;
      } else if (driverRow) {
        const { error } = await supabase
          .from('drivers')
          .upsert(driverRow, { onConflict: 'user_id' });
        if (error) throw error;
      } else if (adminRow) {
        const { error } = await supabase
          .from('admins')
          .upsert(adminRow, { onConflict: 'user_id' });
        if (error) throw error;
      }
    } catch (error) {
      throw new DataAccessError('Failed to save user', 'saveUser', { error });
    }
  }

  async removeUser(): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      // Delete user (cascades to user_roles and role tables)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new DataAccessError('Failed to remove user', 'removeUser', { error });
    }
  }

  async deleteCustomerAccount(customerId: string): Promise<void> {
    try {
      // Delete in order: bookings (FK to customer), then customers, then only the customer role (so admin/driver for same email remain)
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('customer_id', customerId);

      if (bookingsError) {
        throw new DataAccessError('Failed to delete customer bookings', 'deleteCustomerAccount', { error: bookingsError, customerId });
      }

      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .eq('user_id', customerId);

      if (customersError) {
        throw new DataAccessError('Failed to delete customer profile', 'deleteCustomerAccount', { error: customersError, customerId });
      }

      // Remove only the customer role so the same user can still have admin/driver
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', customerId)
        .eq('role', 'customer');

      if (rolesError) {
        throw new DataAccessError('Failed to delete user roles', 'deleteCustomerAccount', { error: rolesError, customerId });
      }

      // Delete user row only if no roles remain (user had only customer)
      const { data: remainingRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', customerId);

      if (remainingRoles?.length === 0) {
        const { error: usersError } = await supabase
          .from('users')
          .delete()
          .eq('id', customerId);

        if (usersError) {
          throw new DataAccessError('Failed to delete user', 'deleteCustomerAccount', { error: usersError, customerId });
        }
      }
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError('Failed to delete customer account', 'deleteCustomerAccount', { error, customerId });
    }
  }

  async deleteAdminAccount(adminId: string): Promise<void> {
    try {
      // Delete in order: expenses, bank_accounts, admins, then only the admin role (so customer/driver for same email remain)
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('admin_id', adminId);

      if (expensesError) {
        throw new DataAccessError('Failed to delete admin expenses', 'deleteAdminAccount', { error: expensesError, adminId });
      }

      const { error: bankAccountsError } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('admin_id', adminId);

      if (bankAccountsError) {
        throw new DataAccessError('Failed to delete admin bank accounts', 'deleteAdminAccount', { error: bankAccountsError, adminId });
      }

      const { error: adminsError } = await supabase
        .from('admins')
        .delete()
        .eq('user_id', adminId);

      if (adminsError) {
        throw new DataAccessError('Failed to delete admin profile', 'deleteAdminAccount', { error: adminsError, adminId });
      }

      // Remove only the admin role so the same user can still have customer/driver
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', adminId)
        .eq('role', 'admin');

      if (rolesError) {
        throw new DataAccessError('Failed to delete user roles', 'deleteAdminAccount', { error: rolesError, adminId });
      }

      // Delete user row only if no roles remain (user had only admin)
      const { data: remainingRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', adminId);

      if (remainingRoles?.length === 0) {
        const { error: usersError } = await supabase
          .from('users')
          .delete()
          .eq('id', adminId);

        if (usersError) {
          throw new DataAccessError('Failed to delete user', 'deleteAdminAccount', { error: usersError, adminId });
        }
      }
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError('Failed to delete admin account', 'deleteAdminAccount', { error, adminId });
    }
  }

  async deleteDriverAccount(driverId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('delete_driver_account', {
        p_driver_id: driverId,
      });

      if (error) {
        throw new DataAccessError(
          error.message || 'Failed to delete driver account',
          'deleteDriverAccount',
          { error, driverId }
        );
      }
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError('Failed to delete driver account', 'deleteDriverAccount', { error, driverId });
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      // Fetch user
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (userError || !userRow) {
        return null;
      }

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', id);

      if (rolesError || !roles || roles.length === 0) {
        return null;
      }

      // Fetch role-specific data
      let customerData: CustomerRow | null = null;
      let driverData: DriverRow | null = null;
      let adminData: AdminRow | null = null;

      for (const role of roles) {
        if (role.role === 'customer') {
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', id)
            .single();
          customerData = data;
        } else if (role.role === 'driver') {
          const { data } = await supabase
            .from('drivers')
            .select('*')
            .eq('user_id', id)
            .single();
          driverData = data;
        } else if (role.role === 'admin') {
          const { data } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', id)
            .single();
          adminData = data;
        }
      }

      // Map to User type (use first role if multiple)
      return mapUserFromDb(userRow as UserRow, roles as UserRoleRow[], customerData, driverData, adminData);
    } catch (error) {
      throw new DataAccessError('Failed to get user by id', 'getUserById', { error, id });
    }
  }

  async getUsers(options?: { createdByAdminId?: string }): Promise<User[]> {
    try {
      // Fetch all users
      const { data: userRows, error: userError } = await supabase
        .from('users')
        .select('*');

      if (userError) {
        throw userError;
      }

      if (!userRows || userRows.length === 0) {
        return [];
      }

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        throw rolesError;
      }

      // Fetch all role-specific data; when createdByAdminId is set, only drivers created by that admin
      const { data: customers } = await supabase.from('customers').select('*');
      let driversQuery = supabase.from('drivers').select('*');
      if (options?.createdByAdminId) {
        driversQuery = driversQuery.eq('created_by_admin_id', options.createdByAdminId);
      }
      const { data: drivers } = await driversQuery;
      const { data: admins } = await supabase.from('admins').select('*');

      // Group roles by user_id
      const rolesByUserId = new Map<string, UserRoleRow[]>();
      (allRoles || []).forEach((role) => {
        const existing = rolesByUserId.get(role.user_id) || [];
        existing.push(role as UserRoleRow);
        rolesByUserId.set(role.user_id, existing);
      });

      // Map customers, drivers, admins by user_id
      const customersByUserId = new Map<string, CustomerRow>();
      (customers || []).forEach((c) => {
        customersByUserId.set(c.user_id, c as CustomerRow);
      });

      const driversByUserId = new Map<string, DriverRow>();
      (drivers || []).forEach((d) => {
        driversByUserId.set(d.user_id, d as DriverRow);
      });

      const adminsByUserId = new Map<string, AdminRow>();
      (admins || []).forEach((a) => {
        adminsByUserId.set(a.user_id, a as AdminRow);
      });

      // Map to User array (one User per role)
      const users: User[] = [];
      for (const userRow of userRows) {
        const roles = rolesByUserId.get(userRow.id) || [];
        for (const role of roles) {
          const user = mapUserFromDb(
            userRow as UserRow,
            [role],
            customersByUserId.get(userRow.id),
            driversByUserId.get(userRow.id),
            adminsByUserId.get(userRow.id),
            role.role
          );
          if (user) {
            users.push(user);
          }
        }
      }

      return users;
    } catch (error) {
      throw new DataAccessError('Failed to get users', 'getUsers', { error });
    }
  }

  async saveUserToCollection(user: User): Promise<void> {
    // In Supabase, saveUser already handles this
    await this.saveUser(user);
  }

  async updateUserProfile(id: string, updates: Partial<User>): Promise<void> {
    try {
      // Get existing user
      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User', id);
      }

      // Merge updates
      const updatedUser = { ...existingUser, ...updates } as User;

      // Save updated user
      await this.saveUser(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to update user profile', 'updateUserProfile', { error, id });
    }
  }

  subscribeToUserUpdates(id: string, callback: SubscriptionCallback<User>): Unsubscribe {
    const channelName = `user:${id}`;
    
    // Subscribe to users table updates
    const unsubscribeUsers = SubscriptionManager.subscribe(
      {
        channelName: `${channelName}:users`,
        table: 'users',
        filter: `id=eq.${id}`,
        event: '*',
      },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
          return;
        }
        
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          // Fetch full user data with roles
          try {
            const user = await this.getUserById(id);
            if (user) {
              callback(user);
            }
          } catch (error) {
            // Error fetching user in subscription
          }
        }
      }
    );

    // Subscribe to user_roles table updates for role changes
    const unsubscribeRoles = SubscriptionManager.subscribe(
      {
        channelName: `${channelName}:roles`,
        table: 'user_roles',
        filter: `user_id=eq.${id}`,
        event: '*',
      },
      async (_payload) => {
        // When roles change, fetch updated user
        try {
          const user = await this.getUserById(id);
          if (user) {
            callback(user);
          }
        } catch (error) {
          // Error fetching user in role subscription
        }
      }
    );

    // Subscribe to role-specific table updates
    const unsubscribeCustomers = SubscriptionManager.subscribe(
      {
        channelName: `${channelName}:customers`,
        table: 'customers',
        filter: `user_id=eq.${id}`,
        event: '*',
      },
      async (_payload) => {
        try {
          const user = await this.getUserById(id);
          if (user) {
            callback(user);
          }
        } catch (error) {
          // Error fetching user in customer subscription
        }
      }
    );

    const unsubscribeDrivers = SubscriptionManager.subscribe(
      {
        channelName: `${channelName}:drivers`,
        table: 'drivers',
        filter: `user_id=eq.${id}`,
        event: '*',
      },
      async (_payload) => {
        try {
          const user = await this.getUserById(id);
          if (user) {
            callback(user);
          }
        } catch (error) {
          // Error fetching user in driver subscription
        }
      }
    );

    const unsubscribeAdmins = SubscriptionManager.subscribe(
      {
        channelName: `${channelName}:admins`,
        table: 'admins',
        filter: `user_id=eq.${id}`,
        event: '*',
      },
      async (_payload) => {
        try {
          const user = await this.getUserById(id);
          if (user) {
            callback(user);
          }
        } catch (error) {
          // Error fetching user in admin subscription
        }
      }
    );

    // Return combined unsubscribe function
    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
      unsubscribeCustomers();
      unsubscribeDrivers();
      unsubscribeAdmins();
    };
  }

  subscribeToAllUsersUpdates(callback: CollectionSubscriptionCallback<User>): Unsubscribe {
    const channelName = 'all_users';
    
    // Subscribe to all users table changes
    const unsubscribeUsers = SubscriptionManager.subscribe(
      {
        channelName: `${channelName}:users`,
        table: 'users',
        event: '*',
      },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          try {
            const userId = payload.new?.id || payload.old?.id;
            if (userId) {
              const user = await this.getUserById(userId);
              if (user) {
                callback(user, payload.eventType === 'INSERT' ? 'INSERT' : 'UPDATE');
              }
            }
          } catch (error) {
            // Error in all users subscription
          }
        } else if (payload.eventType === 'DELETE') {
          const userId = payload.old?.id;
          if (userId) {
            callback(null as any, 'DELETE');
          }
        }
      }
    );

    // Subscribe to user_roles changes
    const unsubscribeRoles = SubscriptionManager.subscribe(
      {
        channelName: `${channelName}:roles`,
        table: 'user_roles',
        event: '*',
      },
      async (payload) => {
        if (payload.new?.user_id) {
          try {
            const user = await this.getUserById(payload.new.user_id);
            if (user) {
              callback(user, 'UPDATE');
            }
          } catch (error) {
            // Error in user roles subscription
          }
        }
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
    };
  }
}

/**
 * Supabase Booking Data Access Implementation
 */
class SupabaseBookingDataAccess implements IBookingDataAccess {
  async saveBooking(booking: Booking): Promise<void> {
    try {
      const bookingRow = mapBookingToDb(booking);
      const { error } = await supabase
        .from('bookings')
        .insert(bookingRow);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new DataAccessError('Failed to save booking', 'saveBooking', { error });
    }
  }

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    try {
      // Get existing booking
      const existing = await this.getBookingById(bookingId);
      if (!existing) {
        throw new NotFoundError('Booking', bookingId);
      }

      // Merge updates
      const updated = { ...existing, ...updates } as Booking;
      const bookingRow = mapBookingToDb(updated);

      // Update in database
      const { error } = await supabase
        .from('bookings')
        .update(bookingRow)
        .eq('id', bookingId);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to update booking', 'updateBooking', { error, bookingId });
    }
  }

  async getBookings(options?: PaginationOptions): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*');

      // Apply sorting
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        const endRange = options.limit ? options.offset + options.limit - 1 : options.offset + 999;
        query = query.range(options.offset, endRange);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapBookingFromDb(row as BookingRow));
    } catch (error) {
      throw new DataAccessError('Failed to get bookings', 'getBookings', { error });
    }
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error || !data) {
        return null;
      }

      return mapBookingFromDb(data as BookingRow);
    } catch (error) {
      throw new DataAccessError('Failed to get booking by id', 'getBookingById', { error, bookingId });
    }
  }

  async getBookingsByCustomer(customerId: string, options?: PaginationOptions): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customerId);

      // Apply sorting
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        const endRange = options.limit ? options.offset + options.limit - 1 : options.offset + 999;
        query = query.range(options.offset, endRange);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapBookingFromDb(row as BookingRow));
    } catch (error) {
      throw new DataAccessError('Failed to get bookings by customer', 'getBookingsByCustomer', { error, customerId });
    }
  }

  async getBookingsByDriver(driverId: string, options?: BookingQueryOptions): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('driver_id', driverId);

      // Apply status filtering
      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      // Apply sorting
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        const endRange = options.limit ? options.offset + options.limit - 1 : options.offset + 999;
        query = query.range(options.offset, endRange);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapBookingFromDb(row as BookingRow));
    } catch (error) {
      throw new DataAccessError('Failed to get bookings by driver', 'getBookingsByDriver', { error, driverId });
    }
  }

  async getAvailableBookings(options?: PaginationOptions): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null);

      // Apply sorting
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        const endRange = options.limit ? options.offset + options.limit - 1 : options.offset + 999;
        query = query.range(options.offset, endRange);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapBookingFromDb(row as BookingRow));
    } catch (error) {
      throw new DataAccessError('Failed to get available bookings', 'getAvailableBookings', { error });
    }
  }

  subscribeToBookingUpdates(bookingId: string, callback: SubscriptionCallback<Booking>): Unsubscribe {
    const channelName = `booking:${bookingId}`;
    
    return SubscriptionManager.subscribe(
      {
        channelName,
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
        event: '*',
      },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
          return;
        }
        
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          if (payload.new) {
            try {
              const booking = mapBookingFromDb(payload.new as BookingRow);
              callback(booking);
            } catch (error) {
              // Error mapping booking in subscription
            }
          }
        }
      }
    );
  }
}

/**
 * Supabase Vehicle Data Access Implementation
 */
class SupabaseVehicleDataAccess implements IVehicleDataAccess {
  async saveVehicle(vehicle: Vehicle): Promise<void> {
    try {
      const vehicleRow = mapVehicleToDb(vehicle);
      const { error } = await supabase
        .from('vehicles')
        .insert(vehicleRow);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new DataAccessError('Failed to save vehicle', 'saveVehicle', { error });
    }
  }

  async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
    try {
      // Get existing vehicle
      const existing = await this.getVehicleById(vehicleId);
      if (!existing) {
        throw new NotFoundError('Vehicle', vehicleId);
      }

      // Merge updates
      const updated = { ...existing, ...updates } as Vehicle;
      const vehicleRow = mapVehicleToDb(updated);

      // Update in database
      const { error } = await supabase
        .from('vehicles')
        .update(vehicleRow)
        .eq('id', vehicleId);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to update vehicle', 'updateVehicle', { error, vehicleId });
    }
  }

  async getVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapVehicleFromDb(row as VehicleRow));
    } catch (error) {
      throw new DataAccessError('Failed to get vehicles', 'getVehicles', { error });
    }
  }

  async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (error || !data) {
        return null;
      }

      return mapVehicleFromDb(data as VehicleRow);
    } catch (error) {
      throw new DataAccessError('Failed to get vehicle by id', 'getVehicleById', { error, vehicleId });
    }
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      // Check if vehicle exists
      const existing = await this.getVehicleById(vehicleId);
      if (!existing) {
        throw new NotFoundError('Vehicle', vehicleId);
      }

      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to delete vehicle', 'deleteVehicle', { error, vehicleId });
    }
  }

  async getVehiclesByAgency(agencyId: string): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapVehicleFromDb(row as VehicleRow));
    } catch (error) {
      throw new DataAccessError('Failed to get vehicles by agency', 'getVehiclesByAgency', { error, agencyId });
    }
  }

  subscribeToVehicleUpdates(vehicleId: string, callback: SubscriptionCallback<Vehicle>): Unsubscribe {
    const channelName = `vehicle:${vehicleId}`;
    
    return SubscriptionManager.subscribe(
      {
        channelName,
        table: 'vehicles',
        filter: `id=eq.${vehicleId}`,
        event: '*',
      },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
          return;
        }
        
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          if (payload.new) {
            try {
              const vehicle = mapVehicleFromDb(payload.new as VehicleRow);
              callback(vehicle);
            } catch (error) {
              // Error mapping vehicle in subscription
            }
          }
        }
      }
    );
  }

  subscribeToAgencyVehiclesUpdates(agencyId: string, callback: CollectionSubscriptionCallback<Vehicle>): Unsubscribe {
    const channelName = `agency_vehicles:${agencyId}`;
    
    return SubscriptionManager.subscribe(
      {
        channelName,
        table: 'vehicles',
        filter: `agency_id=eq.${agencyId}`,
        event: '*',
      },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          if (payload.old) {
            try {
              const vehicle = mapVehicleFromDb(payload.old as VehicleRow);
              callback(vehicle, 'DELETE');
            } catch (error) {
              // Error mapping vehicle in subscription
            }
          }
          return;
        }
        
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          if (payload.new) {
            try {
              const vehicle = mapVehicleFromDb(payload.new as VehicleRow);
              callback(vehicle, payload.eventType === 'INSERT' ? 'INSERT' : 'UPDATE');
            } catch (error) {
              // Error mapping vehicle in subscription
            }
          }
        }
      }
    );
  }
}

/**
 * Supabase Bank Account Data Access Implementation
 */
class SupabaseBankAccountDataAccess implements IBankAccountDataAccess {
  async getBankAccounts(adminId: string): Promise<BankAccount[]> {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapBankAccountFromDb(row as BankAccountRow));
    } catch (error) {
      throw new DataAccessError('Failed to get bank accounts', 'getBankAccounts', { error, adminId });
    }
  }

  async getBankAccountById(accountId: string, adminId: string): Promise<BankAccount | null> {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('admin_id', adminId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      return mapBankAccountFromDb(data as BankAccountRow);
    } catch (error) {
      throw new DataAccessError('Failed to get bank account by id', 'getBankAccountById', { error, accountId, adminId });
    }
  }

  async getDefaultBankAccount(adminId: string): Promise<BankAccount | null> {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('admin_id', adminId)
        .eq('is_default', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      return mapBankAccountFromDb(data as BankAccountRow);
    } catch (error) {
      throw new DataAccessError('Failed to get default bank account', 'getDefaultBankAccount', { error, adminId });
    }
  }

  async saveBankAccount(bankAccount: BankAccount, adminId: string): Promise<void> {
    try {
      // Ensure the account belongs to this admin
      if (bankAccount.adminId !== adminId) {
        throw new Error('Bank account does not belong to this admin');
      }

      // If this account is set as default, unset all other accounts for this admin
      if (bankAccount.isDefault) {
        const { error: updateError } = await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .eq('admin_id', adminId)
          .neq('id', bankAccount.id);

        if (updateError) {
          throw updateError;
        }
      }

      const bankAccountRow = mapBankAccountToDb(bankAccount);
      const { error } = await supabase
        .from('bank_accounts')
        .upsert(bankAccountRow, { onConflict: 'id' });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new DataAccessError('Failed to save bank account', 'saveBankAccount', { error, adminId });
    }
  }

  async updateBankAccount(accountId: string, updates: Partial<BankAccount>, adminId: string): Promise<void> {
    try {
      // First verify the account belongs to this admin
      const existing = await this.getBankAccountById(accountId, adminId);
      if (!existing) {
        throw new NotFoundError('Bank account not found or does not belong to this admin');
      }

      // If setting as default, unset all other accounts for this admin
      if (updates.isDefault === true) {
        const { error: updateError } = await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .eq('admin_id', adminId)
          .neq('id', accountId);

        if (updateError) {
          throw updateError;
        }
      }

      // Map updates to database format
      const updateRow: Partial<BankAccountRow> = {};
      if (updates.bankName !== undefined) updateRow.bank_name = updates.bankName || null;
      if (updates.qrCodeImageUrl !== undefined) updateRow.qr_code_image_url = updates.qrCodeImageUrl;
      if (updates.isDefault !== undefined) updateRow.is_default = updates.isDefault;
      if (updates.updatedAt !== undefined) updateRow.updated_at = serializeDate(updates.updatedAt) || new Date().toISOString();

      const { error } = await supabase
        .from('bank_accounts')
        .update(updateRow)
        .eq('id', accountId)
        .eq('admin_id', adminId);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to update bank account', 'updateBankAccount', { error, accountId, adminId });
    }
  }

  async deleteBankAccount(accountId: string, adminId: string): Promise<void> {
    try {
      // First verify the account belongs to this admin
      const existing = await this.getBankAccountById(accountId, adminId);
      if (!existing) {
        throw new NotFoundError('Bank account not found or does not belong to this admin');
      }

      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId)
        .eq('admin_id', adminId);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to delete bank account', 'deleteBankAccount', { error, accountId, adminId });
    }
  }
}

/**
 * Supabase Expense Data Access Implementation
 */
class SupabaseExpenseDataAccess implements IExpenseDataAccess {
  async getExpenses(adminId: string): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('admin_id', adminId)
        .order('expense_date', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((row) => mapExpenseFromDb(row as ExpenseRow));
    } catch (error) {
      throw new DataAccessError('Failed to get expenses', 'getExpenses', { error, adminId });
    }
  }

  async getExpenseById(expenseId: string, adminId: string): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .eq('admin_id', adminId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      return mapExpenseFromDb(data as ExpenseRow);
    } catch (error) {
      throw new DataAccessError('Failed to get expense by id', 'getExpenseById', { error, expenseId, adminId });
    }
  }

  async saveExpense(expense: Expense, adminId: string): Promise<void> {
    try {
      // Ensure the expense belongs to this admin
      if (expense.adminId !== adminId) {
        throw new Error('Expense does not belong to this admin');
      }

      const expenseRow = mapExpenseToDb(expense);
      const { error } = await supabase
        .from('expenses')
        .insert(expenseRow);

      if (error) {
        // Include Supabase error details in the message for better debugging
        const errorMsg = error.message || error.hint || 'Unknown database error';
        throw new DataAccessError(`Failed to save expense: ${errorMsg}`, 'saveExpense', { 
          error, 
          adminId,
          supabaseError: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        });
      }
    } catch (error) {
      // If it's already a DataAccessError, rethrow it
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError('Failed to save expense', 'saveExpense', { error, adminId });
    }
  }

  async updateExpense(expenseId: string, updates: Partial<Expense>, adminId: string): Promise<void> {
    try {
      // First verify the expense belongs to this admin
      const existing = await this.getExpenseById(expenseId, adminId);
      if (!existing) {
        throw new NotFoundError('Expense not found or does not belong to this admin');
      }

      // Map updates to database format
      const updateRow: Partial<ExpenseRow> = {};
      if (updates.expenseType !== undefined) updateRow.expense_type = updates.expenseType;
      if (updates.amount !== undefined) updateRow.amount = updates.amount;
      if (updates.description !== undefined) updateRow.description = updates.description || null;
      if (updates.receiptImageUrl !== undefined) updateRow.receipt_image_url = updates.receiptImageUrl || null;
      if (updates.expenseDate !== undefined) updateRow.expense_date = serializeDate(updates.expenseDate) || new Date().toISOString();
      if (updates.updatedAt !== undefined) updateRow.updated_at = serializeDate(updates.updatedAt) || new Date().toISOString();

      const { error } = await supabase
        .from('expenses')
        .update(updateRow)
        .eq('id', expenseId)
        .eq('admin_id', adminId);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to update expense', 'updateExpense', { error, expenseId, adminId });
    }
  }

  async deleteExpense(expenseId: string, adminId: string): Promise<void> {
    try {
      // First verify the expense belongs to this admin
      const existing = await this.getExpenseById(expenseId, adminId);
      if (!existing) {
        throw new NotFoundError('Expense not found or does not belong to this admin');
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('admin_id', adminId);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DataAccessError('Failed to delete expense', 'deleteExpense', { error, expenseId, adminId });
    }
  }
}

/**
 * Complete Supabase Data Access Layer
 */
export class SupabaseDataAccess implements IDataAccessLayer {
  users: IUserDataAccess;
  bookings: IBookingDataAccess;
  vehicles: IVehicleDataAccess;
  bankAccounts: IBankAccountDataAccess;
  expenses: IExpenseDataAccess;

  constructor() {
    this.users = new SupabaseUserDataAccess();
    this.bookings = new SupabaseBookingDataAccess();
    this.vehicles = new SupabaseVehicleDataAccess();
    this.bankAccounts = new SupabaseBankAccountDataAccess();
    this.expenses = new SupabaseExpenseDataAccess();
  }

  generateId(): string {
    // Use UUID v4 (Supabase uses UUIDs)
    // For compatibility, we can use a simple UUID generator
    // In production, you might want to use a library like 'uuid'
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async initialize(): Promise<void> {
    // Supabase doesn't need initialization like LocalStorage
    // Database schema is already set up
    // This method is kept for interface compatibility
    return Promise.resolve();
  }
}
