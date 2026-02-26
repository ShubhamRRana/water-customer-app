/**
 * Error Logger Utility
 * 
 * Centralized error logging system for the application.
 * Provides structured error logging with different severity levels
 * and optional error reporting to external services.
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorLog {
  message: string;
  error: Error | unknown;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: Date;
  stack?: string;
  componentStack?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100; // Keep last 100 logs in memory

  /**
   * Log an error with severity and context
   */
  log(
    message: string,
    error: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>
  ): void {
    const errorLog: ErrorLog = {
      message,
      error,
      severity,
      context,
      timestamp: new Date(),
      stack: error instanceof Error ? error.stack : undefined,
    };

    // Add to in-memory logs
    this.logs.push(errorLog);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console logging removed - errors are still tracked in memory

    // In production, you could send to error tracking service
    // Example: Sentry, Bugsnag, etc.
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      this.reportToService(errorLog);
    }
  }

  /**
   * Log a critical error
   */
  critical(message: string, error: Error | unknown, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.CRITICAL, context);
  }

  /**
   * Log a high severity error
   */
  high(message: string, error: Error | unknown, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.HIGH, context);
  }

  /**
   * Log a medium severity error
   */
  medium(message: string, error: Error | unknown, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.MEDIUM, context);
  }

  /**
   * Log a low severity error
   */
  low(message: string, error: Error | unknown, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.LOW, context);
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(count: number = 10): ErrorLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get all error logs
   */
  getAllLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get console method based on severity
   * Method kept for compatibility but console logging is disabled
   */
  private getConsoleMethod(severity: ErrorSeverity): typeof console.error {
    // Console logging disabled - return no-op function
    return () => {};
  }

  /**
   * Report error to external service (placeholder for future implementation)
   */
  private reportToService(errorLog: ErrorLog): void {
    // TODO: Integrate with error tracking service (Sentry, Bugsnag, etc.)
    // Console logging removed
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

