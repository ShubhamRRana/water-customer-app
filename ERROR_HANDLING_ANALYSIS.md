# Error Handling Pattern Analysis

## Problem Identified

The codebase has **inconsistent error handling patterns** across different files:

1. **Some use only `Alert.alert()`** - No error logging
2. **Some use only `errorLogger`** - No user feedback
3. **Some use both** - Inconsistent implementation
4. **Some use custom error extraction** - Different patterns for getting error messages
5. **No standardized severity levels** - Same error types logged with different severities

## Current Patterns Found

### Pattern 1: Alert Only (No Logging)
**Files:** `LoginScreen.tsx`, `RegisterScreen.tsx`, `VehicleManagementScreen.tsx`, `SavedAddressesScreen.tsx`

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Login failed';
  Alert.alert('Login Failed', ERROR_MESSAGES.auth.invalidCredentials);
}
```

**Issues:**
- Errors are not logged for debugging
- No context information captured
- Difficult to track error patterns

### Pattern 2: Logger Only (No User Feedback)
**Files:** `BookingScreen.tsx` (some catch blocks), `OrderTrackingScreen.tsx` (some catch blocks)

```typescript
catch (error) {
  errorLogger.medium('Failed to load agencies', error);
}
```

**Issues:**
- Users don't know when operations fail
- Poor user experience
- Errors may go unnoticed

### Pattern 3: Both (Inconsistent Implementation)
**Files:** `BookingScreen.tsx`, `OrderHistoryScreen.tsx`

```typescript
catch (error) {
  errorLogger.medium('Failed to load customer bookings', error, { userId: user.id });
  Alert.alert('Error', 'Failed to load your orders. Please try again.');
}
```

**Issues:**
- Inconsistent error message extraction
- Different severity levels for similar errors
- Manual error message construction

### Pattern 4: Custom Error Extraction
**Files:** Multiple files

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  Alert.alert('Error', `Failed to create booking: ${errorMessage}. Please try again.`);
}
```

**Issues:**
- Duplicated error extraction logic
- Inconsistent error message formatting
- No use of existing error utilities

## Solution: Centralized Error Handler

Created `src/utils/errorHandler.ts` with standardized error handling:

### Features

1. **Always logs errors** using `errorLogger` with appropriate severity
2. **Shows user-friendly messages** using `Alert.alert` when appropriate
3. **Uses existing error utilities** (`normalizeError`, `getErrorMessage`, `getErrorCode`)
4. **Maps error types to user-friendly messages** from `ERROR_MESSAGES`
5. **Determines severity automatically** based on error type
6. **Provides context** for debugging

### Usage Examples

#### Basic Usage (User-Facing Operation)
```typescript
import { handleError } from '../utils/errorHandler';

try {
  await createBooking(bookingData);
} catch (error) {
  handleError(error, {
    context: { operation: 'createBooking', userId: user.id },
    userFacing: true // Default, shows alert
  });
}
```

#### Non-User-Facing Operation (Logging Only)
```typescript
try {
  await loadAgencies();
} catch (error) {
  handleError(error, {
    context: { operation: 'loadAgencies' },
    userFacing: false, // No alert shown
    severity: ErrorSeverity.LOW
  });
}
```

#### Using Async Operation Wrapper
```typescript
import { handleAsyncOperation } from '../utils/errorHandler';

const result = await handleAsyncOperation(
  async () => await createBooking(bookingData),
  {
    context: { operation: 'createBooking', userId: user.id },
    userFacing: true
  }
);

if (result) {
  // Success
} else {
  // Error was handled (logged and shown to user)
}
```

#### With Custom Alert Message
```typescript
try {
  await updateProfile(profileData);
} catch (error) {
  handleError(error, {
    alertTitle: 'Profile Update Failed',
    alertMessage: 'Unable to update your profile. Please check your connection and try again.',
    context: { operation: 'updateProfile', userId: user.id }
  });
}
```

## Migration Recommendations

### Priority 1: User-Facing Operations
Migrate these files first (they affect user experience):
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/RegisterScreen.tsx`
- `src/screens/customer/BookingScreen.tsx`
- `src/screens/customer/SavedAddressesScreen.tsx`
- `src/screens/admin/VehicleManagementScreen.tsx`
- `src/screens/admin/DriverManagementScreen.tsx`
- `src/screens/admin/AdminProfileScreen.tsx`

### Priority 2: Background Operations
Migrate these files (they need logging but may not need alerts):
- `src/screens/customer/OrderTrackingScreen.tsx`
- `src/screens/customer/CustomerHomeScreen.tsx`
- `src/components/driver/OrdersList.tsx`
- `src/components/admin/BookingCard.tsx`

### Migration Pattern

**Before:**
```typescript
try {
  await someOperation();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  Alert.alert('Error', `Failed: ${errorMessage}. Please try again.`);
}
```

**After:**
```typescript
import { handleError } from '../utils/errorHandler';

try {
  await someOperation();
} catch (error) {
  handleError(error, {
    context: { operation: 'someOperation', userId: user?.id }
  });
}
```

## Benefits

1. **Consistent Error Handling** - All errors handled the same way
2. **Better Debugging** - All errors logged with context
3. **Improved UX** - User-friendly messages shown consistently
4. **Maintainability** - Single place to update error handling logic
5. **Type Safety** - Uses existing error utilities and types
6. **Flexibility** - Can customize per use case while maintaining consistency

## Error Severity Mapping

The handler automatically determines severity:
- **HIGH**: Authentication errors, Network errors
- **MEDIUM**: Validation errors, General errors
- **LOW**: Optional operations, non-critical failures

## User Message Mapping

The handler maps error types to user-friendly messages:
- `AuthenticationError` → `ERROR_MESSAGES.auth.invalidCredentials`
- `NetworkError` → `ERROR_MESSAGES.network`
- `ValidationError` → Error message or `ERROR_MESSAGES.general.invalidInput`
- `NotFoundError` → Error message or `ERROR_MESSAGES.general.unexpected`
- Booking errors → Appropriate `ERROR_MESSAGES.booking.*` message
- Unknown errors → `ERROR_MESSAGES.general.tryAgain`

## Next Steps

1. ✅ Created centralized error handler (`src/utils/errorHandler.ts`)
2. ⏳ Migrate high-priority files (user-facing operations)
3. ⏳ Migrate medium-priority files (background operations)
4. ⏳ Update code review document
5. ⏳ Add tests for error handler utility

