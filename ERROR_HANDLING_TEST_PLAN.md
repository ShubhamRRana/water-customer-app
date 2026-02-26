# Error Handling Test Plan

This document provides a comprehensive test plan for verifying error handling across all user flows in the Water Tanker App. The tests focus on three key aspects:

1. **Error Scenarios**: Testing various error conditions in all user flows
2. **User-Friendly Messages**: Verifying error messages are clear and actionable
3. **Error Logging**: Ensuring errors are properly logged with context

---

## Test Environment Setup

### Prerequisites
- App running in development mode
- Access to error logger (`errorLogger.getAllLogs()`)
- Network conditions can be controlled (airplane mode, network throttling)
- Test accounts for each role (customer, driver, admin)

### Tools Needed
- React Native Debugger or console access
- Network inspection tools (optional)
- Test data for various scenarios

---

## Test Categories

### 1. Authentication Flow Tests

#### 1.1 Login Flow - Invalid Credentials
**Test Steps:**
1. Navigate to Login Screen
2. Enter invalid email/password combination
3. Attempt to login

**Expected Results:**
- ✅ Error alert shown with message: "Invalid email address or password."
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'login', email: '...' }`
- ✅ Error code: `AUTH_ERROR`

**Verification:**
```typescript
// Check error logs
const logs = errorLogger.getRecentLogs(1);
expect(logs[0].severity).toBe(ErrorSeverity.HIGH);
expect(logs[0].context.operation).toBe('login');
```

#### 1.2 Login Flow - Network Error
**Test Steps:**
1. Enable airplane mode or disable network
2. Navigate to Login Screen
3. Enter valid credentials
4. Attempt to login

**Expected Results:**
- ✅ Error alert shown with message: "Network error. Please check your internet connection."
- ✅ Error logged with severity: HIGH
- ✅ Error type: `NetworkError`
- ✅ Error code: `NETWORK_ERROR`

#### 1.3 Login Flow - Role Mismatch
**Test Steps:**
1. Create a customer account
2. Navigate to Driver Login Screen
3. Attempt to login with customer credentials

**Expected Results:**
- ✅ Error alert shown with message: "Invalid credentials for this account type. Please use the correct login page for your account."
- ✅ Error logged with severity: HIGH
- ✅ Error context includes role mismatch information

#### 1.4 Register Flow - Existing User
**Test Steps:**
1. Navigate to Register Screen
2. Enter email that already exists
3. Complete registration form
4. Submit registration

**Expected Results:**
- ✅ Error alert shown with message: "User already exists with this email address."
- ✅ Error logged with severity: MEDIUM
- ✅ Error code: `AUTH_ERROR` or includes `AUTH`

#### 1.5 Register Flow - Validation Error
**Test Steps:**
1. Navigate to Register Screen
2. Enter invalid phone number (less than 10 digits)
3. Submit registration

**Expected Results:**
- ✅ Error alert shown with validation message
- ✅ Error logged with severity: MEDIUM
- ✅ Error type: `ValidationError`
- ✅ Error context includes field information

#### 1.6 Logout Flow - Network Error
**Test Steps:**
1. Login successfully
2. Enable airplane mode
3. Attempt to logout

**Expected Results:**
- ✅ Error logged (may or may not show alert depending on implementation)
- ✅ Error logged with severity: MEDIUM
- ✅ Error context includes: `{ operation: 'logout' }`

---

### 2. Booking Flow Tests (Customer)

#### 2.1 Create Booking - Network Error
**Test Steps:**
1. Login as customer
2. Navigate to Booking Screen
3. Fill booking form
4. Enable airplane mode
5. Submit booking

**Expected Results:**
- ✅ Error alert shown with message: "Network error. Please check your internet connection."
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'createBooking', userId: '...' }`

#### 2.2 Create Booking - Validation Error
**Test Steps:**
1. Login as customer
2. Navigate to Booking Screen
3. Leave required fields empty (e.g., delivery address)
4. Attempt to submit booking

**Expected Results:**
- ✅ Error alert shown with validation message
- ✅ Error logged with severity: MEDIUM
- ✅ Error type: `ValidationError`
- ✅ Error context includes field information

