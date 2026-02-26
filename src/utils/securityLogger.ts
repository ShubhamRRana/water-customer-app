/**
 * Security Logger Utility
 * 
 * Specialized logging system for security-related events.
 * Tracks authentication attempts, suspicious activities, and security violations.
 * Complements the general error logger with security-specific event tracking.
 */

import { errorLogger, ErrorSeverity } from './errorLogger';

export enum SecurityEventType {
  // Authentication events
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  REGISTRATION_ATTEMPT = 'registration_attempt',
  REGISTRATION_SUCCESS = 'registration_success',
  REGISTRATION_FAILURE = 'registration_failure',
  
  // Session events
  SESSION_EXPIRED = 'session_expired',
  SESSION_REFRESHED = 'session_refreshed',
  SESSION_HIJACK_ATTEMPT = 'session_hijack_attempt',
  MULTIPLE_SESSION_DETECTED = 'multiple_session_detected',
  
  // Authorization events
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_ESCALATION_ATTEMPT = 'role_escalation_attempt',
  
  // Data access events
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  BULK_DATA_EXPORT = 'bulk_data_export',
  
  // Suspicious activities
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  INVALID_INPUT_DETECTED = 'invalid_input_detected',
  
  // Account security
  PASSWORD_CHANGE_ATTEMPT = 'password_change_attempt',
  PASSWORD_CHANGE_SUCCESS = 'password_change_success',
  PASSWORD_CHANGE_FAILURE = 'password_change_failure',
  PROFILE_UPDATE = 'profile_update',
  
  // System security
  CONFIGURATION_CHANGE = 'configuration_change',
  SECURITY_POLICY_VIOLATION = 'security_policy_violation',
}

