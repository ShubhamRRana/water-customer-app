# Water Tanker Booking App

A **customer-facing** mobile app for on-demand water tanker delivery, built with **React Native (Expo)** and **TypeScript**, backed by **Supabase** (PostgreSQL, Auth, Realtime). Driver and admin tools live in **separate applications** that share the same Supabase project; see [Customer App Split](./docs/CUSTOMER_APP_SPLIT.md).

This client only mounts **Auth** and **Customer** flows (`App.tsx`). Users restored as non-customer (e.g. staff) are sent back to sign-in.

Customers can sign in as **individual** or **society** accounts (same customer role; account kind differs). **Active subscriptions** are required to create bookings and society trips; plan purchase and renewals use **Razorpay** via Supabase Edge Functions (see [Razorpay implementation guide](./docs/RAZORPAY_CUSTOMER_REPO_IMPLEMENTATION_PROMPT.md)).

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [UML Diagrams](#uml-diagrams)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Additional documentation](#additional-documentation)
- [NPM scripts](#npm-scripts)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Supabase Configuration](#supabase-configuration)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

## Features

### Customer Features
- **Booking Management**: Create, view, and track water tanker bookings (requires an active subscription; enforced in app and database)
- **Address Management**: Save and manage multiple delivery addresses
- **Real-time Tracking**: Track booking status updates in real-time
- **Order History**: View past and current orders
- **Price Calculation**: Automatic distance-based pricing with Indian numbering format
- **Scheduled Deliveries**: Schedule deliveries for future dates
- **Subscriptions**: Browse plans, subscribe or renew via Razorpay checkout, and view subscription status
- **Society login & trips**: Society-specific login flow; record and manage society trips (subscription rules apply; see migrations and services)
- **Delete Account**: Permanently delete account from the Profile screen (with confirmation); removes all customer data and bookings, then logs out

### Platform note

The same Supabase database supports drivers, admins, and agencies; **this repository does not include driver or admin app screens**. Operational workflows for staff are documented at the backend/RLS level below and in other clients.

## Tech Stack

### Frontend
- **React** 19.x and **React Native** 0.81.x (Expo SDK ~54.0.32)
- **TypeScript** (~5.9.2)
- **React Navigation** v6 (stack navigators for auth and customer)
- **Zustand** (state management)
- **Expo Location** (GPS and location helpers)
- **react-native-webview** (e.g. payment / hosted flows where used)

### Backend
- **Supabase** (PostgreSQL Database)
- **Supabase Auth** (Authentication)
- **Supabase Realtime** (Real-time Subscriptions)

### Testing
- **Jest** (Unit Testing)
- **React Native Testing Library** (Component Testing)
- **Jest Expo** (Expo-specific Testing)

### Development Tools
- **Expo / EAS CLI** (local dev with `npx expo`; production builds with EAS — see `eas.json`)
- **TypeScript** (Type Safety)
- **ESLint** (Code Quality)

## Architecture

The application follows a **layered architecture** pattern with clear separation of concerns:

1. **Presentation Layer**: React Native screens and components
2. **State Management Layer**: Zustand stores for global state
3. **Service Layer**: Business logic and API interactions
4. **Data Access Layer**: Abstracted data persistence interface
5. **Infrastructure Layer**: Supabase client and utilities

### Key Design Patterns

- **Repository Pattern**: Data Access Layer abstracts database operations
- **Service Layer Pattern**: Business logic separated from UI and data access
- **Observer Pattern**: Real-time subscriptions for live updates
- **Factory Pattern**: Data access layer factory for different backends

## UML Diagrams

### 1. Class Diagram - Core Entities

```mermaid
classDiagram
    class BaseUser {
        +string id
        +string email
        +string password
        +string name
        +string? phone
        +Date createdAt
    }
    
    class CustomerUser {
        +Address[]? savedAddresses
    }
    
    class DriverUser {
        +string? vehicleNumber
        +string? licenseNumber
        +Date? licenseExpiry
        +string? driverLicenseImage
        +string? vehicleRegistrationImage
        +number? totalEarnings
        +number? completedOrders
        +boolean? createdByAdmin
    }
    
    class AdminUser {
        +string? businessName
    }
    
    class Booking {
        +string id
        +string customerId
        +string customerName
        +string customerPhone
        +string? agencyId
        +string? agencyName
        +string? driverId
        +string? driverName
        +string? driverPhone
        +BookingStatus status
        +number tankerSize
        +number? quantity
        +number basePrice
        +number distanceCharge
        +number totalPrice
        +Address deliveryAddress
        +number distance
        +Date? scheduledFor
        +PaymentStatus paymentStatus
        +string? paymentId
        +string? cancellationReason
        +boolean canCancel
        +Date createdAt
        +Date updatedAt
        +Date? acceptedAt
        +Date? deliveredAt
    }
    
    class Address {
        +string? id
        +string address
        +number latitude
        +number longitude
        +boolean? isDefault
    }
    
    class Vehicle {
        +string id
        +string agencyId
        +string vehicleNumber
        +string insuranceCompanyName
        +Date insuranceExpiryDate
        +number vehicleCapacity
        +number amount
        +Date createdAt
        +Date updatedAt
    }
    
    class BankAccount {
        +string id
        +string adminId
        +string accountHolderName
        +string bankName
        +string accountNumber
        +string ifscCode
        +string branchName
        +boolean isDefault
        +Date createdAt
        +Date updatedAt
    }
    
    class Expense {
        +string id
        +string adminId
        +ExpenseType expenseType
        +number amount
        +string? description
        +Date expenseDate
        +string? receiptImageUrl
        +Date createdAt
        +Date updatedAt
    }
    
    class TankerSize {
        +string id
        +number size
        +number basePrice
        +boolean isActive
        +string displayName
    }
    
    BaseUser <|-- CustomerUser
    BaseUser <|-- DriverUser
    BaseUser <|-- AdminUser
    Booking "1" --> "1" Address : deliveryAddress
    Booking "1" --> "1" CustomerUser : customerId
    Booking "0..1" --> "1" DriverUser : driverId
    Booking "0..1" --> "1" AdminUser : agencyId
    Vehicle "1" --> "1" AdminUser : agencyId
    BankAccount "1" --> "1" AdminUser : adminId
    Expense "1" --> "1" AdminUser : adminId
    CustomerUser "1" --> "*" Address : savedAddresses
```

### 2. Component Diagram - System Architecture (this app)

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[App.tsx] --> B[AuthNavigator]
        A --> C[MainNavigator]
        
        B --> F[RoleSelectionScreen]
        B --> G[LoginScreen]
        B --> H[SocietyLoginScreen]
        B --> HS[RegisterScreen]
        
        C --> I[CustomerHomeScreen]
        C --> J[BookingScreen]
        C --> K[OrderHistoryScreen]
        C --> L[OrderTrackingScreen]
        C --> M[ProfileScreen]
        C --> N[SubscriptionPlansScreen]
        C --> NS[SubscriptionStatusScreen]
        C --> AT[AddTripScreen]
        C --> TD[TripDetailsScreen]
    end
    
    subgraph "State Management Layer"
        T[AuthStore]
        U[BookingStore]
        V[UserStore]
        W[VehicleStore]
    end
    
    subgraph "Service Layer"
        X[AuthService]
        Y[BookingService]
        SY[SocietyTripService]
        SU[SubscriptionService]
        RZ[razorpayCheckout.service]
        Z[UserService]
        AA[PaymentService]
        AB[LocationService]
        AC[VehicleService]
    end
    
    subgraph "Data Access Layer"
        AF[IDataAccessLayer]
        AG[SupabaseDataAccess]
    end
    
    subgraph "Infrastructure Layer"
        AM[Supabase Client]
        AN[lib/subscriptionManager]
        AO[ErrorHandler]
        AP[Validation Utils]
        AQ[Pricing Utils]
    end
    
    I --> T
    J --> U
    J --> W
    
    T --> X
    U --> Y
    U --> SU
    V --> Z
    W --> AC
    AT --> SY
    
    SU --> PP
    X --> AF
    Y --> AF
    SY --> AF
    SU --> AF
    Z --> AF
    AC --> AF
    AA --> AF
    AB --> AF
    
    AF --> AG
    AG --> AM
    AG --> AN
    X --> AO
    Y --> AP
    Y --> AQ
```

### 3. Sequence Diagram - Booking Flow (platform)

End-to-end booking involves drivers and realtime updates on the **shared backend**. This app implements the **customer** side (`BookingScreen`, `BookingService`); staff use other clients.

```mermaid
sequenceDiagram
    participant C as Customer
    participant CS as CustomerScreen
    participant BS as BookingStore
    participant BKS as BookingService
    participant DAL as DataAccessLayer
    participant DB as Supabase
    participant D as Driver
    participant DS as DriverScreen
    
    C->>CS: Create Booking
    CS->>BS: createBooking(bookingData)
    BS->>BKS: createBooking(bookingData)
    BKS->>DAL: saveBooking(booking)
    DAL->>DB: INSERT booking
    DB-->>DAL: Booking created
    DAL-->>BKS: Success
    BKS-->>BS: bookingId
    BS-->>CS: Booking created
    
    Note over DB,DS: Real-time Subscription Active
    
    DB->>DS: Realtime Update (NEW BOOKING)
    DS->>D: Show Available Booking
    D->>DS: Accept Booking
    DS->>BS: updateBookingStatus(id, 'accepted')
    BS->>BKS: updateBookingStatus(id, 'accepted')
    BKS->>DAL: updateBooking(id, {status, driverId})
    DAL->>DB: UPDATE booking
    DB-->>DAL: Updated
    DAL-->>BKS: Success
    BKS-->>BS: Success
    
    DB->>CS: Realtime Update (STATUS CHANGED)
    CS->>C: Show Status Update
    
    D->>DS: Update Status to 'in_transit'
    DS->>BS: updateBookingStatus(id, 'in_transit')
    BS->>BKS: updateBookingStatus(id, 'in_transit')
    BKS->>DAL: updateBooking(id, {status})
    DAL->>DB: UPDATE booking
    DB->>CS: Realtime Update
    
    D->>DS: Mark as Delivered
    DS->>BS: updateBookingStatus(id, 'delivered')
    BS->>BKS: updateBookingStatus(id, 'delivered')
    BKS->>DAL: updateBooking(id, {status, deliveredAt})
    DAL->>DB: UPDATE booking
    DB->>CS: Realtime Update (DELIVERED)
    CS->>C: Show Delivery Confirmation
```

### 4. State Diagram - Booking Status Transitions

```mermaid
stateDiagram-v2
    [*] --> pending: Create Booking
    
    pending --> accepted: Driver Accepts
    pending --> cancelled: Customer Cancels
    
    accepted --> in_transit: Driver Starts Delivery
    accepted --> cancelled: Customer Cancels (if allowed)
    
    in_transit --> delivered: Driver Marks Delivered
    in_transit --> cancelled: Customer Cancels (rare)
    
    delivered --> [*]: Booking Complete
    cancelled --> [*]: Booking Cancelled
    
    note right of pending
        Can be cancelled by customer
        Available to all drivers
    end note
    
    note right of accepted
        Can be cancelled only if
        canCancel flag is true
    end note
    
    note right of in_transit
        Driver is en route
        to delivery location
    end note
    
    note right of delivered
        Final state
        Payment can be collected
    end note
```

### 5. Package Diagram - Module Dependencies

```mermaid
graph LR
    subgraph "Core Modules"
        A[types/index.ts]
        B[lib/index.ts]
        C[store/index.ts]
        D[services/index.ts]
    end
    
    subgraph "Navigation"
        E[AuthNavigator]
        F[MainNavigator]
    end
    
    subgraph "Screens"
        I[Auth Screens]
        J[Customer Screens]
        K[Society Screens]
    end
    
    subgraph "Components"
        M[Common Components]
        N[Customer Components]
    end
    
    subgraph "Utils"
        Q[Validation]
        R[Pricing]
        S[Error Handling]
        T[Analytics]
    end
    
    I --> E
    J --> F
    K --> F
    
    E --> A
    F --> A
    
    I --> C
    J --> C
    K --> C
    
    J --> D
    K --> D
    
    M --> A
    N --> A
    
    D --> B
    C --> D
    D --> Q
    D --> R
    D --> S
    D --> T
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Expo** (use `npx expo` — a global `expo-cli` install is not required)
- **EAS CLI** (optional, for cloud builds: `npm install -g eas-cli` or `npx eas-cli`)
- **Git** for version control
- **Supabase Account** with a project created
- **Google Maps API Key** (optional, for enhanced location features)

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd water-customer-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root. **Start from [`.env.example`](./.env.example)** and replace placeholders only locally (never commit real secrets).

Minimum for the app:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Also configure (see `.env.example` for comments and optional keys):

- `EXPO_PUBLIC_AUTH_SUCCESS_URL` — redirect after email verification (must be listed in Supabase Auth URL configuration)
- `EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL` — where password-reset links should land
- `SUPABASE_SERVICE_ROLE_KEY` — **server-side and migration scripts only**; must not appear in client bundles (`npm run secrets:check` helps guard this)

Razorpay subscription and booking checkout use **Supabase Edge Function secrets** (not `EXPO_PUBLIC_*`). Configure those in the Supabase Dashboard and follow [docs/RAZORPAY_CUSTOMER_REPO_IMPLEMENTATION_PROMPT.md](./docs/RAZORPAY_CUSTOMER_REPO_IMPLEMENTATION_PROMPT.md). Client uses `EXPO_PUBLIC_RAZORPAY_KEY_ID` only.

Optional: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for enhanced map features.

### 4. Supabase Database Setup

Apply SQL migrations from [`migrations/`](./migrations/) to your Supabase project (or ensure equivalent schema). Core tables include:

- `users` — Base user table
- `user_roles` — Multi-role support
- `customers` — Customer-specific data
- `drivers` — Driver-specific data
- `admins` — Admin-specific data
- `bookings` — Booking/order table
- `vehicles` — Vehicle management
- `bank_accounts` — Bank account information
- `tanker_sizes` — Tanker size configurations
- `pricing` — Pricing configuration
- `subscription_plans`, `subscriptions`, `payment_transactions` — Subscription and Razorpay payment records ([`024_create_subscription_tables.sql`](./migrations/024_create_subscription_tables.sql) and follow-ups)
- `society_trips` (and related society migrations) — Society trip flows

Apply every file in [`migrations/`](./migrations/) in **lexicographic (filename) order** (some numeric prefixes have more than one file, e.g. two `026_*` migrations—run both). Later payment migrations adjust gateway metadata and RLS for online payments.

**Important**: Row Level Security (RLS) is enabled on all tables with comprehensive policies. Subscription gating for booking and society trip creation is controlled by `FEATURE_FLAGS.enableSubscriptionGating` (enable when Razorpay subscription flow is live). Configure realtime publications for:
- `bookings`
- `notifications`
- `users`
- `user_roles`
- `customers`
- `drivers`
- `admins`
- `bank_accounts`
- `vehicles`
- `expenses`
- `tanker_sizes`
- `pricing`
- `driver_applications`
- `driver_locations`
- `subscription_plans`, `subscriptions`, `payment_transactions` (if using subscriptions)
- `society_trips` (if using society features)

### 5. Start the Development Server

```bash
npm start

# Or use platform-specific commands
npm run android
npm run ios
npm run web
```

Then choose your platform:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web

Tunnel mode (e.g. testing on a physical device off LAN): `npm run start:tunnel`

## Additional documentation

| Document | Purpose |
|----------|---------|
| [docs/CUSTOMER_APP_SPLIT.md](./docs/CUSTOMER_APP_SPLIT.md) | How this customer-only repo relates to staff apps and the shared backend |
| [docs/RAZORPAY_CUSTOMER_REPO_IMPLEMENTATION_PROMPT.md](./docs/RAZORPAY_CUSTOMER_REPO_IMPLEMENTATION_PROMPT.md) | Razorpay subscription + booking flows, Edge Functions, phased implementation |
| [docs/SUBSCRIPTION_GATING_REVIEW.md](./docs/SUBSCRIPTION_GATING_REVIEW.md) | Engineering notes on subscription gating for bookings and society trips |
| [UI_REDESIGN_SPEC.md](./UI_REDESIGN_SPEC.md) | UI redesign notes and specifications |
| [docs/CUSTOMER_PROFILE.md](./docs/CUSTOMER_PROFILE.md) | Inventory of customer flows, files, and schema touchpoints |
| [docs/PRODUCTION_READINESS.md](./docs/PRODUCTION_READINESS.md) | Release checks, Supabase advisors, Play Console, subscription enforcement |

Database changes are versioned under [`migrations/`](./migrations/); apply them to your Supabase project in order when bootstrapping a new environment.

## NPM scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start Expo dev server |
| `npm run android` / `ios` / `web` | Start and open a platform |
| `npm run start:tunnel` | Expo with tunnel for remote devices |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Full Jest suite |
| `npm run test:release` | Focused tests (booking + society trip services; used in CI-style checks) |
| `npm run secrets:check` | Fails if forbidden patterns (e.g. service role, Razorpay key secret) appear under `src/` |
| `npm run prebuild:check` | `secrets:check` + `lint` + `test:release` — recommended before release builds |

## Project Structure

```
water-customer-app/
├── app.config.js           # Expo config (reads EXPO_PUBLIC_* from env)
├── index.ts                # Expo entry (registers App)
├── eas.json                # EAS Build profiles (use Dashboard secrets for production keys)
├── migrations/             # Supabase SQL migrations (apply in lexicographic order)
├── supabase/functions/     # Edge Functions (Razorpay — Phase 1+; delete-auth-user-on-account-deletion)
├── docs/                   # Operational and product notes (see Additional documentation)
├── scripts/                # Utilities (e.g. verify-no-client-secrets.mjs, seed-test-data.ts)
├── src/
│   ├── components/
│   │   ├── customer/
│   │   └── common/
│   ├── screens/
│   │   ├── customer/       # Booking, orders, profile, subscriptions, payments
│   │   ├── shared/         # Cross-role stack screens: add trip, trip details, settle payment
│   │   ├── society/        # Society-only flows (e.g. subscription intro)
│   │   └── auth/           # Role selection, login, society login, register
│   ├── navigation/
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   ├── customerMenuNavigation.ts
│   │   └── rootNavigation.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts
│   │   ├── subscription.service.ts
│   │   ├── societyTrip.service.ts
│   │   ├── razorpayCheckout.service.ts
│   │   ├── user.service.ts
│   │   ├── payment.service.ts
│   │   ├── location.service.ts
│   │   ├── locationTracking.service.ts
│   │   ├── vehicle.service.ts
│   │   ├── storage.service.ts
│   │   └── localStorage.ts
│   ├── store/              # e.g. authStore, bookingStore, userStore, vehicleStore
│   ├── lib/
│   │   ├── dataAccess.interface.ts
│   │   ├── supabaseDataAccess.ts
│   │   ├── supabaseClient.ts
│   │   └── subscriptionManager.ts   # Realtime channel helpers
│   ├── utils/              # validation, pricing, subscription eligibility (subscriptionManager.ts), errors, etc.
│   ├── types/              # index.ts, subscription.types.ts
│   └── constants/
├── assets/
├── App.tsx
├── package.json
├── tsconfig.json
└── README.md
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Subscription-related service tests only (same as prebuild:check subset)
npm run test:release
```

Before release builds, run `npm run prebuild:check` (secrets + lint + `test:release`). See [docs/PRODUCTION_READINESS.md](./docs/PRODUCTION_READINESS.md) for the full checklist.

### Test Structure

- **Unit Tests**: Test individual functions and utilities
- **Integration Tests**: Test service layer and data access layer
- **Component Tests**: Test React Native components
- **Flow Tests**: Test complete user flows (booking, payment, etc.)

### Test Coverage

The project maintains comprehensive test coverage for:
- Services (auth, booking, payment, etc.)
- Utilities (validation, pricing, error handling)
- Stores (state management)
- Components (UI components)
- Integration flows

## Supabase Configuration

The following describes the **shared database** used by this app and other clients (e.g. staff apps). RLS policies for drivers and admins matter for those clients; this mobile app primarily exercises **customer** and **society** flows.

### Required Tables

1. **users**: Base user information
2. **user_roles**: Multi-role support (customer, driver, admin)
3. **customers**: Customer-specific data
4. **drivers**: Driver-specific data
5. **admins**: Admin-specific data
6. **bookings**: Booking/order information
7. **vehicles**: Vehicle fleet management
8. **bank_accounts**: Bank account details
9. **tanker_sizes**: Available tanker sizes
10. **pricing**: Distance-based pricing configuration
11. **subscription_plans**, **subscriptions**, **payment_transactions**: Subscription catalog, user subscriptions, and payment rows (Razorpay)
12. **society_trips** (and related columns/policies from migrations): Society trip records where applicable

### Row Level Security (RLS)

RLS is **enabled on all tables** with comprehensive role-based access control policies:

#### Tables with RLS Enabled
- `users` - User profile access control
- `user_roles` - Role management access
- `customers` - Customer data access
- `drivers` - Driver data access
- `admins` - Admin data access
- `bookings` - Booking access by role
- `vehicles` - Vehicle management by agency
- `bank_accounts` - Bank account access by admin and drivers (for payment collection)
- `expenses` - Admin can manage their own expenses (full CRUD)
- `tanker_sizes` - Public read, admin write
- `pricing` - Public read, admin write
- `driver_applications` - Public create, admin manage
- `driver_locations` - Driver and customer access

#### Policy Overview

**Users Table:**
- Users can view, insert, and update their own profile
- Users can delete their own row (for customer Delete Account flow; `id = auth.uid()`)
- Admins can view all users
- Customers can read admin users (for agency selection during booking)

**User Roles Table:**
- Users can view and insert their own roles
- Users can delete their own role rows (for account deletion; `user_id = auth.uid()`)
- Admins can view all user roles
- Customers can read admin roles (to identify agencies)

**Customers Table:**
- Customers can view, insert, and update their own data
- Customers can delete their own row (for Delete Account; `user_id = auth.uid()`)
- Admins can view all customer data

**Drivers Table:**
- Drivers can view, insert, and update their own data
- Admins can view and update all driver data

**Admins Table:**
- Admins can view, insert, and update their own data
- Admins can view other admin data
- Customers can read admin data (for agency selection during booking)

**Bookings Table:**
- Customers can create, view, and update their own bookings
- Customers can delete their own bookings (for Delete Account; `customer_id = auth.uid()`)
- Drivers can view available bookings and update assigned bookings
- Admins can view and update bookings for their agency

**Vehicles Table:**
- Admins can manage vehicles for their agency (full CRUD)
- Customers can read vehicles from any agency (for booking creation)

**Bank Accounts Table:**
- Admins can manage their own bank accounts (full CRUD)
- Drivers can read bank accounts for agencies where they have assigned bookings (for QR code display during payment collection)

**Expenses Table:**
- Admins can create, view, update, and delete their own expenses
- Supports filtering by expense type (diesel or maintenance)
- Includes receipt image upload functionality

**Tanker Sizes Table:**
- Everyone can view active tanker sizes
- Admins can view all sizes and manage them (full CRUD)

**Pricing Table:**
- Everyone can view pricing
- Admins can insert and update pricing

**Driver Applications Table:**
- Anyone can create driver applications
- Admins can view and update all applications

**Driver Locations Table:**
- Drivers can insert and view their own locations
- Admins can view all driver locations
- Customers can view driver locations for their active bookings

All policies use a secure `has_role()` helper function that checks user roles from the `user_roles` table.

**Customer Delete Account (migration 013):** The migration `013_allow_customer_delete_own_account.sql` adds DELETE policies so that authenticated users can remove their own data for the Delete Account flow: `bookings` (by `customer_id`), `customers` (by `user_id`), `user_roles` (by `user_id`), and `users` (by `id`). Apply this migration if customers use the Profile → Delete Account feature.

**Subscription enforcement:** Migration `026_enforce_subscription_bookings_and_society_trips.sql` adds database-level checks so new `bookings` and `society_trips` require an active subscription for the customer. The app mirrors this in `BookingService` and `SocietyTripService`.

### Realtime Subscriptions

Enable realtime for:
- `bookings` table (for status updates)
- `notifications` table (for push notifications)
- `users` table (for profile updates)

Add `subscriptions` / `payment_transactions` to your publication if the client subscribes to those channels for live payment or status updates (optional; depends on implementation).

## Troubleshooting

### Authentication Issues

**Problem**: Login fails or user not found

**Solutions**:
- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Ensure Email provider is enabled in Supabase Auth settings
- Check that user exists in `users` table with corresponding `user_roles` entry
- Verify RLS policies allow user access

### Realtime Not Working

**Problem**: Real-time updates not appearing

**Solutions**:
- Confirm realtime is enabled for relevant tables in Supabase
- Check that tables are added to realtime publication
- Verify subscription is active (check network tab)
- Ensure client is online and connected

### RLS Policy Errors

**Problem**: "Row Level Security policy violation" errors

**Solutions**:
- Ensure `user_roles` table has entry for the user's selected role
- Verify RLS policies match the user's role
- Check that policies allow the required operations (SELECT, INSERT, UPDATE, DELETE)
- Review Supabase logs for specific policy violations

### Build Issues

**Problem**: Build fails or app crashes on startup

**Solutions**:
- Clear Expo cache: `npx expo start -c`
- Delete `node_modules` and reinstall (Unix): `rm -rf node_modules && npm install` — on Windows, remove the folder manually or use `Remove-Item -Recurse -Force node_modules` then `npm install`
- Check for TypeScript errors: `npx tsc --noEmit`
- Verify all environment variables are set correctly

## Roadmap

### Version 2.0 (Planned Features)

- [x] **Razorpay foundation (Phase 0)** — SDK, types, checkout wrapper; see `docs/RAZORPAY_CUSTOMER_REPO_IMPLEMENTATION_PROMPT.md`
- [ ] **Razorpay subscription + booking checkout (Phases 1–3)** — Edge Functions, PaySubscription/PayBooking screens
- [ ] **Re-enable subscription gating** — Enable `FEATURE_FLAGS.enableSubscriptionGating` when Razorpay subscription flow is live
- [ ] **Broader payment UX**
  - Full payment history and receipts in-app
  - Refund management and additional gateways if product requires

- [ ] **Push Notifications**
  - Real-time order updates
  - Driver assignment notifications
  - Payment reminders

- [ ] **Real-time GPS Tracking**
  - Live driver location tracking
  - Route optimization
  - ETA calculations

- [ ] **Google Distance Matrix Integration**
  - Accurate distance calculations
  - Traffic-aware routing
  - Multiple route options

- [ ] **Driver Self-Registration**
  - Driver application workflow
  - Document upload and verification
  - Approval/rejection system

- [ ] **Ratings & Reviews**
  - Customer ratings for drivers
  - Driver ratings for customers
  - Review system

- [ ] **ASAP Bookings**
  - Immediate booking option
  - Priority queue for urgent orders
  - Fast-track driver assignment

- [ ] **Performance Optimizations**
  - Query optimization
  - Caching strategies
  - Image optimization
  - Bundle size reduction

- [ ] **Advanced Analytics**
  - Revenue forecasting
  - Driver performance metrics
  - Customer behavior analysis
  - Demand prediction

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues, questions, or contributions, please contact the development team or open an issue in the repository.

---

**Built with ❤️ using React Native, Expo, and Supabase**