#### 2.3 Create Booking - Service Error
**Test Steps:**
1. Login as customer
2. Navigate to Booking Screen
3. Fill booking form with invalid data (e.g., invalid agency ID)
4. Submit booking

**Expected Results:**
- ✅ Error alert shown with message: "Failed to create booking." or user-friendly message
- ✅ Error logged with severity: MEDIUM
- ✅ Error context includes booking data (sanitized)

#### 2.4 Update Booking - Not Found
**Test Steps:**
1. Login as customer
2. Navigate to Order History
3. Attempt to update a booking that doesn't exist (simulate by using invalid ID)

**Expected Results:**
- ✅ Error alert shown with message: "Booking not found."
- ✅ Error logged with severity: MEDIUM
- ✅ Error type: `NotFoundError`
- ✅ Error code: `BOOKING_NOT_FOUND`

#### 2.5 Cancel Booking - Already Accepted
**Test Steps:**
1. Login as customer
2. Create a booking
3. Have driver accept the booking (in separate session)
4. Attempt to cancel the booking

**Expected Results:**
- ✅ Error alert shown with message: "This booking cannot be cancelled." or "Booking has already been accepted by another driver."
- ✅ Error logged with severity: MEDIUM
- ✅ Error context includes booking status

#### 2.6 Load Bookings - Network Error
**Test Steps:**
1. Login as customer
2. Navigate to Order History
3. Enable airplane mode
4. Screen attempts to load bookings

**Expected Results:**
- ✅ Error logged (may or may not show alert)
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'fetchBookingsByCustomer' }`

---

### 3. Driver Flow Tests

#### 3.1 Accept Booking - Already Accepted
**Test Steps:**
1. Login as driver
2. View available bookings
3. Attempt to accept a booking that was just accepted by another driver

**Expected Results:**
- ✅ Error alert shown with message: "Booking has already been accepted by another driver."
- ✅ Error logged with severity: MEDIUM
- ✅ Error code includes `BOOKING`

#### 3.2 Update Booking Status - Network Error
**Test Steps:**
1. Login as driver
2. Accept a booking
3. Enable airplane mode
4. Attempt to update booking status to "in_transit"

**Expected Results:**
- ✅ Error alert shown with message: "Network error. Please check your internet connection."
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'updateBookingStatus', bookingId: '...' }`

#### 3.3 Collect Payment - Validation Error
**Test Steps:**
1. Login as driver
2. Navigate to Collect Payment Screen
3. Enter invalid amount (negative or zero)
4. Submit payment

**Expected Results:**
- ✅ Error alert shown with validation message
- ✅ Error logged with severity: MEDIUM
- ✅ Error type: `ValidationError`

#### 3.4 Load Orders - Network Error
**Test Steps:**
1. Login as driver
2. Navigate to Orders Screen
3. Enable airplane mode
4. Screen attempts to load orders

**Expected Results:**
- ✅ Error logged (may or may not show alert)
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'fetchBookingsByDriver' }`

---

### 4. Admin Flow Tests

#### 4.1 Add Driver - Validation Error
**Test Steps:**
1. Login as admin
2. Navigate to Driver Management Screen
3. Fill form with invalid phone number
4. Submit

**Expected Results:**
- ✅ Error alert shown with validation message
- ✅ Error logged with severity: MEDIUM
- ✅ Error type: `ValidationError`
- ✅ Error context includes field information

#### 4.2 Add Driver - Duplicate User
**Test Steps:**
1. Login as admin
2. Navigate to Driver Management Screen
3. Enter email that already exists
4. Submit

**Expected Results:**
- ✅ Error alert shown with appropriate message
- ✅ Error logged with severity: MEDIUM
- ✅ Error context includes: `{ operation: 'addUser', role: 'driver' }`

#### 4.3 Update Vehicle - Not Found
**Test Steps:**
1. Login as admin
2. Navigate to Vehicle Management Screen
3. Attempt to update vehicle with invalid ID

**Expected Results:**
- ✅ Error alert shown with message indicating vehicle not found
- ✅ Error logged with severity: MEDIUM
- ✅ Error type: `NotFoundError`

#### 4.4 Delete Vehicle - Network Error
**Test Steps:**
1. Login as admin
2. Navigate to Vehicle Management Screen
3. Select a vehicle to delete
4. Enable airplane mode
5. Attempt to delete

**Expected Results:**
- ✅ Error alert shown with message: "Network error. Please check your internet connection."
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'deleteVehicle', vehicleId: '...' }`

