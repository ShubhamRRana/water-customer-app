/**
 * Error Logger Tests
 */

import { errorLogger, ErrorSeverity } from '../../utils/errorLogger';

describe('ErrorLogger', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
  });

  describe('log', () => {
    it('should log an error with default severity', () => {
      const error = new Error('Test error');
      errorLogger.log('Test message', error);

      const logs = errorLogger.getAllLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].error).toBe(error);
      expect(logs[0].severity).toBe(ErrorSeverity.MEDIUM);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should log an error with custom severity', () => {
      const error = new Error('Critical error');
      errorLogger.log('Critical message', error, ErrorSeverity.CRITICAL);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should log an error with context', () => {
      const error = new Error('Test error');
      const context = { userId: 'user-1', action: 'login' };

      errorLogger.log('Test message', error, ErrorSeverity.MEDIUM, context);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].context).toEqual(context);
    });

    it('should include stack trace for Error objects', () => {
      const error = new Error('Test error');
      errorLogger.log('Test message', error);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].stack).toBeDefined();
      expect(logs[0].stack).toBe(error.stack);
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      errorLogger.log('Test message', error);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].error).toBe(error);
      expect(logs[0].stack).toBeUndefined();
    });

    it('should limit logs to maxLogs (100)', () => {
      for (let i = 0; i < 105; i++) {
        errorLogger.log(`Message ${i}`, new Error(`Error ${i}`));
      }

      const logs = errorLogger.getAllLogs();
      expect(logs.length).toBe(100);
      // Should keep the most recent logs
      expect(logs[0].message).toBe('Message 5');
      expect(logs[logs.length - 1].message).toBe('Message 104');
    });
  });

  describe('critical', () => {
    it('should log with CRITICAL severity', () => {
      const error = new Error('Critical error');
      errorLogger.critical('Critical message', error);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].severity).toBe(ErrorSeverity.CRITICAL);
      expect(logs[0].message).toBe('Critical message');
    });

    it('should accept context parameter', () => {
      const error = new Error('Critical error');
      const context = { component: 'AuthService' };

      errorLogger.critical('Critical message', error, context);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].context).toEqual(context);
    });
  });

  describe('high', () => {
    it('should log with HIGH severity', () => {
      const error = new Error('High severity error');
      errorLogger.high('High message', error);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].severity).toBe(ErrorSeverity.HIGH);
      expect(logs[0].message).toBe('High message');
    });

    it('should accept context parameter', () => {
      const error = new Error('High severity error');
      const context = { userId: 'user-1' };

      errorLogger.high('High message', error, context);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].context).toEqual(context);
    });
  });

  describe('medium', () => {
    it('should log with MEDIUM severity', () => {
      const error = new Error('Medium severity error');
      errorLogger.medium('Medium message', error);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].severity).toBe(ErrorSeverity.MEDIUM);
      expect(logs[0].message).toBe('Medium message');
    });

    it('should accept context parameter', () => {
      const error = new Error('Medium severity error');
      const context = { action: 'update' };

      errorLogger.medium('Medium message', error, context);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].context).toEqual(context);
    });
  });

  describe('low', () => {
    it('should log with LOW severity', () => {
      const error = new Error('Low severity error');
      errorLogger.low('Low message', error);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].severity).toBe(ErrorSeverity.LOW);
      expect(logs[0].message).toBe('Low message');
    });

    it('should accept context parameter', () => {
      const error = new Error('Low severity error');
      const context = { info: 'test' };

      errorLogger.low('Low message', error, context);

      const logs = errorLogger.getAllLogs();
      expect(logs[0].context).toEqual(context);
    });
  });

  describe('getRecentLogs', () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        errorLogger.log(`Message ${i}`, new Error(`Error ${i}`));
      }
    });

    it('should return recent logs with default count (10)', () => {
      const logs = errorLogger.getRecentLogs();

      expect(logs.length).toBe(10);
      expect(logs[0].message).toBe('Message 10');
      expect(logs[9].message).toBe('Message 19');
    });

    it('should return specified number of recent logs', () => {
      const logs = errorLogger.getRecentLogs(5);

      expect(logs.length).toBe(5);
      expect(logs[0].message).toBe('Message 15');
      expect(logs[4].message).toBe('Message 19');
    });

    it('should return all logs when count exceeds total', () => {
      const logs = errorLogger.getRecentLogs(100);

      expect(logs.length).toBe(20);
    });

    it('should return empty array when no logs exist', () => {
      errorLogger.clearLogs();

      const logs = errorLogger.getRecentLogs();

      expect(logs).toEqual([]);
    });
  });

  describe('getAllLogs', () => {
    it('should return all logs', () => {
      errorLogger.log('Message 1', new Error('Error 1'));
      errorLogger.log('Message 2', new Error('Error 2'));
      errorLogger.log('Message 3', new Error('Error 3'));

      const logs = errorLogger.getAllLogs();

      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('Message 1');
      expect(logs[1].message).toBe('Message 2');
      expect(logs[2].message).toBe('Message 3');
    });

    it('should return a copy of logs array', () => {
      errorLogger.log('Message 1', new Error('Error 1'));

      const logs1 = errorLogger.getAllLogs();
      const logs2 = errorLogger.getAllLogs();

      expect(logs1).not.toBe(logs2); // Different array instances
      expect(logs1).toEqual(logs2); // Same content
    });

    it('should return empty array when no logs exist', () => {
      const logs = errorLogger.getAllLogs();

      expect(logs).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      errorLogger.log('Message 1', new Error('Error 1'));
      errorLogger.log('Message 2', new Error('Error 2'));

      errorLogger.clearLogs();

      const logs = errorLogger.getAllLogs();
      expect(logs).toEqual([]);
    });

    it('should not throw when clearing empty logs', () => {
      expect(() => errorLogger.clearLogs()).not.toThrow();
    });
  });
});

