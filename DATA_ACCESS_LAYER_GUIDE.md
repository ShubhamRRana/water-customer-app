# Data Access Layer Usage Guide

## Overview

The Data Access Layer provides a unified interface for all data operations in the Water Tanker App. It abstracts the underlying storage implementation (currently Supabase) and allows for easy migration to different backends in the future.

**Key Benefits:**
- Consistent API across all services
- Easy to test with mock implementations
- Simple migration path between storage backends
- Type-safe operations with full TypeScript support

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Operations](#user-operations)
3. [Booking Operations](#booking-operations)
4. [Vehicle Operations](#vehicle-operations)
5. [Bank Account Operations](#bank-account-operations)
6. [Real-time Subscriptions](#real-time-subscriptions)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Migration from LocalStorageService](#migration-from-localstorageservice)

---

## Getting Started

### Import the Data Access Layer

```typescript
import { dataAccess } from '../lib';
```

The `dataAccess` object is a singleton instance that implements the `IDataAccessLayer` interface. It provides access to:
- `dataAccess.users` - User operations
- `dataAccess.bookings` - Booking operations
- `dataAccess.vehicles` - Vehicle operations
- `dataAccess.bankAccounts` - Bank account operations
- `dataAccess.generateId()` - Generate unique IDs
- `dataAccess.initialize()` - Initialize the data access layer

---

## User Operations

### Get Current User

```typescript
const currentUser = await dataAccess.users.getCurrentUser();
if (currentUser) {
  console.log('Logged in as:', currentUser.name);
}
```

### Get User by ID

```typescript
const user = await dataAccess.users.getUserById('user-123');
if (!user) {
  console.log('User not found');
}
```

### Get All Users

```typescript
const allUsers = await dataAccess.users.getUsers();
console.log(`Total users: ${allUsers.length}`);
```

### Save User (Session)

Saves user to session storage (for current logged-in user):

```typescript
const user: User = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890',
  role: 'customer',
  // ... other fields
};

await dataAccess.users.saveUser(user);
```

### Save User to Collection

Saves user to the users collection (for user management):

```typescript
await dataAccess.users.saveUserToCollection(user);
```

### Update User Profile

```typescript
await dataAccess.users.updateUserProfile('user-123', {
  name: 'John Smith',
  phone: '9876543210',
});
```

### Remove User (Logout)

```typescript
await dataAccess.users.removeUser();
```

### Subscribe to User Updates

```typescript
const unsubscribe = dataAccess.users.subscribeToUserUpdates(
  'user-123',
  (updatedUser) => {
    if (updatedUser) {
      console.log('User updated:', updatedUser);
    } else {
      console.log('User deleted');
    }
  }
);

// Later, unsubscribe
unsubscribe();
```

### Subscribe to All Users Updates

```typescript
const unsubscribe = dataAccess.users.subscribeToAllUsersUpdates(
  (user, eventType) => {
    console.log(`User ${eventType}:`, user);
  }
);
```

---

## Booking Operations

### Save Booking

```typescript
const booking: Booking = {
  id: dataAccess.generateId(),
  customerId: 'customer-123',
  customerName: 'John Doe',
  status: 'pending',
  tankerSize: 1000,
  basePrice: 500,
  // ... other fields
};

await dataAccess.bookings.saveBooking(booking);
```

### Update Booking

```typescript
await dataAccess.bookings.updateBooking('booking-123', {
  status: 'accepted',
  driverId: 'driver-456',
});
```

### Get Booking by ID

```typescript
const booking = await dataAccess.bookings.getBookingById('booking-123');
if (!booking) {
  throw new Error('Booking not found');
}
```

### Get All Bookings

```typescript
const allBookings = await dataAccess.bookings.getBookings();
```

### Get Bookings by Customer

```typescript
const customerBookings = await dataAccess.bookings.getBookingsByCustomer('customer-123');
```

### Get Bookings by Driver

```typescript
const driverBookings = await dataAccess.bookings.getBookingsByDriver('driver-456');
```

### Get Available Bookings

Returns bookings that are available for drivers to accept:

```typescript
const availableBookings = await dataAccess.bookings.getAvailableBookings();
```

### Subscribe to Booking Updates

```typescript
const unsubscribe = dataAccess.bookings.subscribeToBookingUpdates(
  'booking-123',
  (updatedBooking) => {
    if (updatedBooking) {
      console.log('Booking status:', updatedBooking.status);
    }
  }
);
```


---

## Vehicle Operations

### Save Vehicle

```typescript
const vehicle: Vehicle = {
  id: dataAccess.generateId(),
  vehicleNumber: 'ABC-1234',
  tankerSize: 1000,
  status: 'available',
  // ... other fields
};

await dataAccess.vehicles.saveVehicle(vehicle);
```

### Update Vehicle

```typescript
await dataAccess.vehicles.updateVehicle('vehicle-123', {
  status: 'in-use',
  driverId: 'driver-456',
});
```

### Get Vehicle by ID

```typescript
const vehicle = await dataAccess.vehicles.getVehicleById('vehicle-123');
```

### Get All Vehicles

```typescript
const allVehicles = await dataAccess.vehicles.getVehicles();
```

### Get Vehicles by Agency

```typescript
const agencyVehicles = await dataAccess.vehicles.getVehiclesByAgency('agency-123');
```

### Delete Vehicle

```typescript
await dataAccess.vehicles.deleteVehicle('vehicle-123');
```

### Subscribe to Vehicle Updates

```typescript
const unsubscribe = dataAccess.vehicles.subscribeToVehicleUpdates(
  'vehicle-123',
  (updatedVehicle) => {
    console.log('Vehicle updated:', updatedVehicle);
  }
);
```

### Subscribe to Agency Vehicles Updates

Subscribe to real-time updates for all vehicles belonging to a specific agency:

```typescript
const unsubscribe = dataAccess.vehicles.subscribeToAgencyVehiclesUpdates(
  'agency-123',
  (vehicle, eventType) => {
    switch (eventType) {
      case 'INSERT':
        addVehicleToList(vehicle);
        break;
      case 'UPDATE':
        updateVehicleInList(vehicle);
        break;
      case 'DELETE':
        removeVehicleFromList(vehicle);
        break;
    }
  }
);
```

---

## Bank Account Operations

### Save Bank Account

```typescript
const bankAccount: BankAccount = {
  id: dataAccess.generateId(),
  accountNumber: '1234567890',
  ifscCode: 'BANK0001234',
  accountHolderName: 'John Doe',
  bankName: 'Example Bank',
  // ... other fields
};

await dataAccess.bankAccounts.saveBankAccount(bankAccount, 'admin-123');
```

### Update Bank Account

```typescript
await dataAccess.bankAccounts.updateBankAccount(
  'account-123',
  { accountHolderName: 'Jane Doe' },
  'admin-123'
);
```

### Get Bank Account by ID

```typescript
const account = await dataAccess.bankAccounts.getBankAccountById('account-123');
```

### Get All Bank Accounts

Get all bank accounts for a specific admin:

```typescript
const allAccounts = await dataAccess.bankAccounts.getBankAccounts('admin-123');
```

### Get Default Bank Account

Get the default bank account for an admin:

```typescript
const defaultAccount = await dataAccess.bankAccounts.getDefaultBankAccount('admin-123');
if (!defaultAccount) {
  console.log('No default bank account set');
}
```

### Delete Bank Account

```typescript
await dataAccess.bankAccounts.deleteBankAccount('account-123', 'admin-123');
```

---

## Real-time Subscriptions

The data access layer supports real-time subscriptions for all entities. Subscriptions automatically handle:
- Connection state
- Reconnection logic
- Event filtering (INSERT, UPDATE, DELETE)

### Single Entity Subscription

```typescript
// Subscribe to updates for a specific booking
const unsubscribe = dataAccess.bookings.subscribeToBookingUpdates(
  'booking-123',
  (booking) => {
    if (booking) {
      // Booking was created or updated
      updateUI(booking);
    } else {
      // Booking was deleted
      handleBookingDeleted();
    }
  }
);

// Always unsubscribe when done
useEffect(() => {
  return () => {
    unsubscribe();
  };
}, []);
```

### Collection Subscription

```typescript
// Subscribe to all user updates
const unsubscribe = dataAccess.users.subscribeToAllUsersUpdates(
  (user, eventType) => {
    switch (eventType) {
      case 'INSERT':
        addUserToList(user);
        break;
      case 'UPDATE':
        updateUserInList(user);
        break;
      case 'DELETE':
        removeUserFromList(user);
        break;
    }
  }
);

// Subscribe to agency vehicle updates
const unsubscribeVehicles = dataAccess.vehicles.subscribeToAgencyVehiclesUpdates(
  'agency-123',
  (vehicle, eventType) => {
    switch (eventType) {
      case 'INSERT':
        addVehicleToList(vehicle);
        break;
      case 'UPDATE':
        updateVehicleInList(vehicle);
        break;
      case 'DELETE':
        removeVehicleFromList(vehicle);
        break;
    }
  }
);
```

### Multiple Subscriptions

```typescript
// Subscribe to multiple entities
const unsubscribers = [
  dataAccess.users.subscribeToUserUpdates('user-123', handleUserUpdate),
  dataAccess.bookings.subscribeToBookingUpdates('booking-123', handleBookingUpdate),
  dataAccess.vehicles.subscribeToVehicleUpdates('vehicle-123', handleVehicleUpdate),
  dataAccess.vehicles.subscribeToAgencyVehiclesUpdates('agency-123', handleAgencyVehiclesUpdate),
];

// Unsubscribe all at once
useEffect(() => {
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
}, []);
```

---

## Error Handling

The data access layer uses standardized error classes. Always handle errors appropriately:

```typescript
import { 
  NotFoundError, 
  DataAccessError, 
  ValidationError,
  handleAsyncError 
} from '../utils/errors';

// Method 1: Try-catch with error type checking
try {
  const booking = await dataAccess.bookings.getBookingById('booking-123');
  if (!booking) {
    throw new NotFoundError('Booking', 'booking-123');
  }
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Booking not found');
  } else if (error instanceof DataAccessError) {
    console.error('Database error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}

// Method 2: Using error handler utility
const result = await handleAsyncError(async () => {
  return await dataAccess.bookings.getBookingById('booking-123');
});

if (result.error) {
  console.error('Error:', result.error.message);
} else {
  console.log('Booking:', result.data);
}
```

### Common Error Types

- `NotFoundError` - Entity not found (404)
- `ValidationError` - Invalid input data (400)
- `DataAccessError` - Database operation failed (500)
- `NetworkError` - Network connectivity issue (503)
- `AuthorizationError` - Insufficient permissions (403)

---

## Best Practices

### 1. Always Check for Null Returns

```typescript
// ❌ Bad
const user = await dataAccess.users.getUserById('user-123');
console.log(user.name); // May throw if user is null

// ✅ Good
const user = await dataAccess.users.getUserById('user-123');
if (!user) {
  throw new NotFoundError('User', 'user-123');
}
console.log(user.name);
```

### 2. Use Type Guards

```typescript
import { isCustomerUser, isDriverUser } from '../types';

const user = await dataAccess.users.getUserById('user-123');
if (user && isCustomerUser(user)) {
  // TypeScript knows user is CustomerUser here
  console.log(user.savedAddresses);
}
```

### 3. Always Unsubscribe from Real-time Updates

```typescript
// ❌ Bad - Memory leak
useEffect(() => {
  dataAccess.bookings.subscribeToBookingUpdates('booking-123', handleUpdate);
}, []);

// ✅ Good
useEffect(() => {
  const unsubscribe = dataAccess.bookings.subscribeToBookingUpdates(
    'booking-123',
    handleUpdate
  );
  return unsubscribe;
}, []);
```

### 4. Use Partial Updates

```typescript
// ❌ Bad - Overwrites entire entity
const booking = await dataAccess.bookings.getBookingById('booking-123');
await dataAccess.bookings.updateBooking('booking-123', {
  ...booking,
  status: 'accepted',
});

// ✅ Good - Only update what changed
await dataAccess.bookings.updateBooking('booking-123', {
  status: 'accepted',
});
```

### 5. Handle Errors Gracefully

```typescript
// ❌ Bad - Silent failure
await dataAccess.bookings.saveBooking(booking);

// ✅ Good - Proper error handling
try {
  await dataAccess.bookings.saveBooking(booking);
  showSuccessMessage('Booking created!');
} catch (error) {
  if (error instanceof ValidationError) {
    showErrorMessage('Invalid booking data');
  } else {
    showErrorMessage('Failed to create booking');
    logError(error);
  }
}
```

### 6. Use Generated IDs

```typescript
// ✅ Always use dataAccess.generateId() for new entities
const booking: Booking = {
  id: dataAccess.generateId(), // ✅
  // ... other fields
};
```

---

## Migration from LocalStorageService

If you have existing code using `LocalStorageService`, here's how to migrate:

### Before (LocalStorageService)

```typescript
import { LocalStorageService } from '../services/localStorage';

// Get user
const user = await LocalStorageService.getUserById('user-123');

// Save booking
await LocalStorageService.saveBooking(booking);

// Get bookings
const bookings = await LocalStorageService.getBookings();
```

### After (Data Access Layer)

```typescript
import { dataAccess } from '../lib';

// Get user
const user = await dataAccess.users.getUserById('user-123');

// Save booking
await dataAccess.bookings.saveBooking(booking);

// Get bookings
const bookings = await dataAccess.bookings.getBookings();
```

### Key Differences

1. **Namespace:** Operations are grouped by entity type (`users`, `bookings`, `vehicles`)
2. **Error Handling:** Uses standardized error classes
3. **Real-time:** Built-in subscription support
4. **Type Safety:** Better TypeScript support

### Migration Checklist

- [ ] Replace `LocalStorageService.getUserById()` with `dataAccess.users.getUserById()`
- [ ] Replace `LocalStorageService.saveBooking()` with `dataAccess.bookings.saveBooking()`
- [ ] Replace `LocalStorageService.getBookings()` with `dataAccess.bookings.getBookings()`
- [ ] Update error handling to use standardized error classes
- [ ] Add real-time subscriptions where needed
- [ ] Update tests to use data access layer mocks

---

## API Reference

### IDataAccessLayer

```typescript
interface IDataAccessLayer {
  users: IUserDataAccess;
  bookings: IBookingDataAccess;
  vehicles: IVehicleDataAccess;
  bankAccounts: IBankAccountDataAccess;
  generateId(): string;
  initialize(): Promise<void>;
}
```

### IUserDataAccess

```typescript
interface IUserDataAccess {
  getCurrentUser(): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  removeUser(): Promise<void>;
  getUserById(id: string): Promise<User | null>;
  getUsers(): Promise<User[]>;
  saveUserToCollection(user: User): Promise<void>;
  updateUserProfile(id: string, updates: Partial<User>): Promise<void>;
  subscribeToUserUpdates(id: string, callback: SubscriptionCallback<User>): Unsubscribe;
  subscribeToAllUsersUpdates(callback: CollectionSubscriptionCallback<User>): Unsubscribe;
}
```

### IBookingDataAccess

```typescript
interface IBookingDataAccess {
  saveBooking(booking: Booking): Promise<void>;
  updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void>;
  getBookings(): Promise<Booking[]>;
  getBookingById(bookingId: string): Promise<Booking | null>;
  getBookingsByCustomer(customerId: string): Promise<Booking[]>;
  getBookingsByDriver(driverId: string): Promise<Booking[]>;
  getAvailableBookings(): Promise<Booking[]>;
  subscribeToBookingUpdates(bookingId: string, callback: SubscriptionCallback<Booking>): Unsubscribe;
}
```

### IVehicleDataAccess

```typescript
interface IVehicleDataAccess {
  saveVehicle(vehicle: Vehicle): Promise<void>;
  updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void>;
  getVehicles(): Promise<Vehicle[]>;
  getVehicleById(vehicleId: string): Promise<Vehicle | null>;
  deleteVehicle(vehicleId: string): Promise<void>;
  getVehiclesByAgency(agencyId: string): Promise<Vehicle[]>;
  subscribeToVehicleUpdates(vehicleId: string, callback: SubscriptionCallback<Vehicle>): Unsubscribe;
  subscribeToAgencyVehiclesUpdates(agencyId: string, callback: CollectionSubscriptionCallback<Vehicle>): Unsubscribe;
}
```

### IBankAccountDataAccess

```typescript
interface IBankAccountDataAccess {
  getBankAccounts(adminId: string): Promise<BankAccount[]>;
  getBankAccountById(accountId: string, adminId: string): Promise<BankAccount | null>;
  getDefaultBankAccount(adminId: string): Promise<BankAccount | null>;
  saveBankAccount(bankAccount: BankAccount, adminId: string): Promise<void>;
  updateBankAccount(accountId: string, updates: Partial<BankAccount>, adminId: string): Promise<void>;
  deleteBankAccount(accountId: string, adminId: string): Promise<void>;
}
```

---

## Troubleshooting

### Subscription Not Working

1. Check that you're unsubscribing properly
2. Verify the entity ID exists
3. Check network connectivity
4. Review error logs for connection issues

### Entity Not Found

1. Verify the ID is correct
2. Check if the entity was deleted
3. Ensure proper error handling for null returns

### Performance Issues

1. Use specific queries (e.g., `getBookingsByCustomer` instead of filtering all bookings)
2. Unsubscribe from unused subscriptions
3. Use partial updates instead of full entity updates
4. Consider pagination for large datasets

---

## Additional Resources

- `src/lib/dataAccess.interface.ts` - Full interface definitions
- `src/lib/supabaseDataAccess.ts` - Current implementation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `CODE_QUALITY_REPORT.md` - Code quality improvements

---

*Last updated: [Current Date]*
*Version: 1.0*