#### 4.5 Load All Bookings - Network Error
**Test Steps:**
1. Login as admin
2. Navigate to All Bookings Screen
3. Enable airplane mode
4. Screen attempts to load bookings

**Expected Results:**
- ✅ Error logged (may or may not show alert)
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'fetchAllBookings' }`

---

### 5. Location Services Tests

#### 5.1 Get Location - Permission Denied
**Test Steps:**
1. Deny location permissions when prompted
2. Navigate to Booking Screen
3. Attempt to use current location

**Expected Results:**
- ✅ Error alert shown with message: "Location permission denied."
- ✅ Error logged with severity: MEDIUM
- ✅ Error code: `LOCATION_PERMISSION_DENIED`

#### 5.2 Get Location - Service Disabled
**Test Steps:**
1. Disable location services in device settings
2. Navigate to Booking Screen
3. Attempt to use current location

**Expected Results:**
- ✅ Error alert shown with message: "Location services are disabled."
- ✅ Error logged with severity: MEDIUM

#### 5.3 Get Location - Timeout
**Test Steps:**
1. Navigate to Booking Screen
2. Simulate slow location response (may require mocking)
3. Location request times out

**Expected Results:**
- ✅ Error alert shown with message: "Location request timed out."
- ✅ Error logged with severity: MEDIUM

---

### 6. Payment Flow Tests

#### 6.1 Process Payment - Network Error
**Test Steps:**
1. Complete booking flow
2. Navigate to payment screen
3. Enable airplane mode
4. Attempt to process payment

**Expected Results:**
- ✅ Error alert shown with message: "Network error during payment."
- ✅ Error logged with severity: HIGH
- ✅ Error context includes: `{ operation: 'processPayment', bookingId: '...' }`

#### 6.2 Process Payment - Failed
**Test Steps:**
1. Complete booking flow
2. Navigate to payment screen
3. Simulate payment failure (may require mocking)

**Expected Results:**
- ✅ Error alert shown with message: "Payment failed. Please try again."
- ✅ Error logged with severity: HIGH
- ✅ Error context includes payment details (sanitized)

---

## Verification Methods

### Method 1: Check Error Logs Programmatically

Create a test utility to verify error logs:

```typescript
// test-utils/errorVerification.ts
import { errorLogger } from '../src/utils/errorLogger';
import { ErrorSeverity } from '../src/utils/errorLogger';

export function verifyErrorLogged(
  operation: string,
  expectedSeverity?: ErrorSeverity,
  expectedCode?: string
): boolean {
  const logs = errorLogger.getRecentLogs(1);
  if (logs.length === 0) return false;
  
  const log = logs[0];
  const hasOperation = log.context?.operation === operation;
  const hasSeverity = !expectedSeverity || log.severity === expectedSeverity;
  const hasCode = !expectedCode || log.context?.errorCode === expectedCode;
  
  return hasOperation && hasSeverity && hasCode;
}

export function clearErrorLogs(): void {
  errorLogger.clearLogs();
}
```

### Method 2: Manual Verification Checklist

For each test scenario, verify:

- [ ] Error alert is displayed (if user-facing operation)
- [ ] Error message is user-friendly (not technical jargon)
- [ ] Error message matches expected message from `ERROR_MESSAGES`
- [ ] Error is logged in error logger
- [ ] Error log includes operation context
- [ ] Error log includes appropriate severity level
- [ ] Error log includes error code
- [ ] Error log includes timestamp

### Method 3: Automated Test Script

Create a test script that can be run to verify error handling:

```typescript
// tests/errorHandling.test.ts
import { errorLogger } from '../src/utils/errorLogger';
import { handleError } from '../src/utils/errorHandler';
import { NetworkError, ValidationError, AuthenticationError } from '../src/utils/errors';

