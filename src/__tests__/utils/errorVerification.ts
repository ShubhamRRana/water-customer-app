/**
 * Error Verification Utility
 * 
 * Utility functions to help verify error handling in tests
 */

import { errorLogger, ErrorSeverity, ErrorLog } from '../../utils/errorLogger';

export interface ErrorVerificationOptions {
  operation?: string;
  expectedSeverity?: ErrorSeverity;
  expectedCode?: string;
  expectedMessage?: string;
  contextContains?: Record<string, unknown>;
}

/**
 * Verify that an error was logged with expected properties
 */
export function verifyErrorLogged(
  options: ErrorVerificationOptions = {}
): { success: boolean; log?: ErrorLog; message?: string } {
  const logs = errorLogger.getRecentLogs(1);
  
  if (logs.length === 0) {
    return {
      success: false,
      message: 'No error was logged',
    };
  }

  const log = logs[0];
  const issues: string[] = [];

  // Check operation
  if (options.operation && log.context?.operation !== options.operation) {
    issues.push(`Expected operation "${options.operation}", got "${log.context?.operation}"`);
  }

  // Check severity
  if (options.expectedSeverity && log.severity !== options.expectedSeverity) {
    issues.push(`Expected severity "${options.expectedSeverity}", got "${log.severity}"`);
  }

  // Check error code
  if (options.expectedCode && log.context?.errorCode !== options.expectedCode) {
    issues.push(`Expected error code "${options.expectedCode}", got "${log.context?.errorCode}"`);
  }

  // Check error message
  if (options.expectedMessage) {
    const errorMessage = log.error instanceof Error 
      ? log.error.message 
      : String(log.error);
    if (!errorMessage.includes(options.expectedMessage)) {
      issues.push(`Expected message to contain "${options.expectedMessage}", got "${errorMessage}"`);
    }
  }

  // Check context contains
  if (options.contextContains) {
    for (const [key, value] of Object.entries(options.contextContains)) {
      if (log.context?.[key] !== value) {
        issues.push(`Expected context.${key} to be "${value}", got "${log.context?.[key]}"`);
      }
    }
  }

  if (issues.length > 0) {
    return {
      success: false,
      log,
      message: issues.join('; '),
    };
  }

  return {
    success: true,
    log,
  };
}

/**
 * Clear error logs (useful for test setup)
 */
export function clearErrorLogs(): void {
  errorLogger.clearLogs();
}

/**
 * Get the most recent error log
 */
export function getMostRecentError(): ErrorLog | null {
  const logs = errorLogger.getRecentLogs(1);
  return logs.length > 0 ? logs[0] : null;
}

/**
 * Get all error logs
 */
export function getAllErrorLogs(): ErrorLog[] {
  return errorLogger.getAllLogs();
}

/**
 * Count errors by severity
 */
export function countErrorsBySeverity(): Record<ErrorSeverity, number> {
  const logs = errorLogger.getAllLogs();
  const counts: Record<ErrorSeverity, number> = {
    [ErrorSeverity.LOW]: 0,
    [ErrorSeverity.MEDIUM]: 0,
    [ErrorSeverity.HIGH]: 0,
    [ErrorSeverity.CRITICAL]: 0,
  };

  logs.forEach(log => {
    counts[log.severity]++;
  });

  return counts;
}

/**
 * Find errors by operation name
 */
export function findErrorsByOperation(operation: string): ErrorLog[] {
  const logs = errorLogger.getAllLogs();
  return logs.filter(log => log.context?.operation === operation);
}

/**
 * Find errors by error code
 */
export function findErrorsByCode(errorCode: string): ErrorLog[] {
  const logs = errorLogger.getAllLogs();
  return logs.filter(log => log.context?.errorCode === errorCode);
}

/**
 * Verify that no errors were logged
 */
export function verifyNoErrorsLogged(): boolean {
  return errorLogger.getAllLogs().length === 0;
}

/**
 * Verify that at least one error was logged
 */
export function verifyErrorsLogged(count?: number): boolean {
  const total = errorLogger.getAllLogs().length;
  if (count !== undefined) {
    return total === count;
  }
  return total > 0;
}

// Example usage in tests:
/*
describe('MyComponent', () => {
  beforeEach(() => {
    clearErrorLogs();
  });

  it('should log error with correct properties', async () => {
    // Perform operation that should log error
    await someOperationThatFails();

    const verification = verifyErrorLogged({
      operation: 'someOperation',
      expectedSeverity: ErrorSeverity.HIGH,
      expectedCode: 'NETWORK_ERROR',
    });

    expect(verification.success).toBe(true);
    if (!verification.success) {
      console.error('Error verification failed:', verification.message);
    }
  });
});
*/

