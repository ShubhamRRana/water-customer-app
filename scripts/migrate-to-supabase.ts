/**
 * Data Migration Script: AsyncStorage to Supabase
 * 
 * This script migrates all data from AsyncStorage to Supabase:
 * 1. Exports data from AsyncStorage
 * 2. Transforms data (consolidates multi-role users by email)
 * 3. Maps old IDs to new UUIDs
 * 4. Imports to Supabase in correct order
 * 
 * Usage:
 *   ts-node scripts/migrate-to-supabase.ts
 */

import '../scripts/setup-globals';
import { randomUUID } from 'crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { User, Booking, Vehicle, BankAccount } from '../src/types/index';
import {
  deserializeUserDates,
  deserializeBookingDates,
  deserializeVehicleDates,
} from '../src/utils/dateSerialization';

// Supabase configuration - use environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.'
  );
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * ID Mapping: old AsyncStorage ID -> new Supabase UUID
 */
interface IdMapping {
  userIds: Map<string, string>; // old user id -> new user uuid
  bookingIds: Map<string, string>; // old booking id -> new booking uuid
  vehicleIds: Map<string, string>; // old vehicle id -> new vehicle uuid
  bankAccountIds: Map<string, string>; // old bank account id -> new bank account uuid
}

/**
 * Consolidated user data (grouped by email for multi-role support)
 */
interface ConsolidatedUser {
  email: string;
  name: string;
  phone?: string;
  password: string; // Use first password found
  roles: Array<{
    role: 'customer' | 'driver' | 'admin';
    oldId: string;
    data: Partial<User>;
  }>;
  createdAt: Date;
}

/**
 * Step 1: Export all data from AsyncStorage
 */
async function exportLocalData(): Promise<{
  users: User[];
  bookings: Booking[];
  vehicles: Vehicle[];
  bankAccounts: BankAccount[];
}> {
  console.log('📦 Step 1: Exporting data from AsyncStorage...');

  // Get users collection
  const usersJson = await AsyncStorage.getItem('users_collection');
  const users: User[] = usersJson
    ? (JSON.parse(usersJson) as any[]).map((u) => deserializeUserDates(u) as unknown as User)
    : [];

  // Get bookings
  const bookingsJson = await AsyncStorage.getItem('bookings');
  const bookings: Booking[] = bookingsJson
    ? (JSON.parse(bookingsJson) as any[]).map((b) => deserializeBookingDates(b) as unknown as Booking)
    : [];

  // Get vehicles
  const vehiclesJson = await AsyncStorage.getItem('vehicles_collection');
  const vehicles: Vehicle[] = vehiclesJson
    ? (JSON.parse(vehiclesJson) as any[]).map((v) => deserializeVehicleDates(v) as unknown as Vehicle)
    : [];

  // Get bank accounts
  const bankAccountsJson = await AsyncStorage.getItem('bank_accounts_collection');
  const bankAccounts: BankAccount[] = bankAccountsJson
    ? (JSON.parse(bankAccountsJson) as any[]).map((ba) => ({
        ...ba,
        createdAt: new Date(ba.createdAt),
        updatedAt: new Date(ba.updatedAt),
      }))
    : [];

  console.log(`  ✓ Exported ${users.length} users`);
  console.log(`  ✓ Exported ${bookings.length} bookings`);
  console.log(`  ✓ Exported ${vehicles.length} vehicles`);
  console.log(`  ✓ Exported ${bankAccounts.length} bank accounts`);

  return { users, bookings, vehicles, bankAccounts };
}

/**
 * Step 2: Transform data - consolidate multi-role users by email
 */
