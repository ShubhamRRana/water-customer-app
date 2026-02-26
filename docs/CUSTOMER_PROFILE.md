# Customer-only profile — inventory & spec

## Purpose
Provide a single-document reference that describes everything implemented today for the Customer role so we can extract a standalone customer mobile app from the existing codebase.

## Scope
- UI: screens, components, navigation, flows
- State & stores used by customer flows
- Services & data flows (booking, user, auth)
- Data-access layer and Supabase schema / migrations relevant to customers
- Realtime subscriptions and webhook hooks (if any)
- Files to reuse when creating the separate mobile app

## High-level summary
- App uses React Native + Expo with a role-based navigation stack for customers: see `src/navigation/CustomerNavigator.tsx`.
- Customer flows: home dashboard, book tanker (agency + vehicle selection), saved addresses, order tracking/history, profile management.
- Backend: Supabase (Auth + Postgres). Role model uses `users`, `user_roles`, and `customers` tables; bookings live in `bookings` table. Data access layer implemented at `src/lib/supabaseDataAccess.ts` with a typed interface in `src/lib/dataAccess.interface.ts`.

## UI: screens and key components
- Customer navigator and screens:
  - [src/navigation/CustomerNavigator.tsx](src/navigation/CustomerNavigator.tsx) — stack definitions and routes (Home, Orders, Profile, Booking, OrderTracking, SavedAddresses, PastOrders)
  - [src/screens/customer/CustomerHomeScreen.tsx](src/screens/customer/CustomerHomeScreen.tsx) — dashboard, recent orders, quick actions (Book Tanker, Saved Addresses)
  - [src/screens/customer/BookingScreen.tsx](src/screens/customer/BookingScreen.tsx) — full booking flow (select agency -> select vehicle -> address -> date/time -> book)
  - [src/screens/customer/OrderHistoryScreen.tsx](src/screens/customer/OrderHistoryScreen.tsx) — search, filters, list of orders and cancel action
  - [src/screens/customer/OrderTrackingScreen.tsx](src/screens/customer/OrderTrackingScreen.tsx) — live tracking per order
  - [src/screens/customer/ProfileScreen.tsx](src/screens/customer/ProfileScreen.tsx) and [src/screens/customer/SavedAddressesScreen.tsx](src/screens/customer/SavedAddressesScreen.tsx) — profile and address management

Refer to these files when porting UI.

### Example: Customer navigation (key lines)
```24:36:E:/WaterTankerAppv1/src/navigation/CustomerNavigator.tsx
const CustomerNavigator: React.FC = () => {
  return (
    <ErrorBoundary resetKeys={['Customer']}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={CustomerHomeScreen} />
        <Stack.Screen name="Orders" component={OrderHistoryScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
};
```

## UI flows & UX notes
- Booking flow guides user to select an agency (admin users with `businessName`) then a vehicle. Vehicle amount is set by driver at delivery time (UI shows "Amount will be determined at delivery").
- Delivery address supports saved addresses (customer profile stores `savedAddresses`).
- Date/time inputs are validated & sanitized client-side via `ValidationUtils` and `SanitizationUtils`.
- Users can cancel pending bookings (UI checks `booking.canCancel`).
- Booking flow uses modals for agency/vehicle selection and saved-address selection to keep the main screen compact.

## State management
- Uses Zustand stores:
  - `src/store/authStore.ts` — authentication state and session restore
  - `src/store/bookingStore.ts` — fetch/create/cancel customer bookings
  - `src/store/userStore.ts` — fetchUsersByRole, update user
  - `src/store/vehicleStore.ts` — fetchVehiclesByAgency

Key store usages appear in the screens listed above (e.g., `useBookingStore()` in `CustomerHomeScreen` and `BookingScreen`).

## Services (business logic)
- `src/services/auth.service.ts` — registration/login, multi-role handling, Supabase Auth integration, role-specific profile creation (customers table insertion). Important helpers: `fetchUserWithRole`, `getUserRoles`, `login`, `register`, `logout`, `deleteCustomerAccount`.
- `src/services/user.service.ts` — admin-side user operations plus helpers to fetch users, update profiles, delete customer accounts (delegates to dataAccess).
- `src/services/booking.service.ts` — business logic for creating/updating bookings, getBookingsByCustomer, cancelBooking, subscribeToBookingUpdates.

Files to reuse:
- `src/services/auth.service.ts`
- `src/services/booking.service.ts`
- `src/services/user.service.ts`

### Booking creation (client-side booking payload)
The booking payload built in the booking screen uses the following shape (constructed before calling booking service):

```javascript
const bookingData = {
  customerId: currentUser.id,
  customerName: currentUser.name,
  customerPhone: currentUser.phone || '',
  agencyId: selectedAgency.id,
  agencyName: selectedAgency.name,
  status: 'pending',
  tankerSize: selectedVehicle.capacity,
  quantity: 1,
  basePrice: priceBreakdown.basePrice,
  distanceCharge: 0,
  totalPrice: priceBreakdown.totalPrice,
  deliveryAddress: {
    address: sanitizedAddress,
    latitude: <mock or geocoded lat>,
    longitude: <mock or geocoded lng>
  },
  distance: 0,
  scheduledFor: <optional Date>,
  paymentStatus: 'pending',
  canCancel: true,
};
```