describe('Error Handling', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
  });

  test('Network errors are logged with HIGH severity', () => {
    const error = new NetworkError('Connection failed');
    handleError(error, { context: { operation: 'testOperation' } });
    
    const logs = errorLogger.getRecentLogs(1);
    expect(logs[0].severity).toBe(ErrorSeverity.HIGH);
    expect(logs[0].context.operation).toBe('testOperation');
  });

  test('Validation errors show user-friendly messages', () => {
    const error = new ValidationError('Invalid input', 'email');
    handleError(error, { context: { operation: 'testOperation' } });
    
    const logs = errorLogger.getRecentLogs(1);
    expect(logs[0].context.errorCode).toBe('VALIDATION_ERROR');
  });

  // Add more test cases...
});
```

---

## Error Message Verification

### Expected User-Friendly Messages

All error messages should come from `ERROR_MESSAGES` constant:

| Error Type | Expected Message |
|------------|------------------|
| Network Error | "Network error. Please check your internet connection." |
| Authentication Error | "Invalid email address or password." |
| Validation Error | "Invalid input provided." or specific field message |
| Booking Not Found | "Booking not found." |
| Booking Create Failed | "Failed to create booking." |
| Location Permission Denied | "Location permission denied." |
| Payment Failed | "Payment failed. Please try again." |

### Message Quality Checklist

- [ ] Message is in plain language (no technical jargon)
- [ ] Message is actionable (tells user what to do)
- [ ] Message is concise (not too long)
- [ ] Message matches the error type
- [ ] Message comes from `ERROR_MESSAGES` constant (not hardcoded)

---

## Error Logging Verification

### Required Log Fields

Each error log should include:

1. **Message**: Descriptive error message
2. **Error Object**: The original error
3. **Severity**: LOW, MEDIUM, HIGH, or CRITICAL
4. **Context**: Object with operation details
5. **Timestamp**: When the error occurred
6. **Stack Trace**: If available (for Error instances)

### Context Requirements

Error context should include:

- `operation`: Name of the operation that failed
- `errorCode`: Standardized error code
- `originalError`: Original error message
- Additional context specific to the operation (e.g., `userId`, `bookingId`)

### Severity Guidelines

- **CRITICAL**: System failures, data corruption risks
- **HIGH**: Network errors, authentication failures, payment failures
- **MEDIUM**: Validation errors, business logic errors, not found errors
- **LOW**: Non-critical warnings, deprecation notices

---

## Test Execution Plan

### Phase 1: Manual Testing (Week 1)
- Execute all test scenarios manually
- Document any issues found
- Verify error messages are user-friendly
- Check error logs are properly recorded

### Phase 2: Automated Testing (Week 2)
- Create automated test scripts for critical flows
- Set up continuous integration tests
- Monitor error logs in production-like environment

### Phase 3: Edge Case Testing (Week 3)
- Test error handling with edge cases
- Test error handling under load
- Test error recovery scenarios

---

## Test Results Template

For each test scenario, document:

```
Test ID: [Unique identifier]
Test Name: [Descriptive name]
Date: [Test date]
Tester: [Tester name]

Steps:
1. [Step 1]
2. [Step 2]
...

Expected Results:
- [Expected result 1]
- [Expected result 2]

Actual Results:
- [Actual result 1]
- [Actual result 2]

Status: [PASS / FAIL / BLOCKED]
Notes: [Any additional notes]

Error Log Verification:
- Error logged: [YES / NO]
- Severity: [LOW / MEDIUM / HIGH / CRITICAL]
- Context includes operation: [YES / NO]
- Error code: [Code value]
- User message: [Message shown to user]
```

---

## Known Issues and Limitations

### Current Limitations
1. Error tracking service integration is not yet implemented (TODO in `errorLogger.ts`)
2. Some error messages may need refinement based on user feedback
3. Network error detection may need improvement for edge cases

### Future Enhancements
1. Integrate with error tracking service (Sentry, Bugsnag, etc.)
2. Add error analytics dashboard
3. Implement error recovery mechanisms
4. Add retry logic for transient errors

---

## Related Documents

- `ERROR_HANDLING_ANALYSIS.md` - Error handling pattern analysis
- `CODEBASE_IMPROVEMENTS.md` - Implementation improvements
- `src/utils/errorHandler.ts` - Error handler implementation
- `src/utils/errorLogger.ts` - Error logger implementation
- `src/constants/config.ts` - Error message constants

---

*Last Updated: [Current Date]*  
*Test Plan Version: 1.0*