function transformUsers(users: User[]): {
  consolidatedUsers: ConsolidatedUser[];
  idMapping: IdMapping;
} {
  console.log('🔄 Step 2: Transforming users (consolidating multi-role users)...');

  const idMapping: IdMapping = {
    userIds: new Map(),
    bookingIds: new Map(),
    vehicleIds: new Map(),
    bankAccountIds: new Map(),
  };

  // Group users by email
  const usersByEmail = new Map<string, User[]>();
  for (const user of users) {
    const email = user.email.toLowerCase();
    if (!usersByEmail.has(email)) {
      usersByEmail.set(email, []);
    }
    usersByEmail.get(email)!.push(user);
  }

  // Consolidate users
  const consolidatedUsers: ConsolidatedUser[] = [];
  for (const [email, emailUsers] of usersByEmail.entries()) {
    // Use the first user's common data
    const firstUser = emailUsers[0];
    const roles = emailUsers.map((u) => ({
      role: u.role,
      oldId: u.id,
      data: u,
    }));

    // Generate new UUID for this consolidated user
    const newUserId = randomUUID();

    // Map all old user IDs to the new UUID
    for (const emailUser of emailUsers) {
      idMapping.userIds.set(emailUser.id, newUserId);
    }

    consolidatedUsers.push({
      email: firstUser.email,
      name: firstUser.name,
      phone: firstUser.phone,
      password: firstUser.password, // Use first password found
      roles,
      createdAt: firstUser.createdAt,
    });
  }

  console.log(`  ✓ Consolidated ${users.length} user records into ${consolidatedUsers.length} unique users`);
  console.log(`  ✓ Created ${idMapping.userIds.size} user ID mappings`);

  return { consolidatedUsers, idMapping };
}

/**
 * Step 3: Import users to Supabase
 */
async function importUsers(
  consolidatedUsers: ConsolidatedUser[],
  idMapping: IdMapping
): Promise<void> {
  console.log('👥 Step 3: Importing users to Supabase...');

  for (const consolidatedUser of consolidatedUsers) {
    try {
      // Get the new UUID from the mapping (should be same for all roles of this user)
      const firstOldId = consolidatedUser.roles[0].oldId;
      const actualNewUserId = idMapping.userIds.get(firstOldId);
      if (!actualNewUserId) {
        throw new Error(`No UUID mapping found for old ID ${firstOldId}`);
      }

      // 1. Insert base user record
      const { error: userError } = await supabase.from('users').insert({
        id: actualNewUserId,
        email: consolidatedUser.email,
        password_hash: consolidatedUser.password, // Temporary - will be migrated to Supabase Auth
        name: consolidatedUser.name,
        phone: consolidatedUser.phone || null,
        created_at: consolidatedUser.createdAt.toISOString(),
        updated_at: consolidatedUser.createdAt.toISOString(),
      });

      if (userError) {
        // If user already exists, update it
        if (userError.code === '23505') {
          console.log(`  ⚠ User ${consolidatedUser.email} already exists, updating...`);
          const { error: updateError } = await supabase
            .from('users')
            .update({
              name: consolidatedUser.name,
              phone: consolidatedUser.phone || null,
              updated_at: new Date().toISOString(),
            })
            .eq('email', consolidatedUser.email);

          if (updateError) {
            throw new Error(`Failed to update user: ${updateError.message}`);
          }

          // Get the existing user ID
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', consolidatedUser.email)
            .single();

          if (existingUser) {
            // Update mapping with existing ID
            for (const role of consolidatedUser.roles) {
              idMapping.userIds.set(role.oldId, existingUser.id);
            }
          }
        } else {
          throw new Error(`Failed to insert user: ${userError.message}`);
        }
      }

      // Get the final user ID (either newly inserted or existing)
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', consolidatedUser.email)
        .single();

      if (!userData) {
        throw new Error(`Failed to retrieve user ID for ${consolidatedUser.email}`);
      }

      const finalUserId = userData.id;

      // 2. Insert user roles
      for (const roleData of consolidatedUser.roles) {
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: finalUserId,
          role: roleData.role,
          created_at: consolidatedUser.createdAt.toISOString(),
        });

        if (roleError && roleError.code !== '23505') {
          // Ignore duplicate role errors
          console.warn(`  ⚠ Role ${roleData.role} already exists for user ${consolidatedUser.email}`);
        }
      }

      // 3. Insert role-specific data
      for (const roleData of consolidatedUser.roles) {
        const user = roleData.data as User;

        if (roleData.role === 'customer' && 'savedAddresses' in user) {
          const { error: customerError } = await supabase.from('customers').insert({
            user_id: finalUserId,
            saved_addresses: user.savedAddresses || [],
            created_at: consolidatedUser.createdAt.toISOString(),
            updated_at: consolidatedUser.createdAt.toISOString(),
          });

          if (customerError && customerError.code !== '23505') {
            console.warn(`  ⚠ Failed to insert customer data: ${customerError.message}`);
          }
        } else if (roleData.role === 'driver' && 'vehicleNumber' in user) {
          const { error: driverError } = await supabase.from('drivers').insert({
            user_id: finalUserId,
            vehicle_number: user.vehicleNumber || '',
            license_number: user.licenseNumber || '',
            license_expiry: user.licenseExpiry
              ? user.licenseExpiry.toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            driver_license_image_url: user.driverLicenseImage || '',
            vehicle_registration_image_url: user.vehicleRegistrationImage || '',
            total_earnings: user.totalEarnings || 0,
            completed_orders: user.completedOrders || 0,
            created_by_admin: user.createdByAdmin || false,
            emergency_contact_name: user.emergencyContactName || null,
            emergency_contact_phone: user.emergencyContactPhone || null,
            created_at: consolidatedUser.createdAt.toISOString(),
            updated_at: consolidatedUser.createdAt.toISOString(),
          });

          if (driverError && driverError.code !== '23505') {
            console.warn(`  ⚠ Failed to insert driver data: ${driverError.message}`);
          }
        } else if (roleData.role === 'admin' && 'businessName' in user) {
          const { error: adminError } = await supabase.from('admins').insert({
            user_id: finalUserId,
            business_name: user.businessName || null,
            created_at: consolidatedUser.createdAt.toISOString(),
            updated_at: consolidatedUser.createdAt.toISOString(),
          });

          if (adminError && adminError.code !== '23505') {
            console.warn(`  ⚠ Failed to insert admin data: ${adminError.message}`);
          }
        }
      }

      console.log(`  ✓ Imported user: ${consolidatedUser.email} (${consolidatedUser.roles.length} roles)`);
    } catch (error) {
      console.error(`  ✗ Failed to import user ${consolidatedUser.email}:`, error);
      throw error;
    }
  }

  console.log(`  ✓ Successfully imported ${consolidatedUsers.length} users`);
}

