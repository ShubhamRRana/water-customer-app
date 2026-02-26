/**
 * Standardized Error Handling
 * 
 * Custom error classes and error handling utilities for consistent
 * error management across the application.
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization-related errors (permission denied)
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation errors (invalid input)
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, { ...details, field });
    this.name = 'ValidationError';
  }
}

/**
 * Not found errors (resource doesn't exist)
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    details?: Record<string, unknown>
  ) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND_ERROR', 404, { ...details, resource, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * Database/data access errors
 */
export class DataAccessError extends AppError {
  constructor(
    message: string,
    public operation?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'DATA_ACCESS_ERROR', 500, { ...details, operation });
    this.name = 'DataAccessError';
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    public originalError?: Error,
    details?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', 503, {
      ...details,
      originalError: originalError?.message,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(
    message: string,
    public retryAfter?: Date,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, {
      ...details,
      retryAfter: retryAfter?.toISOString(),
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is a specific AppError subclass
 */
export function isErrorType<T extends AppError>(
  error: unknown,
  errorClass: new (...args: never[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Extract error message from unknown error type
 * @param error - The error to extract message from
 * @param defaultMessage - Optional default message if error is not an Error instance or string
 * @returns The error message or default message
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An unknown error occurred'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}

/**
 * Extract error code from unknown error type
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    return 'UNKNOWN_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Convert any error to AppError format
 */
export function normalizeError(error: unknown, defaultMessage = 'An error occurred'): AppError {
  if (isAppError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(error.message || defaultMessage, 'UNKNOWN_ERROR', 500, {
      originalError: error.name,
      stack: error.stack,
    });
  }
  return new AppError(defaultMessage, 'UNKNOWN_ERROR', 500);
}

/**
 * Error handler utility for async operations
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => AppError
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (errorHandler) {
      throw errorHandler(error);
    }
    throw normalizeError(error);
  }
}

/**
 * Error handler utility for sync operations
 */
export function handleSyncError<T>(
  operation: () => T,
  errorHandler?: (error: unknown) => AppError
): T {
  try {
    return operation();
  } catch (error) {
    if (errorHandler) {
      throw errorHandler(error);
    }
    throw normalizeError(error);
  }
}

