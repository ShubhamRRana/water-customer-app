/**
 * Centralized Error Handler
 * 
 * Provides a standardized way to handle errors across the application.
 * Always logs errors using errorLogger and optionally shows user-friendly messages.
 */

import { Alert } from 'react-native';
import { errorLogger, ErrorSeverity } from './errorLogger';
import {
  AppError,
  getErrorMessage,
  getErrorCode,
  normalizeError,
  isAppError,
  isErrorType,
  AuthenticationError,
  NetworkError,
  ValidationError,
  NotFoundError,
} from './errors';
import { ERROR_MESSAGES } from '../constants/config';

export interface ErrorHandlerOptions {
  /**
   * Whether to show an alert to the user
   * @default true for user-facing operations
   */
  showAlert?: boolean;
  
  /**
   * Custom alert title (defaults to 'Error')
   */
  alertTitle?: string;
  
  /**
   * Custom alert message (defaults to extracted error message)
   */
  alertMessage?: string;
  
  /**
   * Error severity for logging
   * @default ErrorSeverity.MEDIUM
   */
  severity?: ErrorSeverity;
  
  /**
   * Additional context for error logging
   */
  context?: Record<string, unknown>;
  
  /**
   * Whether this is a user-facing operation (affects default showAlert)
   * @default true
   */
  userFacing?: boolean;
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyMessage(error: unknown): string {
  // Check for specific error types
  if (isErrorType(error, AuthenticationError)) {
    return ERROR_MESSAGES.auth.invalidCredentials;
  }
  
  if (isErrorType(error, NetworkError)) {
    return ERROR_MESSAGES.network;
  }
  
  if (isErrorType(error, ValidationError)) {
    return error.message || ERROR_MESSAGES.general.invalidInput;
  }
  
  if (isErrorType(error, NotFoundError)) {
    return error.message || ERROR_MESSAGES.general.unexpected;
  }
  
  // Check error code for known patterns
  if (isAppError(error)) {
    const code = error.code;
    
    // Authentication errors
    if (code === 'AUTH_ERROR' || code.includes('AUTH')) {
      return ERROR_MESSAGES.auth.invalidCredentials;
    }
    
    // Network errors
    if (code === 'NETWORK_ERROR' || code.includes('NETWORK')) {
      return ERROR_MESSAGES.network;
    }
    
    // Validation errors
    if (code === 'VALIDATION_ERROR' || code.includes('VALIDATION')) {
      return error.message || ERROR_MESSAGES.general.invalidInput;
    }
    
    // Booking errors
    if (code.includes('BOOKING')) {
      if (code.includes('CREATE')) {
        return ERROR_MESSAGES.booking.createFailed;
      }
      if (code.includes('UPDATE')) {
        return ERROR_MESSAGES.booking.updateFailed;
      }
      if (code.includes('CANCEL')) {
        return ERROR_MESSAGES.booking.cancelFailed;
      }
      if (code.includes('NOT_FOUND')) {
        return ERROR_MESSAGES.booking.notFound;
      }
    }
    
    // Use error message if available
    if (error.message) {
      return error.message;
    }
  }
  
  // Extract message from any error type
  const message = getErrorMessage(error);
  
  // Return generic message if extraction failed
  return message !== 'An unknown error occurred' 
    ? message 
    : ERROR_MESSAGES.general.tryAgain;
}

/**
 * Determine error severity based on error type
 */
function getErrorSeverity(error: unknown): ErrorSeverity {
  if (isErrorType(error, AuthenticationError) || isErrorType(error, NetworkError)) {
    return ErrorSeverity.HIGH;
  }
  
  if (isErrorType(error, ValidationError)) {
    return ErrorSeverity.MEDIUM;
  }
  
  if (isAppError(error)) {
    const code = error.code;
    if (code === 'AUTH_ERROR' || code === 'NETWORK_ERROR') {
      return ErrorSeverity.HIGH;
    }
    if (code === 'VALIDATION_ERROR') {
      return ErrorSeverity.MEDIUM;
    }
  }
  
  return ErrorSeverity.MEDIUM;
}

/**
 * Centralized error handler
 * 
 * @param error - The error to handle
 * @param options - Error handling options
 * 
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, {
 *     context: { operation: 'createBooking', userId: user.id },
 *     userFacing: true
 *   });
 * }
 * ```
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): void {
  const {
    showAlert = options.userFacing !== false, // Default true unless explicitly false
    alertTitle = 'Error',
    alertMessage,
    severity,
    context = {},
    userFacing = true,
  } = options;

  // Normalize error to AppError for consistent handling
  const normalizedError = normalizeError(error);
  
  // Determine severity if not provided
  const errorSeverity = severity || getErrorSeverity(normalizedError);
  
  // Get user-friendly message
  const userMessage = alertMessage || getUserFriendlyMessage(normalizedError);
  
  // Log the error with context
  const logContext = {
    ...context,
    errorCode: getErrorCode(normalizedError),
    originalError: getErrorMessage(error),
  };
  
  errorLogger.log(
    `Error: ${getErrorMessage(normalizedError)}`,
    normalizedError,
    errorSeverity,
    logContext
  );
  
  // Show alert if requested
  if (showAlert && userFacing) {
    Alert.alert(alertTitle, userMessage);
  }
}

/**
 * Handle async operation errors
 * 
 * Wraps an async operation with standardized error handling.
 * 
 * @param operation - The async operation to execute
 * @param options - Error handling options
 * 
 * @example
 * ```typescript
 * await handleAsyncOperation(
 *   async () => await createBooking(bookingData),
 *   {
 *     context: { operation: 'createBooking' },
 *     userFacing: true
 *   }
 * );
 * ```
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, options);
    return null;
  }
}

/**
 * Handle async operation errors with rethrow
 * 
 * Logs the error but rethrows it for upstream handling.
 * 
 * @param operation - The async operation to execute
 * @param options - Error handling options
 * 
 * @example
 * ```typescript
 * try {
 *   await handleAsyncOperationWithRethrow(
 *     async () => await criticalOperation(),
 *     { context: { operation: 'criticalOperation' } }
 *   );
 * } catch (error) {
 *   // Error is logged but still thrown
 * }
 * ```
 */
export async function handleAsyncOperationWithRethrow<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, { ...options, showAlert: false }); // Don't show alert, let caller decide
    throw error;
  }
}

/**
 * Handle sync operation errors
 * 
 * @param operation - The sync operation to execute
 * @param options - Error handling options
 */
export function handleSyncOperation<T>(
  operation: () => T,
  options: ErrorHandlerOptions = {}
): T | null {
  try {
    return operation();
  } catch (error) {
    handleError(error, options);
    return null;
  }
}

/**
 * Handle sync operation errors with rethrow
 * 
 * @param operation - The sync operation to execute
 * @param options - Error handling options
 */
export function handleSyncOperationWithRethrow<T>(
  operation: () => T,
  options: ErrorHandlerOptions = {}
): T {
  try {
    return operation();
  } catch (error) {
    handleError(error, { ...options, showAlert: false }); // Don't show alert, let caller decide
    throw error;
  }
}