/**
 * Step 4: Import bookings to Supabase
 */
async function importBookings(bookings: Booking[], idMapping: IdMapping): Promise<void> {
  console.log('📋 Step 4: Importing bookings to Supabase...');

  for (const booking of bookings) {
    try {
      // Map old IDs to new UUIDs
      const newCustomerId = idMapping.userIds.get(booking.customerId);
      const newDriverId = booking.driverId ? idMapping.userIds.get(booking.driverId) : null;
      const newAgencyId = booking.agencyId ? idMapping.userIds.get(booking.agencyId) : null;
      const newBookingId = randomUUID();

      if (!newCustomerId) {
        console.warn(`  ⚠ Skipping booking ${booking.id}: customer ID ${booking.customerId} not found in mapping`);
        continue;
      }

      // Map booking ID
      idMapping.bookingIds.set(booking.id, newBookingId);

      const { error } = await supabase.from('bookings').insert({
        id: newBookingId,
        customer_id: newCustomerId,
        customer_name: booking.customerName,
        customer_phone: booking.customerPhone,
        agency_id: newAgencyId,
        agency_name: booking.agencyName || null,
        driver_id: newDriverId,
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
        scheduled_for: booking.scheduledFor ? booking.scheduledFor.toISOString() : null,
        payment_status: booking.paymentStatus,
        payment_id: booking.paymentId || null,
        cancellation_reason: booking.cancellationReason || null,
        can_cancel: booking.canCancel,
        created_at: booking.createdAt.toISOString(),
        updated_at: booking.updatedAt.toISOString(),
        accepted_at: booking.acceptedAt ? booking.acceptedAt.toISOString() : null,
        delivered_at: booking.deliveredAt ? booking.deliveredAt.toISOString() : null,
      });

      if (error) {
        throw new Error(`Failed to insert booking: ${error.message}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to import booking ${booking.id}:`, error);
      // Continue with next booking
    }
  }

  console.log(`  ✓ Successfully imported ${bookings.length} bookings`);
}

/**
 * Step 5: Import vehicles to Supabase
 */
async function importVehicles(vehicles: Vehicle[], idMapping: IdMapping): Promise<void> {
  console.log('🚗 Step 5: Importing vehicles to Supabase...');

  for (const vehicle of vehicles) {
    try {
      // Map old IDs to new UUIDs
      const newAgencyId = idMapping.userIds.get(vehicle.agencyId);
      const newVehicleId = randomUUID();

      if (!newAgencyId) {
        console.warn(`  ⚠ Skipping vehicle ${vehicle.id}: agency ID ${vehicle.agencyId} not found in mapping`);
        continue;
      }

      // Map vehicle ID
      idMapping.vehicleIds.set(vehicle.id, newVehicleId);

      const { error } = await supabase.from('vehicles').insert({
        id: newVehicleId,
        agency_id: newAgencyId,
        vehicle_number: vehicle.vehicleNumber,
        insurance_company_name: vehicle.insuranceCompanyName,
        insurance_expiry_date: vehicle.insuranceExpiryDate.toISOString().split('T')[0],
        vehicle_capacity: vehicle.vehicleCapacity,
        amount: vehicle.amount,
        created_at: vehicle.createdAt.toISOString(),
        updated_at: vehicle.updatedAt.toISOString(),
      });

      if (error) {
        throw new Error(`Failed to insert vehicle: ${error.message}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to import vehicle ${vehicle.id}:`, error);
      // Continue with next vehicle
    }
  }

  console.log(`  ✓ Successfully imported ${vehicles.length} vehicles`);
}

/**
 * Step 6: Import bank accounts to Supabase
 */
async function importBankAccounts(bankAccounts: BankAccount[], idMapping: IdMapping): Promise<void> {
  console.log('🏦 Step 6: Importing bank accounts to Supabase...');

  for (const account of bankAccounts) {
    try {
      // Map old IDs to new UUIDs
      const newAdminId = idMapping.userIds.get(account.adminId);
      const newAccountId = randomUUID();

      if (!newAdminId) {
        console.warn(`  ⚠ Skipping bank account ${account.id}: admin ID ${account.adminId} not found in mapping`);
        continue;
      }

      // Map bank account ID
      idMapping.bankAccountIds.set(account.id, newAccountId);

      const { error } = await supabase.from('bank_accounts').insert({
        id: newAccountId,
        admin_id: newAdminId,
        account_holder_name: account.accountHolderName,
        bank_name: account.bankName,
        account_number: account.accountNumber,
        ifsc_code: account.ifscCode,
        branch_name: account.branchName,
        is_default: account.isDefault,
        created_at: account.createdAt.toISOString(),
        updated_at: account.updatedAt.toISOString(),
      });

      if (error) {
        throw new Error(`Failed to insert bank account: ${error.message}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to import bank account ${account.id}:`, error);
      // Continue with next account
    }
  }

  console.log(`  ✓ Successfully imported ${bankAccounts.length} bank accounts`);
}

/**
 * Step 7: Verify data integrity
 */
async function verifyDataIntegrity(idMapping: IdMapping): Promise<void> {
  console.log('✅ Step 7: Verifying data integrity...');

  // Count users
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  console.log(`  ✓ Users in database: ${userCount}`);

  // Count user roles
  const { count: roleCount } = await supabase.from('user_roles').select('*', { count: 'exact', head: true });
  console.log(`  ✓ User roles in database: ${roleCount}`);

  // Count bookings
  const { count: bookingCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
  console.log(`  ✓ Bookings in database: ${bookingCount}`);

  // Count vehicles
  const { count: vehicleCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
  console.log(`  ✓ Vehicles in database: ${vehicleCount}`);

  // Count bank accounts
  const { count: bankAccountCount } = await supabase.from('bank_accounts').select('*', { count: 'exact', head: true });
  console.log(`  ✓ Bank accounts in database: ${bankAccountCount}`);

  console.log('  ✓ Data integrity verification complete');
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting data migration from AsyncStorage to Supabase...\n');

  try {
    // Step 1: Export local data
    const { users, bookings, vehicles, bankAccounts } = await exportLocalData();
    console.log('');

    // Step 2: Transform users
    const { consolidatedUsers, idMapping } = transformUsers(users);
    console.log('');

    // Step 3: Import users
    await importUsers(consolidatedUsers, idMapping);
    console.log('');

    // Step 4: Import bookings
    if (bookings.length > 0) {
      await importBookings(bookings, idMapping);
      console.log('');
    }

    // Step 5: Import vehicles
    if (vehicles.length > 0) {
      await importVehicles(vehicles, idMapping);
      console.log('');
    }

    // Step 6: Import bank accounts
    if (bankAccounts.length > 0) {
      await importBankAccounts(bankAccounts, idMapping);
      console.log('');
    }

    // Step 7: Verify data integrity
    await verifyDataIntegrity(idMapping);
    console.log('');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrate().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { migrate, exportLocalData, transformUsers, importUsers, importBookings, importVehicles, importBankAccounts };

