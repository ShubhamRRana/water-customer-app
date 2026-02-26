/**
 * Sanitization Utilities Tests
 */

import { SanitizationUtils } from '../../utils/sanitization';

describe('SanitizationUtils', () => {
  describe('sanitizeString', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeString(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeString(undefined as any)).toBe('');
      expect(SanitizationUtils.sanitizeString(123 as any)).toBe('');
    });

    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('Hello  World');
      expect(result).not.toContain('<script>');
    });

    it('should remove HTML tags', () => {
      const input = 'Hello <div>World</div>';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove data: protocol', () => {
      const input = 'data:text/html,<script>alert("xss")</script>';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).not.toContain('data:');
    });

    it('should remove null bytes', () => {
      const input = 'Hello\0World';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).not.toContain('\0');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('sanitizePhone', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizePhone(null as any)).toBe('');
      expect(SanitizationUtils.sanitizePhone(undefined as any)).toBe('');
    });

    it('should keep only digits', () => {
      const result = SanitizationUtils.sanitizePhone('+91 98765 43210');
      expect(result).toBe('919876543210');
    });

    it('should remove all non-digit characters', () => {
      const result = SanitizationUtils.sanitizePhone('(987) 654-3210');
      expect(result).toBe('9876543210');
    });

    it('should trim whitespace', () => {
      const result = SanitizationUtils.sanitizePhone('  9876543210  ');
      expect(result).toBe('9876543210');
    });
  });

  describe('sanitizeName', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeName(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeName(undefined as any)).toBe('');
    });

    it('should keep letters, spaces, hyphens, apostrophes, and periods', () => {
      const result = SanitizationUtils.sanitizeName("Mary-Jane O'Brien");
      expect(result).toBe("Mary-Jane O'Brien");
    });

    it('should remove numbers', () => {
      const result = SanitizationUtils.sanitizeName('John123');
      expect(result).toBe('John');
    });

    it('should remove special characters', () => {
      const result = SanitizationUtils.sanitizeName('John@Doe#Smith');
      expect(result).toBe('JohnDoeSmith');
    });

    it('should collapse multiple spaces', () => {
      const result = SanitizationUtils.sanitizeName('John    Doe');
      expect(result).toBe('John Doe');
    });

    it('should trim whitespace', () => {
      const result = SanitizationUtils.sanitizeName('  John Doe  ');
      expect(result).toBe('John Doe');
    });
  });

  describe('sanitizeBusinessName', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeBusinessName(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeBusinessName(undefined as any)).toBe('');
    });

    it('should keep alphanumeric and common business characters', () => {
      const result = SanitizationUtils.sanitizeBusinessName('ABC Corp & Co., Ltd.');
      expect(result).toBe('ABC Corp & Co., Ltd.');
    });

    it('should keep numbers', () => {
      const result = SanitizationUtils.sanitizeBusinessName('Company 123');
      expect(result).toBe('Company 123');
    });

    it('should remove special characters not allowed in business names', () => {
      const result = SanitizationUtils.sanitizeBusinessName('Company@#$%');
      expect(result).toBe('Company');
    });

    it('should collapse multiple spaces', () => {
      const result = SanitizationUtils.sanitizeBusinessName('ABC    Corp');
      expect(result).toBe('ABC Corp');
    });
  });

  describe('sanitizeEmail', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeEmail(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeEmail(undefined as any)).toBe('');
    });

    it('should convert to lowercase', () => {
      const result = SanitizationUtils.sanitizeEmail('TEST@EXAMPLE.COM');
      expect(result).toBe('test@example.com');
    });

    it('should remove dangerous characters', () => {
      const result = SanitizationUtils.sanitizeEmail('test<>"\'`@example.com');
      expect(result).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const result = SanitizationUtils.sanitizeEmail('  test@example.com  ');
      expect(result).toBe('test@example.com');
    });

    it('should preserve valid email format', () => {
      const result = SanitizationUtils.sanitizeEmail('test.user@example.co.uk');
      expect(result).toBe('test.user@example.co.uk');
    });
  });

  describe('sanitizeAddress', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeAddress(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeAddress(undefined as any)).toBe('');
    });

    it('should keep alphanumeric and common address characters', () => {
      const result = SanitizationUtils.sanitizeAddress('123 Main St, Apt #4B');
      expect(result).toBe('123 Main St, Apt #4B');
    });

    it('should remove special characters not allowed in addresses', () => {
      const result = SanitizationUtils.sanitizeAddress('123 Main@St');
      expect(result).toBe('123 MainSt');
    });

    it('should collapse multiple spaces', () => {
      const result = SanitizationUtils.sanitizeAddress('123    Main    St');
      expect(result).toBe('123 Main St');
    });
  });

  describe('sanitizeNumber', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeNumber(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeNumber(undefined as any)).toBe('');
    });

    it('should keep digits and decimal point', () => {
      const result = SanitizationUtils.sanitizeNumber('123.45');
      expect(result).toBe('123.45');
    });

    it('should remove non-numeric characters', () => {
      const result = SanitizationUtils.sanitizeNumber('$123.45');
      expect(result).toBe('123.45');
    });

    it('should keep only first decimal point', () => {
      const result = SanitizationUtils.sanitizeNumber('123.45.67');
      expect(result).toBe('123.4567');
    });

    it('should trim whitespace', () => {
      const result = SanitizationUtils.sanitizeNumber('  123.45  ');
      expect(result).toBe('123.45');
    });
  });

  describe('sanitizePincode', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizePincode(null as any)).toBe('');
      expect(SanitizationUtils.sanitizePincode(undefined as any)).toBe('');
    });

    it('should keep only digits', () => {
      const result = SanitizationUtils.sanitizePincode('400 001');
      expect(result).toBe('400001');
    });

    it('should remove all non-digit characters', () => {
      const result = SanitizationUtils.sanitizePincode('400-001');
      expect(result).toBe('400001');
    });
  });

  describe('sanitizeVehicleNumber', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeVehicleNumber(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeVehicleNumber(undefined as any)).toBe('');
    });

    it('should convert to uppercase', () => {
      const result = SanitizationUtils.sanitizeVehicleNumber('dl01ab1234');
      expect(result).toBe('DL01AB1234');
    });

    it('should keep only letters and numbers', () => {
      const result = SanitizationUtils.sanitizeVehicleNumber('DL-01-AB-1234');
      expect(result).toBe('DL01AB1234');
    });

    it('should trim whitespace', () => {
      const result = SanitizationUtils.sanitizeVehicleNumber('  DL01AB1234  ');
      expect(result).toBe('DL01AB1234');
    });
  });

  describe('sanitizeLicenseNumber', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeLicenseNumber(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeLicenseNumber(undefined as any)).toBe('');
    });

    it('should convert to uppercase', () => {
      const result = SanitizationUtils.sanitizeLicenseNumber('dl123456');
      expect(result).toBe('DL123456');
    });

    it('should keep alphanumeric, spaces, and hyphens', () => {
      const result = SanitizationUtils.sanitizeLicenseNumber('DL-123 456');
      expect(result).toBe('DL-123 456');
    });

    it('should remove special characters', () => {
      const result = SanitizationUtils.sanitizeLicenseNumber('DL@123#456');
      expect(result).toBe('DL123456');
    });

    it('should collapse multiple spaces', () => {
      const result = SanitizationUtils.sanitizeLicenseNumber('DL    123');
      expect(result).toBe('DL 123');
    });
  });

  describe('sanitizeDateString', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeDateString(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeDateString(undefined as any)).toBe('');
    });

    it('should keep digits and separators', () => {
      const result = SanitizationUtils.sanitizeDateString('01-01-2024');
      expect(result).toBe('01-01-2024');
    });

    it('should keep forward slashes', () => {
      const result = SanitizationUtils.sanitizeDateString('01/01/2024');
      expect(result).toBe('01/01/2024');
    });

    it('should remove non-digit, non-separator characters', () => {
      const result = SanitizationUtils.sanitizeDateString('01-Jan-2024');
      expect(result).toBe('01--2024');
    });

    it('should trim whitespace', () => {
      const result = SanitizationUtils.sanitizeDateString('  01-01-2024  ');
      expect(result).toBe('01-01-2024');
    });
  });

  describe('sanitizeTimeString', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeTimeString(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeTimeString(undefined as any)).toBe('');
    });

    it('should keep digits and colon', () => {
      const result = SanitizationUtils.sanitizeTimeString('10:30');
      expect(result).toBe('10:30');
    });

    it('should remove non-digit, non-colon characters', () => {
      const result = SanitizationUtils.sanitizeTimeString('10:30 AM');
      expect(result).toBe('10:30');
    });

    it('should trim whitespace', () => {
      const result = SanitizationUtils.sanitizeTimeString('  10:30  ');
      expect(result).toBe('10:30');
    });
  });

  describe('sanitizeText', () => {
    it('should return empty string for non-string input', () => {
      expect(SanitizationUtils.sanitizeText(null as any)).toBe('');
      expect(SanitizationUtils.sanitizeText(undefined as any)).toBe('');
    });

    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = SanitizationUtils.sanitizeText(input);
      expect(result).not.toContain('<script>');
    });

    it('should remove HTML tags', () => {
      const input = 'Hello <div>World</div>';
      const result = SanitizationUtils.sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should limit length to maxLength', () => {
      const longText = 'A'.repeat(2000);
      const result = SanitizationUtils.sanitizeText(longText, 100);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should use default maxLength of 1000', () => {
      const longText = 'A'.repeat(2000);
      const result = SanitizationUtils.sanitizeText(longText);
      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('sanitizeObject', () => {
    it('should return object as-is for non-object input', () => {
      expect(SanitizationUtils.sanitizeObject(null as any)).toBe(null);
      expect(SanitizationUtils.sanitizeObject(undefined as any)).toBe(undefined);
      expect(SanitizationUtils.sanitizeObject('string' as any)).toBe('string');
    });

    it('should sanitize string values using sanitizeString', () => {
      const obj = {
        name: 'John <script>alert("xss")</script>',
        age: 30,
      };
      const result = SanitizationUtils.sanitizeObject(obj);
      expect(result.name).not.toContain('<script>');
      expect(result.age).toBe(30);
    });

    it('should auto-detect email fields and use sanitizeEmail', () => {
      const obj = {
        email: 'TEST@EXAMPLE.COM',
        userEmail: 'USER@TEST.COM',
      };
      const result = SanitizationUtils.sanitizeObject(obj);
      expect(result.email).toBe('test@example.com');
      expect(result.userEmail).toBe('user@test.com');
    });

    it('should use custom sanitizers when provided', () => {
      const obj = {
        name: 'John Doe',
        phone: '9876543210',
      };
      const sanitizers = {
        phone: (value: string) => value.replace(/\D/g, ''),
      };
      const result = SanitizationUtils.sanitizeObject(obj, sanitizers);
      expect(result.phone).toBe('9876543210');
    });

    it('should not modify original object', () => {
      const obj = {
        name: 'John <script>alert("xss")</script>',
      };
      const original = JSON.stringify(obj);
      SanitizationUtils.sanitizeObject(obj);
      expect(JSON.stringify(obj)).toBe(original);
    });
  });
});