export enum SecuritySeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 500; // Keep last 500 security events
  private suspiciousPatterns: Map<string, number> = new Map(); // Track patterns for detection

  /**
   * Log a security event
   */
  log(
    type: SecurityEventType,
    severity: SecuritySeverity,
    details?: Record<string, any>,
    userId?: string,
    userRole?: string
  ): void {
    const event: SecurityEvent = {
      type,
      severity,
      timestamp: new Date(),
      userId,
      userRole,
      details,
      // In a real app, you'd capture IP and user agent from request headers
      // For React Native, these would come from device info
      metadata: {
        platform: 'react-native',
        // Add device info if available
      },
    };

    // Add to in-memory logs
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift(); // Remove oldest event
    }

    // Log to console with appropriate level
    this.logToConsole(event);

    // Check for suspicious patterns
    this.detectSuspiciousPatterns(event);

    // Report critical events to error logger
    if (severity === SecuritySeverity.CRITICAL) {
      errorLogger.critical(
        `Security Event: ${type}`,
        new Error(`Security event: ${type}`),
        {
          eventType: type,
          severity,
          userId,
          userRole,
          details,
        }
      );
    } else if (severity === SecuritySeverity.WARNING) {
      errorLogger.high(
        `Security Event: ${type}`,
        new Error(`Security event: ${type}`),
        {
          eventType: type,
          severity,
          userId,
          userRole,
          details,
        }
      );
    }
  }

  /**
   * Log authentication attempt
   */
  logAuthAttempt(
    email: string,
    success: boolean,
    error?: string,
    userId?: string
  ): void {
    const eventType = success
      ? SecurityEventType.LOGIN_SUCCESS
      : SecurityEventType.LOGIN_FAILURE;

    const severity = success
      ? SecuritySeverity.INFO
      : SecuritySeverity.WARNING;

    this.log(
      eventType,
      severity,
      {
        email: this.maskEmail(email), // Mask email for privacy
        success,
        error,
      },
      userId
    );
  }

  /**
   * Log registration attempt
   */
  logRegistrationAttempt(
    email: string,
    role: string,
    success: boolean,
    error?: string,
    userId?: string
  ): void {
    const eventType = success
      ? SecurityEventType.REGISTRATION_SUCCESS
      : SecurityEventType.REGISTRATION_FAILURE;

    const severity = success
      ? SecuritySeverity.INFO
      : SecuritySeverity.WARNING;

    this.log(
      eventType,
      severity,
      {
        email: this.maskEmail(email),
        role,
        success,
        error,
      },
      userId,
      role
    );
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(
    userId: string,
    userRole: string,
    attemptedAction: string,
    resource?: string
  ): void {
    this.log(
      SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      SecuritySeverity.WARNING,
      {
        attemptedAction,
        resource,
      },
      userId,
      userRole
    );
  }

  /**
   * Log brute force attempt
   */
  logBruteForceAttempt(identifier: string, attempts: number): void {
    this.log(
      SecurityEventType.BRUTE_FORCE_ATTEMPT,
      SecuritySeverity.CRITICAL,
      {
        identifier: this.maskIdentifier(identifier),
        attempts,
      }
    );
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(
    action: string,
    userId?: string,
    userRole?: string
  ): void {
    this.log(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecuritySeverity.WARNING,
      {
        action,
      },
      userId,
      userRole
    );
  }

  /**
   * Log session event
   */
  logSessionEvent(
    type: SecurityEventType.SESSION_EXPIRED | SecurityEventType.SESSION_REFRESHED | SecurityEventType.SESSION_HIJACK_ATTEMPT,
    userId: string,
    details?: Record<string, any>
  ): void {
    const severity = type === SecurityEventType.SESSION_HIJACK_ATTEMPT
      ? SecuritySeverity.CRITICAL
      : SecuritySeverity.INFO;

    this.log(
      type,
      severity,
      details,
      userId
    );
  }

  /**
   * Log suspicious pattern detected
   */
  logSuspiciousPattern(
    pattern: string,
    details?: Record<string, any>,
    userId?: string
  ): void {
    this.log(
      SecurityEventType.SUSPICIOUS_PATTERN,
      SecuritySeverity.WARNING,
      {
        pattern,
        ...details,
      },
      userId
    );
  }

  /**
   * Get recent security events
   */
  getRecentEvents(count: number = 50): SecurityEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecuritySeverity): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  /**
   * Get events for a specific user
   */
  getEventsByUser(userId: string): SecurityEvent[] {
    return this.events.filter(event => event.userId === userId);
  }

  /**
   * Get all security events
   */
  getAllEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
    this.suspiciousPatterns.clear();
  }

  /**
   * Get security statistics
   */
  getStatistics(): {
    totalEvents: number;
    criticalEvents: number;
    warningEvents: number;
    infoEvents: number;
    eventsByType: Record<string, number>;
    recentCriticalEvents: SecurityEvent[];
  } {
    const stats = {
      totalEvents: this.events.length,
      criticalEvents: this.getEventsBySeverity(SecuritySeverity.CRITICAL).length,
      warningEvents: this.getEventsBySeverity(SecuritySeverity.WARNING).length,
      infoEvents: this.getEventsBySeverity(SecuritySeverity.INFO).length,
      eventsByType: {} as Record<string, number>,
      recentCriticalEvents: this.getEventsBySeverity(SecuritySeverity.CRITICAL)
        .slice(-10),
    };

    // Count events by type
    this.events.forEach(event => {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Log to console with appropriate level
   * Console logging removed - events are still tracked in memory
   */
  private logToConsole(event: SecurityEvent): void {
    // Console logging removed - events are still tracked in memory for security monitoring
  }

  /**
   * Detect suspicious patterns in security events
   */
  private detectSuspiciousPatterns(event: SecurityEvent): void {
    // Track failed login attempts
    if (event.type === SecurityEventType.LOGIN_FAILURE) {
      const key = `login_failure_${event.userId || 'unknown'}`;
      const count = (this.suspiciousPatterns.get(key) || 0) + 1;
      this.suspiciousPatterns.set(key, count);

      // Alert if too many failures
      if (count >= 5) {
        this.logBruteForceAttempt(
          event.userId || 'unknown',
          count
        );
      }
    }

    // Track unauthorized access attempts
    if (event.type === SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT) {
      const key = `unauthorized_${event.userId || 'unknown'}`;
      const count = (this.suspiciousPatterns.get(key) || 0) + 1;
      this.suspiciousPatterns.set(key, count);

      if (count >= 3) {
        this.logSuspiciousPattern(
          'Multiple unauthorized access attempts',
          { userId: event.userId, count },
          event.userId
        );
      }
    }

    // Clean up old patterns (keep only last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    // Note: In a real implementation, you'd track timestamps for each pattern
  }

  /**
   * Mask phone number for privacy (show only last 4 digits)
   * @deprecated Use maskEmail for email-based authentication
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 4) {
      return '****';
    }
    return `****${phone.slice(-4)}`;
  }

  /**
   * Mask email address for privacy (show first 2 chars and domain)
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return '****@****';
    }
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `**@${domain}`;
    }
    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  /**
   * Mask identifier for privacy
   */
  private maskIdentifier(identifier: string): string {
    if (!identifier || identifier.length < 4) {
      return '****';
    }
    return `${identifier.slice(0, 2)}****${identifier.slice(-2)}`;
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