## Data access & backend structure
- Data access abstraction: `src/lib/dataAccess.interface.ts` with an implementation `src/lib/supabaseDataAccess.ts` that maps DB rows -> typed models.
- Supabase tables used for customer flows:
  - `users` (base user profile)
  - `user_roles` (role mapping user_id -> role)
  - `customers` (customer-specific data, `saved_addresses` JSONB)
  - `bookings` (orders: customer_id, agency_id, driver_id, status, delivery_address JSONB, prices, scheduled_for, payment status, etc.)
  - `vehicles` (for agency vehicles used in booking)

### Key DB logic (service + data-access)
Booking service creates bookings through the data access layer; important server/client mapping functions are implemented in `src/lib/supabaseDataAccess.ts`.

Example: BookingService.createBooking (service signature and implementation entry)
```30:43:E:/WaterTankerAppv1/src/services/booking.service.ts
  static async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const id = dataAccess.generateId();
        const newBooking: Booking = {
          ...bookingData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await dataAccess.bookings.saveBooking(newBooking);
        return id;
      },
      {
        context: { operation: 'createBooking', customerId: bookingData.customerId, agencyId: bookingData.agencyId },
        userFacing: false,
      }
    );
  }
```

Data mapping helpers for bookings:
```321:359:E:/WaterTankerAppv1/src/lib/supabaseDataAccess.ts
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
```

```365:393:E:/WaterTankerAppv1/src/lib/supabaseDataAccess.ts
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
```

## Realtime and subscriptions
- Real-time updates handled through Supabase RLS + Realtime channels via a `SubscriptionManager` in `src/utils/subscriptionManager.ts` and implemented in `src/lib/supabaseDataAccess.ts` with methods like `subscribeToBookingUpdates` and `subscribeToUserUpdates`.
- Client screens subscribe to order updates to show live status (OrderTracking and Booking detail screens).

## Security & auth considerations
- Auth service enforces rate-limiting, brute-force logging, and prevents driver self-registration.
- Role-based access uses `user_roles` with server-side RLS and migrations to set up appropriate policies (see migrations section below).

## Migrations affecting customer flows (summary)
- `migrations/004_allow_customers_read_admin_info.sql` — Adds helper `has_role(role_name)` and RLS policies that allow authenticated customers to SELECT admin/user/admins data required for agency selection (only read operations).
  - Purpose: allow customers to list agencies (admin users) and their business metadata safely.
- `migrations/005_allow_customers_read_vehicles.sql` — Adds RLS policy allowing customers to SELECT from `vehicles` (so they can browse agency vehicles).
  - Purpose: allow customers to see available vehicles for booking.
- `migrations/006_fix_driver_booking_update_policy.sql` — Fixes bookings update policy so drivers can accept orders when `driver_id` is null (permits update when accepting pending bookings).
  - Purpose: enables driver acceptance flow without breaking RLS.
- `migrations/013_allow_customer_delete_own_account.sql` — Adds DELETE policies so customers may delete bookings, their `customers` row, their `user_roles` customer role, and the `users` row when they are the sole owner.
  - Purpose: enable "Delete my account" from the customer app while preserving safety (deletes in dependency order).

(Refer to each file in `migrations/` for exact SQL; these are intentionally minimal read-only policies for customer flows.)

## Files to extract for a customer-only mobile app
Minimum files to port:
- UI & navigation: `src/navigation/CustomerNavigator.tsx`, `src/screens/customer/*` (CustomerHomeScreen, BookingScreen, OrderHistoryScreen, OrderTrackingScreen, ProfileScreen, SavedAddressesScreen)
- Shared components: `src/components/common/*` (Card, Button, Typography, CustomerMenuDrawer, LoadingSpinner)
- Stores: `src/store/authStore.ts`, `src/store/bookingStore.ts`, `src/store/userStore.ts`, `src/store/vehicleStore.ts`
- Services & lib: `src/services/auth.service.ts`, `src/services/booking.service.ts`, `src/services/user.service.ts`, `src/lib/supabaseDataAccess.ts`, `src/lib/supabaseClient.ts`
- Types: `src/types/index.ts`
- Utils: `src/utils/*` (dateUtils, validation, sanitization, pricing, errorHandler, subscriptionManager)

## Immediate risks & gaps to address before splitting
- Some driver/admin features are referenced from shared components; verify and strip unused pieces.
- Payment integration appears present in services (`src/services/payment.service.ts` references and tests) but booking flow currently shows amount "To be determined" — decide if customer app needs to accept payments at booking or at delivery.
- Geocoding: booking currently uses mock coordinates in `BookingScreen` — replace with production geocoding before launch.
- RLS/migration review: confirm migrations fully expose only necessary SELECT policies for customer role and that no write privileges leaked.

## Recommended porting checklist
1. Copy UI screens and CustomerNavigator; keep shared components as-is and remove admin/driver-specific UI props.
2. Copy Zustand stores and services; update dataAccess client only to include Supabase config (use publishable key pattern where appropriate).
3. Confirm RLS & migrations on deployment project: run through `migrations/` SQL and validate policies in Supabase dashboard.
4. Replace mock geocoding with production provider (Google, Mapbox, or other) and handle user consent for location.
5. Decide on payment flow: integrate payment SDK or keep delivery-time payment as current.
6. Run E2E test for booking -> driver acceptance -> delivery flow (subscription updates).

## Deliverables created
- This file: `docs/CUSTOMER_PROFILE.md` — customer-only profile inventory & spec.

---
Generated from repository analysis on 2026-02-24.

