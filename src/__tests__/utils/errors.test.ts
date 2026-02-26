/**
 * Error Handling Utilities Tests
 */

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  DataAccessError,
  NetworkError,
  RateLimitError,
  isAppError,
  isErrorType,
  getErrorMessage,
  getErrorCode,
  normalizeError,
  handleAsyncError,
  handleSyncError,
} from '../../utils/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400, { field: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('AppError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with correct defaults', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('AuthorizationError', () => {
    it('should create an AuthorizationError with correct defaults', () => {
      const error = new AuthorizationError('Access denied');
      
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with field information', () => {
      const error = new ValidationError('Invalid email', 'email');
      
      expect(error.message).toBe('Invalid email');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with resource and identifier', () => {
      const error = new NotFoundError('User', 'user123');
      
      expect(error.message).toBe("User with id 'user123' not found");
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create a NotFoundError without identifier', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
    });
  });

  describe('DataAccessError', () => {
    it('should create a DataAccessError with operation', () => {
      const error = new DataAccessError('Database error', 'getUser');
      
      expect(error.message).toBe('Database error');
      expect(error.code).toBe('DATA_ACCESS_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.operation).toBe('getUser');
      expect(error.name).toBe('DataAccessError');
    });
  });

  describe('NetworkError', () => {
    it('should create a NetworkError with original error', () => {
      const originalError = new Error('Connection failed');
      const error = new NetworkError('Network request failed', originalError);
      
      expect(error.message).toBe('Network request failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('RateLimitError', () => {
    it('should create a RateLimitError with retry after date', () => {
      const retryAfter = new Date('2024-01-01T12:00:00Z');
      const error = new RateLimitError('Too many requests', retryAfter);
      
      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(retryAfter);
      expect(error.name).toBe('RateLimitError');
    });
  });
});

describe('Error Utilities', () => {
  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError('Test', 'TEST');
      expect(isAppError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Test');
      expect(isAppError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });

  describe('isErrorType', () => {
    it('should return true for matching error type', () => {
      const error = new AuthenticationError('Test');
      expect(isErrorType(error, AuthenticationError)).toBe(true);
    });

    it('should return false for different error type', () => {
      const error = new AuthenticationError('Test');
      expect(isErrorType(error, AuthorizationError)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error', () => {
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('should extract message from AppError', () => {
      expect(getErrorMessage(new AppError('App error', 'CODE'))).toBe('App error');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should return default for unknown types', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('getErrorCode', () => {
    it('should extract code from AppError', () => {
      expect(getErrorCode(new AppError('Test', 'TEST_CODE'))).toBe('TEST_CODE');
    });

    it('should return UNKNOWN_ERROR for non-AppError', () => {
      expect(getErrorCode(new Error('Test'))).toBe('UNKNOWN_ERROR');
      expect(getErrorCode('string')).toBe('UNKNOWN_ERROR');
    });
  });

  describe('normalizeError', () => {
    it('should return AppError as-is', () => {
      const error = new AppError('Test', 'TEST');
      expect(normalizeError(error)).toBe(error);
    });

    it('should convert Error to AppError', () => {
      const error = new Error('Test error');
      const normalized = normalizeError(error);
      
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.message).toBe('Test error');
      expect(normalized.code).toBe('UNKNOWN_ERROR');
    });

    it('should create AppError for unknown types', () => {
      const normalized = normalizeError('String error');
      
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.message).toBe('An error occurred');
    });
  });

  describe('handleAsyncError', () => {
    it('should return result on success', async () => {
      const result = await handleAsyncError(async () => 'success');
      expect(result).toBe('success');
    });

    it('should normalize error on failure', async () => {
      await expect(
        handleAsyncError(async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow(AppError);
    });

    it('should use custom error handler', async () => {
      const customHandler = (error: unknown) => {
        return new ValidationError('Custom error');
      };

      await expect(
        handleAsyncError(
          async () => {
            throw new Error('Original error');
          },
          customHandler
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('handleSyncError', () => {
    it('should return result on success', () => {
      const result = handleSyncError(() => 'success');
      expect(result).toBe('success');
    });

    it('should normalize error on failure', () => {
      expect(() => {
        handleSyncError(() => {
          throw new Error('Test error');
        });
      }).toThrow(AppError);
    });

    it('should use custom error handler', () => {
      const customHandler = (error: unknown) => {
        return new ValidationError('Custom error');
      };

      expect(() => {
        handleSyncError(
          () => {
            throw new Error('Original error');
          },
          customHandler
        );
      }).toThrow(ValidationError);
    });
  });
});

