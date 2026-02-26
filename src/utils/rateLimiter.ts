/**
 * Rate Limiter Utility
 * 
 * Client-side rate limiting to prevent abuse and complement server-side rate limiting.
 * Tracks request counts and enforces limits per action/identifier.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitEntry {
  count: number;
  resetTime: number; // Timestamp when the limit resets
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private defaultConfig: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  };

  // Predefined rate limit configurations for different actions
  private configs: Map<string, RateLimitConfig> = new Map([
    // Authentication limits
    ['login', { maxRequests: 5, windowMs: 15 * 60 * 1000 }], // 5 attempts per 15 minutes
    ['register', { maxRequests: 3, windowMs: 60 * 60 * 1000 }], // 3 attempts per hour
    ['password_reset', { maxRequests: 3, windowMs: 60 * 60 * 1000 }], // 3 attempts per hour
    
    // API call limits
    ['api_call', { maxRequests: 100, windowMs: 60 * 1000 }], // 100 requests per minute
    ['booking_create', { maxRequests: 10, windowMs: 60 * 60 * 1000 }], // 10 bookings per hour
    
    // Profile update limits
    ['profile_update', { maxRequests: 20, windowMs: 60 * 60 * 1000 }], // 20 updates per hour
    
    // Data export limits
    ['data_export', { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 }], // 5 exports per day
  ]);

  /**
   * Check if an action is allowed (within rate limit)
   * Note: This method does NOT increment the count - use record() to increment
   */
  isAllowed(
    action: string,
    identifier?: string,
    customConfig?: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(action, identifier);
    const config = customConfig || this.configs.get(action) || this.defaultConfig;
    
    const now = Date.now();
    const entry = this.limits.get(key);

    // If no entry exists or window has expired, action is allowed
    if (!entry || now >= entry.resetTime) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Within limit - return remaining attempts (without incrementing)
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Record an action (increment counter)
   */
  record(action: string, identifier?: string): void {
    const key = this.getKey(action, identifier);
    const config = this.configs.get(action) || this.defaultConfig;
    
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetTime) {
      // Create new entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
    } else {
      // Increment existing entry
      entry.count++;
      this.limits.set(key, entry);
    }
  }

  /**
   * Get remaining attempts for an action
   */
  getRemaining(action: string, identifier?: string): number {
    const key = this.getKey(action, identifier);
    const config = this.configs.get(action) || this.defaultConfig;
    const entry = this.limits.get(key);

    if (!entry) {
      return config.maxRequests;
    }

    const now = Date.now();
    if (now >= entry.resetTime) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  /**
   * Get reset time for an action
   */
  getResetTime(action: string, identifier?: string): number | null {
    const key = this.getKey(action, identifier);
    const entry = this.limits.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now >= entry.resetTime) {
      return null;
    }

    return entry.resetTime;
  }

  /**
   * Reset rate limit for an action
   */
  reset(action: string, identifier?: string): void {
    const key = this.getKey(action, identifier);
    this.limits.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.limits.clear();
  }

  /**
   * Set custom rate limit configuration for an action
   */
  setConfig(action: string, config: RateLimitConfig): void {
    this.configs.set(action, config);
  }

  /**
   * Get rate limit configuration for an action
   */
  getConfig(action: string): RateLimitConfig {
    return this.configs.get(action) || this.defaultConfig;
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.limits.forEach((entry, key) => {
      if (now >= entry.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.limits.delete(key));
  }

  /**
   * Get all active rate limits (for debugging/admin)
   */
  getActiveLimits(): Map<string, RateLimitEntry> {
    this.cleanup(); // Remove expired entries
    return new Map(this.limits);
  }

  /**
   * Generate key for rate limit tracking
   */
  private getKey(action: string, identifier?: string): string {
    return identifier ? `${action}:${identifier}` : action;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup expired entries every 5 minutes
// Skip in test environments to prevent Jest from hanging
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
if (typeof setInterval !== 'undefined' && !isTestEnvironment) {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
}

