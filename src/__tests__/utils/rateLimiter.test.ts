/**
 * Rate Limiter Tests
 */

import { rateLimiter, RateLimitConfig } from '../../utils/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    rateLimiter.resetAll();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    rateLimiter.resetAll();
  });

  describe('isAllowed', () => {
    it('should allow action when no previous attempts', () => {
      const result = rateLimiter.isAllowed('login', 'user@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should allow action within rate limit', () => {
      // Make 3 attempts (limit is 5 for login)
      for (let i = 0; i < 3; i++) {
        rateLimiter.record('login', 'user@example.com');
      }

      const result = rateLimiter.isAllowed('login', 'user@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should deny action when rate limit exceeded', () => {
      // Exceed rate limit (5 attempts for login)
      for (let i = 0; i < 5; i++) {
        rateLimiter.record('login', 'user@example.com');
      }

      const result = rateLimiter.isAllowed('login', 'user@example.com');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use custom config when provided', () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 60000, // 1 minute
      };

      const result = rateLimiter.isAllowed('test-action', 'user@example.com', customConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // No entry exists yet, so full maxRequests
    });

    it('should reset after window expires', async () => {
      // Use a very short window for testing
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100, // 100ms
      };

      // Set config before recording to ensure consistent window
      rateLimiter.setConfig('test-action', customConfig);
      
      // Exceed limit
      rateLimiter.record('test-action', 'user@example.com');
      rateLimiter.record('test-action', 'user@example.com');

      let result = rateLimiter.isAllowed('test-action', 'user@example.com', customConfig);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      jest.advanceTimersByTime(150);
      await Promise.resolve(); // Flush promises

      result = rateLimiter.isAllowed('test-action', 'user@example.com', customConfig);
      expect(result.allowed).toBe(true);
    });

    it('should track different identifiers separately', () => {
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');

      const result1 = rateLimiter.isAllowed('login', 'user1@example.com');
      const result2 = rateLimiter.isAllowed('login', 'user2@example.com');

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });

    it('should track different actions separately', () => {
      // Exceed login limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.record('login', 'user@example.com');
      }

      const loginResult = rateLimiter.isAllowed('login', 'user@example.com');
      const registerResult = rateLimiter.isAllowed('register', 'user@example.com');

      expect(loginResult.allowed).toBe(false);
      expect(registerResult.allowed).toBe(true);
    });

    it('should work without identifier', () => {
      const result = rateLimiter.isAllowed('api_call');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });
  });

  describe('record', () => {
    it('should record an action', () => {
      rateLimiter.record('login', 'user@example.com');

      const result = rateLimiter.isAllowed('login', 'user@example.com');
      expect(result.remaining).toBeLessThan(5); // Should be less than max (5)
    });

    it('should increment count for existing entry', () => {
      rateLimiter.record('login', 'user@example.com');
      rateLimiter.record('login', 'user@example.com');

      const result = rateLimiter.isAllowed('login', 'user@example.com');
      expect(result.remaining).toBeLessThan(4); // Should be less than max - 2
    });

    it('should create new entry when window expired', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100,
      };

      rateLimiter.setConfig('test-action', customConfig);
      rateLimiter.record('test-action', 'user@example.com');
      rateLimiter.record('test-action', 'user@example.com');

      // Wait for window to expire
      jest.advanceTimersByTime(150);
      await Promise.resolve(); // Flush promises

      rateLimiter.record('test-action', 'user@example.com');

      const result = rateLimiter.isAllowed('test-action', 'user@example.com', customConfig);
      expect(result.allowed).toBe(true);
    });

    it('should work without identifier', () => {
      rateLimiter.record('api_call');

      const result = rateLimiter.isAllowed('api_call');
      expect(result.remaining).toBeLessThan(100); // Max is 100 for api_call
    });
  });

  describe('getRemaining', () => {
    it('should return max requests when no entry exists', () => {
      const remaining = rateLimiter.getRemaining('login', 'user@example.com');

      expect(remaining).toBe(5); // Default max for login
    });

    it('should return correct remaining after records', () => {
      rateLimiter.record('login', 'user@example.com');
      rateLimiter.record('login', 'user@example.com');

      const remaining = rateLimiter.getRemaining('login', 'user@example.com');

      expect(remaining).toBe(3); // 5 - 2 = 3
    });

    it('should return 0 when limit exceeded', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.record('login', 'user@example.com');
      }

      const remaining = rateLimiter.getRemaining('login', 'user@example.com');

      expect(remaining).toBe(0);
    });

    it('should return max when window expired', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100,
      };

      rateLimiter.setConfig('test-action', customConfig);
      rateLimiter.record('test-action', 'user@example.com');

      // Wait for window to expire
      jest.advanceTimersByTime(150);
      await Promise.resolve(); // Flush promises

      const remaining = rateLimiter.getRemaining('test-action', 'user@example.com');

      expect(remaining).toBe(2);
    });
  });

  describe('getResetTime', () => {
    it('should return null when no entry exists', () => {
      const resetTime = rateLimiter.getResetTime('login', 'user@example.com');

      expect(resetTime).toBeNull();
    });

    it('should return reset time for existing entry', () => {
      rateLimiter.record('login', 'user@example.com');

      const resetTime = rateLimiter.getResetTime('login', 'user@example.com');

      expect(resetTime).toBeGreaterThan(Date.now());
      expect(resetTime).toBeLessThan(Date.now() + 20 * 60 * 1000); // Within 20 minutes
    });

    it('should return null when window expired', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100,
      };

      rateLimiter.setConfig('test-action', customConfig);
      rateLimiter.record('test-action', 'user@example.com');

      // Wait for window to expire
      jest.advanceTimersByTime(150);
      await Promise.resolve(); // Flush promises

      const resetTime = rateLimiter.getResetTime('test-action', 'user@example.com');

      expect(resetTime).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset rate limit for specific action and identifier', () => {
      rateLimiter.record('login', 'user@example.com');
      rateLimiter.record('login', 'user@example.com');

      rateLimiter.reset('login', 'user@example.com');

      const result = rateLimiter.isAllowed('login', 'user@example.com');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5); // Reset removes entry, so full maxRequests
    });

    it('should not reset other identifiers', () => {
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('login', 'user1@example.com');

      rateLimiter.reset('login', 'user1@example.com');

      const result1 = rateLimiter.isAllowed('login', 'user1@example.com');
      const result2 = rateLimiter.isAllowed('login', 'user2@example.com');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should reset action without identifier', () => {
      rateLimiter.record('api_call');
      rateLimiter.record('api_call');

      rateLimiter.reset('api_call');

      const result = rateLimiter.isAllowed('api_call');
      expect(result.allowed).toBe(true);
    });
  });

  describe('resetAll', () => {
    it('should reset all rate limits', () => {
      rateLimiter.record('login', 'user1@example.com');
      rateLimiter.record('register', 'user2@example.com');
      rateLimiter.record('api_call');

      rateLimiter.resetAll();

      expect(rateLimiter.isAllowed('login', 'user1@example.com').allowed).toBe(true);
      expect(rateLimiter.isAllowed('register', 'user2@example.com').allowed).toBe(true);
      expect(rateLimiter.isAllowed('api_call').allowed).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should set custom config for action', () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
      };

      rateLimiter.setConfig('custom-action', customConfig);

      const result = rateLimiter.isAllowed('custom-action', 'user@example.com');
      expect(result.remaining).toBe(10); // No entry exists yet, so full maxRequests
    });

    it('should override existing config', () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 20,
        windowMs: 120000,
      };

      rateLimiter.setConfig('login', customConfig);

      const result = rateLimiter.isAllowed('login', 'user@example.com');
      expect(result.remaining).toBe(20); // No entry exists yet, so full maxRequests
      
      // Reset to original predefined config to avoid affecting other tests
      rateLimiter.setConfig('login', { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    });
  });

  describe('getConfig', () => {
    beforeEach(() => {
      // Reset login config to original predefined value
      rateLimiter.setConfig('login', { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    });

    it('should return default config for unknown action', () => {
      const config = rateLimiter.getConfig('unknown-action');

      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(15 * 60 * 1000);
    });

    it('should return predefined config for known action', () => {
      const config = rateLimiter.getConfig('login');

      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(15 * 60 * 1000);
    });

    it('should return custom config after setting', () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 15,
        windowMs: 30000,
      };

      rateLimiter.setConfig('custom-action', customConfig);
      const config = rateLimiter.getConfig('custom-action');

      expect(config.maxRequests).toBe(15);
      expect(config.windowMs).toBe(30000);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100,
      };

      rateLimiter.setConfig('test-action', customConfig);
      rateLimiter.record('test-action', 'user@example.com');

      // Wait for expiration
      jest.advanceTimersByTime(150);
      await Promise.resolve(); // Flush promises

      rateLimiter.cleanup();

      const activeLimits = rateLimiter.getActiveLimits();
      expect(activeLimits.size).toBe(0);
    });

    it('should keep active entries', () => {
      rateLimiter.record('login', 'user@example.com');

      rateLimiter.cleanup();

      const activeLimits = rateLimiter.getActiveLimits();
      expect(activeLimits.size).toBeGreaterThan(0);
    });
  });

  describe('getActiveLimits', () => {
    it('should return active rate limits', () => {
      rateLimiter.record('login', 'user@example.com');
      rateLimiter.record('register', 'user@example.com');

      const activeLimits = rateLimiter.getActiveLimits();

      expect(activeLimits.size).toBeGreaterThan(0);
    });

    it('should automatically cleanup expired entries', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100,
      };

      rateLimiter.setConfig('test-action', customConfig);
      rateLimiter.record('test-action', 'user@example.com');

      // Wait for expiration
      jest.advanceTimersByTime(150);
      await Promise.resolve(); // Flush promises

      const activeLimits = rateLimiter.getActiveLimits();
      expect(activeLimits.size).toBe(0);
    });

    it('should return empty map when no active limits', () => {
      const activeLimits = rateLimiter.getActiveLimits();

      expect(activeLimits.size).toBe(0);
    });
  });
});

