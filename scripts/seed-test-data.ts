/**
 * Seed Test Data Script for Water Tanker App Performance Testing
 * 
 * This script seeds the test project database with:
 * - 1 admin user
 * - 100 customer users
 * - 50 driver users
 * - 50,000 bookings distributed across customers
 * 
 * Usage:
 *   Set environment variables:
 *     - EXPO_PUBLIC_SUPABASE_URL (test project URL)
 *     - SUPABASE_SERVICE_ROLE_KEY (test project service role key)
 *   Then run: npx ts-node scripts/seed-test-data.ts
 */

import '../scripts/setup-globals';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOOKING_COUNT = 50000;

// Configurable counts
const CUSTOMER_COUNT = 100;
const DRIVER_COUNT = 50;

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

interface SeedResult {
  customerIds: string[];
  driverIds: string[];
  adminId: string;
  bookingsSeeded: number;
}

/**
 * Create test users (customers, drivers, admin)
 */
async function createTestUsers(): Promise<{ customerIds: string[]; driverIds: string[]; adminId: string }> {
  console.log('👥 Creating test users...');
  
  const customerIds: string[] = [];
  const driverIds: string[] = [];
  let adminId = '';
  
  // Create admin user first (needed for pricing)
  console.log('  Creating admin user...');
  const adminEmail = `admin-${randomUUID()}@test.com`;
  const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: 'test123456',
    email_confirm: true,
  });
  
  if (adminAuthError || !adminAuth?.user) {
    throw new Error(`Failed to create admin user: ${adminAuthError?.message}`);
  }
  
  adminId = adminAuth.user.id;
  
  // Create admin record in database
  const { error: userError } = await supabase.from('users').insert({
    id: adminId,
    email: adminEmail,
    password_hash: 'hashed',
    name: 'Test Admin',
  });
  
  if (userError) {
    console.warn(`  ⚠️  User record error (may already exist): ${userError.message}`);
  }
  
  const { error: roleError } = await supabase.from('user_roles').insert({
    user_id: adminId,
    role: 'admin',
  });
  
  if (roleError) {
    console.warn(`  ⚠️  Role record error (may already exist): ${roleError.message}`);
  }
  
  const { error: adminError } = await supabase.from('admins').insert({
    user_id: adminId,
    business_name: 'Test Agency',
  });
  
  if (adminError) {
    console.warn(`  ⚠️  Admin record error (may already exist): ${adminError.message}`);
  }
  
  console.log(`  ✅ Admin created: ${adminId}`);
  
  // Create customers (distribute bookings across them)
  console.log(`  Creating ${CUSTOMER_COUNT} customers...`);
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const email = `customer-${i}-${randomUUID()}@test.com`;
    const { data: customerAuth, error: customerAuthError } = await supabase.auth.admin.createUser({
      email,
      password: 'test123456',
      email_confirm: true,
    });
    
    if (customerAuthError || !customerAuth?.user) {
      console.warn(`  ⚠️  Failed to create customer ${i}: ${customerAuthError?.message}`);
      continue;
    }
    
    const customerId = customerAuth.user.id;
    customerIds.push(customerId);
    
    await supabase.from('users').insert({
      id: customerId,
      email,
      password_hash: 'hashed',
      name: `Customer ${i}`,
      phone: `123456789${i}`,
    });
    
    await supabase.from('user_roles').insert({
      user_id: customerId,
      role: 'customer',
    });
    
    await supabase.from('customers').insert({
      user_id: customerId,
      saved_addresses: [],
    });
    
    if ((i + 1) % 10 === 0) {
      console.log(`    Created ${i + 1}/${CUSTOMER_COUNT} customers...`);
    }
  }
  
  // Create drivers
  console.log(`  Creating ${DRIVER_COUNT} drivers...`);
  for (let i = 0; i < DRIVER_COUNT; i++) {
    const email = `driver-${i}-${randomUUID()}@test.com`;
    const { data: driverAuth, error: driverAuthError } = await supabase.auth.admin.createUser({
      email,
      password: 'test123456',
      email_confirm: true,
    });
    
    if (driverAuthError || !driverAuth?.user) {
      console.warn(`  ⚠️  Failed to create driver ${i}: ${driverAuthError?.message}`);
      continue;
    }
    
    const driverId = driverAuth.user.id;
    driverIds.push(driverId);
    
    await supabase.from('users').insert({
      id: driverId,
      email,
      password_hash: 'hashed',
      name: `Driver ${i}`,
      phone: `987654321${i}`,
    });
    
    await supabase.from('user_roles').insert({
      user_id: driverId,
      role: 'driver',
    });
    
    await supabase.from('drivers').insert({
      user_id: driverId,
      vehicle_number: `VEH${i}`,
      license_number: `LIC${i}`,
      license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      driver_license_image_url: 'https://example.com/license.jpg',
      vehicle_registration_image_url: 'https://example.com/registration.jpg',
      total_earnings: 0,
      completed_orders: 0,
      created_by_admin: true,
    });
    
    if ((i + 1) % 10 === 0) {
      console.log(`    Created ${i + 1}/${DRIVER_COUNT} drivers...`);
    }
  }
  
  console.log(`✅ Created ${customerIds.length} customers, ${driverIds.length} drivers, 1 admin`);
  
  return { customerIds, driverIds, adminId };
}

