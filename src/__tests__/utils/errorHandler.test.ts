/**
 * Error Handler Tests
 * 
 * Tests for the centralized error handler to ensure:
 * 1. Errors are properly logged
 * 2. User-friendly messages are shown
 * 3. Appropriate severity levels are assigned
 * 4. Context is properly captured
 */

import { Alert } from 'react-native';
import { handleError, handleAsyncOperation, handleAsyncOperationWithRethrow } from '../../utils/errorHandler';
import { errorLogger, ErrorSeverity } from '../../utils/errorLogger';
import {
  NetworkError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  AppError,
} from '../../utils/errors';
import { ERROR_MESSAGES } from '../../constants/config';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should log error with default severity (MEDIUM)', () => {
      const error = new Error('Test error');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].severity).toBe(ErrorSeverity.MEDIUM);
      expect(logs[0].context?.operation).toBe('testOperation');
    });

    it('should show alert by default for user-facing operations', () => {
      const error = new Error('Test error');
      
      handleError(error, {
        context: { operation: 'testOperation' },
        userFacing: true,
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
    });

    it('should not show alert when userFacing is false', () => {
      const error = new Error('Test error');
      
      handleError(error, {
        context: { operation: 'testOperation' },
        userFacing: false,
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should not show alert when showAlert is false', () => {
      const error = new Error('Test error');
      
      handleError(error, {
        context: { operation: 'testOperation' },
        showAlert: false,
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should use custom alert title and message', () => {
      const error = new Error('Test error');
      
      handleError(error, {
        context: { operation: 'testOperation' },
        alertTitle: 'Custom Title',
        alertMessage: 'Custom message',
      });

      expect(Alert.alert).toHaveBeenCalledWith('Custom Title', 'Custom message');
    });

    it('should assign HIGH severity to NetworkError', () => {
      const error = new NetworkError('Connection failed');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assign HIGH severity to AuthenticationError', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assign MEDIUM severity to ValidationError', () => {
      const error = new ValidationError('Invalid input', 'email');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should show user-friendly message for NetworkError', () => {
      const error = new NetworkError('Connection failed');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', ERROR_MESSAGES.network);
    });

    it('should show user-friendly message for AuthenticationError', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', ERROR_MESSAGES.auth.invalidCredentials);
    });

    it('should show error message for ValidationError', () => {
      const error = new ValidationError('Email is required', 'email');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Email is required');
    });

    it('should include error code in context', () => {
      const error = new NetworkError('Connection failed');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].context?.errorCode).toBe('NETWORK_ERROR');
    });

    it('should include original error message in context', () => {
      const error = new Error('Original error message');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].context?.originalError).toBe('Original error message');
    });

    it('should merge provided context with error context', () => {
      const error = new Error('Test error');
      
      handleError(error, {
        context: { 
          operation: 'testOperation',
          userId: 'user-123',
        },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].context?.operation).toBe('testOperation');
      expect(logs[0].context?.userId).toBe('user-123');
    });

    it('should handle string errors', () => {
      const error = 'String error';
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should handle unknown error types', () => {
      const error = { someProperty: 'value' };
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].context?.errorCode).toBe('UNKNOWN_ERROR');
    });

    it('should use custom severity when provided', () => {
      const error = new Error('Test error');
      
      handleError(error, {
        context: { operation: 'testOperation' },
        severity: ErrorSeverity.CRITICAL,
      });

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should show booking error messages for booking-related errors', () => {
      const error = new AppError('Failed to create booking', 'BOOKING_CREATE_ERROR');
      
      handleError(error, {
        context: { operation: 'createBooking' },
      });

      expect(Alert.alert).toHaveBeenCalledWith('Error', ERROR_MESSAGES.booking.createFailed);
    });

    it('should show generic message for unknown errors', () => {
      const error = new Error('Some unknown error');
      
      handleError(error, {
        context: { operation: 'testOperation' },
      });

      // Should show the error message if available, or generic message
      expect(Alert.alert).toHaveBeenCalled();
      const callArgs = (Alert.alert as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toBeTruthy(); // Message should exist
    });
  });

  describe('handleAsyncOperation', () => {
    it('should return result when operation succeeds', async () => {
      const operation = async () => 'success';
      
      const result = await handleAsyncOperation(operation, {
        context: { operation: 'testOperation' },
      });

      expect(result).toBe('success');
      expect(errorLogger.getRecentLogs().length).toBe(0);
    });

    it('should return null and handle error when operation fails', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };
      
      const result = await handleAsyncOperation(operation, {
        context: { operation: 'testOperation' },
      });

      expect(result).toBeNull();
      const logs = errorLogger.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should not show alert when userFacing is false', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };
      
      await handleAsyncOperation(operation, {
        context: { operation: 'testOperation' },
        userFacing: false,
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('handleAsyncOperationWithRethrow', () => {
    it('should return result when operation succeeds', async () => {
      const operation = async () => 'success';
      
      const result = await handleAsyncOperationWithRethrow(operation, {
        context: { operation: 'testOperation' },
      });

      expect(result).toBe('success');
      expect(errorLogger.getRecentLogs().length).toBe(0);
    });

    it('should log error and rethrow when operation fails', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };
      
      await expect(
        handleAsyncOperationWithRethrow(operation, {
          context: { operation: 'testOperation' },
        })
      ).rejects.toThrow('Operation failed');

      const logs = errorLogger.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(Alert.alert).not.toHaveBeenCalled(); // Should not show alert
    });

    it('should include context in error log', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };
      
      try {
        await handleAsyncOperationWithRethrow(operation, {
          context: { operation: 'testOperation', userId: 'user-123' },
        });
      } catch {
        // Expected to throw
      }

      const logs = errorLogger.getRecentLogs(1);
      expect(logs[0].context?.operation).toBe('testOperation');
      expect(logs[0].context?.userId).toBe('user-123');
    });
  });
});