/**
 * Seed bookings
 */
async function seedBookings(customerIds: string[], driverIds: string[], adminId: string): Promise<number> {
  console.log(`📦 Seeding ${BOOKING_COUNT} bookings...`);
  
  if (customerIds.length === 0) {
    throw new Error('No customers available for seeding bookings');
  }
  
  const statuses: Array<'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled'> = [
    'pending', 'accepted', 'in_transit', 'delivered', 'cancelled'
  ];
  
  const paymentStatuses: Array<'pending' | 'completed' | 'failed' | 'refunded'> = [
    'pending', 'completed', 'failed', 'refunded'
  ];
  
  const batchSize = 1000;
  let inserted = 0;
  const now = new Date();
  
  for (let batch = 0; batch < Math.ceil(BOOKING_COUNT / batchSize); batch++) {
    const bookings = [];
    const batchStart = batch * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, BOOKING_COUNT);
    
    for (let i = batchStart; i < batchEnd; i++) {
      const customerId = customerIds[i % customerIds.length];
      const driverId = i % 3 === 0 ? null : driverIds[i % driverIds.length];
      const status = statuses[i % statuses.length];
      const paymentStatus = paymentStatuses[i % paymentStatuses.length];
      
      const created_at = new Date(now.getTime() - (BOOKING_COUNT - i) * 60000); // Spread over time
      
      bookings.push({
        id: randomUUID(),
        customer_id: customerId,
        customer_name: `Customer ${i % customerIds.length}`,
        customer_phone: `123456789${i % customerIds.length}`,
        agency_id: adminId,
        agency_name: 'Test Agency',
        driver_id: driverId,
        driver_name: driverId ? `Driver ${driverIds.indexOf(driverId)}` : null,
        driver_phone: driverId ? `987654321${driverIds.indexOf(driverId)}` : null,
        status,
        tanker_size: i % 2 === 0 ? 10000 : 15000,
        quantity: 1,
        base_price: i % 2 === 0 ? 600 : 900,
        distance_charge: (i % 100) * 5,
        total_price: (i % 2 === 0 ? 600 : 900) + (i % 100) * 5,
        delivery_address: {
          street: `Street ${i}`,
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          latitude: 28.6139 + (i % 100) * 0.01,
          longitude: 77.2090 + (i % 100) * 0.01,
        },
        distance: (i % 100) * 0.5,
        scheduled_for: i % 2 === 0 ? new Date(now.getTime() + i * 60000).toISOString() : null,
        payment_status: paymentStatus,
        payment_id: paymentStatus === 'completed' ? `pay_${i}` : null,
        cancellation_reason: status === 'cancelled' ? 'Test cancellation' : null,
        can_cancel: status === 'pending',
        created_at: created_at.toISOString(),
        updated_at: created_at.toISOString(),
        accepted_at: status !== 'pending' ? new Date(created_at.getTime() + 300000).toISOString() : null,
        delivered_at: status === 'delivered' ? new Date(created_at.getTime() + 3600000).toISOString() : null,
      });
    }
    
    const { error } = await supabase.from('bookings').insert(bookings);
    
    if (error) {
      console.error(`❌ Failed to insert batch ${batch}:`, error);
      throw error;
    }
    
    inserted += bookings.length;
    const percentage = ((inserted / BOOKING_COUNT) * 100).toFixed(1);
    console.log(`  ✅ Inserted ${inserted}/${BOOKING_COUNT} bookings (${percentage}%)`);
  }
  
  console.log(`✅ Seeded ${inserted} bookings successfully`);
  return inserted;
}

/**
 * Main seeding function
 */
async function seedTestData(): Promise<SeedResult> {
  console.log('🌱 Starting Test Data Seeding\n');
  console.log(`Project: ${supabaseUrl}`);
  console.log(`Target: ${BOOKING_COUNT} bookings\n`);
  
  try {
    // Step 1: Create test users
    console.log('Step 1/2: User Creation');
    const { customerIds, driverIds, adminId } = await createTestUsers();
    console.log('');
    
    // Step 2: Seed bookings
    console.log('Step 2/2: Data Seeding');
    const bookingsSeeded = await seedBookings(customerIds, driverIds, adminId);
    console.log('');
    
    // Summary
    console.log('✅ Test data seeding completed!');
    console.log('\n📋 Summary:');
    console.log(`  - Customers created: ${customerIds.length}`);
    console.log(`  - Drivers created: ${driverIds.length}`);
    console.log(`  - Admin created: 1`);
    console.log(`  - Bookings seeded: ${bookingsSeeded}`);
    
    return {
      customerIds,
      driverIds,
      adminId,
      bookingsSeeded,
    };
    
  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedTestData().catch(console.error);
}

export { seedTestData, createTestUsers, seedBookings };
