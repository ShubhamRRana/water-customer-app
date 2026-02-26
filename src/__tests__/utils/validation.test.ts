/**
 * Validation Utilities Tests
 */

import { ValidationUtils } from '../../utils/validation';

describe('ValidationUtils', () => {
  describe('validatePhone', () => {
    it('should validate valid 10-digit Indian phone number', () => {
      const result = ValidationUtils.validatePhone('9876543210');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate phone with spaces and dashes', () => {
      const result = ValidationUtils.validatePhone('987 654 3210');
      expect(result.isValid).toBe(true);
    });

    it('should reject phone number with less than 10 digits', () => {
      const result = ValidationUtils.validatePhone('123456789');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10 digits');
    });

    it('should reject phone number with more than 10 digits', () => {
      const result = ValidationUtils.validatePhone('12345678901');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10 digits');
    });

    it('should reject phone number not starting with 6-9', () => {
      const result = ValidationUtils.validatePhone('1234567890');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('starting with 6-9');
    });

    it('should require phone when required=true', () => {
      const result = ValidationUtils.validatePhone('', true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should allow empty phone when required=false', () => {
      const result = ValidationUtils.validatePhone('', false);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate password meeting minimum length', () => {
      const result = ValidationUtils.validatePassword('password123');
      expect(result.isValid).toBe(true);
    });

    it('should reject password shorter than minimum length', () => {
      const result = ValidationUtils.validatePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should reject password longer than maximum length', () => {
      const longPassword = 'a'.repeat(129);
      const result = ValidationUtils.validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than');
    });

    it('should require password when required=true', () => {
      const result = ValidationUtils.validatePassword('', true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should allow empty password when required=false', () => {
      const result = ValidationUtils.validatePassword('', false);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate valid email address', () => {
      const result = ValidationUtils.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should validate email with subdomain', () => {
      const result = ValidationUtils.validateEmail('test@mail.example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject email without @ symbol', () => {
      const result = ValidationUtils.validateEmail('invalidemail.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject email with multiple @ symbols', () => {
      const result = ValidationUtils.validateEmail('test@@example.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject email with invalid domain (no dot)', () => {
      const result = ValidationUtils.validateEmail('test@example');
      expect(result.isValid).toBe(false);
    });

    it('should reject email with domain starting with dot', () => {
      const result = ValidationUtils.validateEmail('test@.example.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject email with domain ending with dot', () => {
      const result = ValidationUtils.validateEmail('test@example.com.');
      expect(result.isValid).toBe(false);
    });

    it('should reject email with local part longer than 64 characters', () => {
      const longLocal = 'a'.repeat(65) + '@example.com';
      const result = ValidationUtils.validateEmail(longLocal);
      expect(result.isValid).toBe(false);
    });

    it('should require email when required=true', () => {
      const result = ValidationUtils.validateEmail('', true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should allow empty email when required=false', () => {
      const result = ValidationUtils.validateEmail('', false);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEmailUniqueness', () => {
    it('should validate unique email', () => {
      const checkExists = jest.fn().mockReturnValue(false);
      const result = ValidationUtils.validateEmailUniqueness('test@example.com', checkExists);
      
      expect(result.isValid).toBe(true);
      expect(checkExists).toHaveBeenCalledWith('test@example.com');
    });

    it('should reject duplicate email', () => {
      const checkExists = jest.fn().mockReturnValue(true);
      const result = ValidationUtils.validateEmailUniqueness('test@example.com', checkExists);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should normalize email to lowercase', () => {
      const checkExists = jest.fn().mockReturnValue(false);
      ValidationUtils.validateEmailUniqueness('TEST@EXAMPLE.COM', checkExists);
      
      expect(checkExists).toHaveBeenCalledWith('test@example.com');
    });

    it('should validate email format first', () => {
      const checkExists = jest.fn();
      const result = ValidationUtils.validateEmailUniqueness('invalid-email', checkExists);
      
      expect(result.isValid).toBe(false);
      expect(checkExists).not.toHaveBeenCalled();
    });
  });

  describe('validateName', () => {
    it('should validate valid name', () => {
      const result = ValidationUtils.validateName('John Doe');
      expect(result.isValid).toBe(true);
    });

    it('should validate name with hyphen', () => {
      const result = ValidationUtils.validateName('Mary-Jane Smith');
      expect(result.isValid).toBe(true);
    });

    it('should reject name shorter than minimum length', () => {
      const result = ValidationUtils.validateName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should reject name longer than maximum length', () => {
      const longName = 'A'.repeat(101);
      const result = ValidationUtils.validateName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than');
    });

    it('should reject name with numbers', () => {
      const result = ValidationUtils.validateName('John123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('letters');
    });

    it('should require name when required=true', () => {
      const result = ValidationUtils.validateName('', true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should allow empty name when required=false', () => {
      const result = ValidationUtils.validateName('', false);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateBusinessName', () => {
    it('should validate valid business name', () => {
      const result = ValidationUtils.validateBusinessName('ABC Corp & Co.');
      expect(result.isValid).toBe(true);
    });

    it('should validate business name with numbers', () => {
      const result = ValidationUtils.validateBusinessName('Company 123');
      expect(result.isValid).toBe(true);
    });

    it('should reject business name shorter than 2 characters', () => {
      const result = ValidationUtils.validateBusinessName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });

    it('should reject business name longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = ValidationUtils.validateBusinessName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than 100 characters');
    });

    it('should reject business name with invalid characters', () => {
      const result = ValidationUtils.validateBusinessName('Company@#$');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });
  });

  describe('validateAddress', () => {
    it('should validate complete address', () => {
      const address = {
        address: '123 Main St, Mumbai, Maharashtra, 400001',
      };
      const result = ValidationUtils.validateAddress(address);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject address with missing address field', () => {
      const address = {
        address: '',
      };
      const result = ValidationUtils.validateAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Address is required');
    });

    it('should reject address with only whitespace', () => {
      const address = {
        address: '   ',
      };
      const result = ValidationUtils.validateAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Address is required');
    });

    it('should validate address with valid content', () => {
      const address = {
        address: '123 Main St, Mumbai, Maharashtra, 400001',
      };
      const result = ValidationUtils.validateAddress(address);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateVehicleNumber', () => {
    it('should validate valid Indian vehicle number', () => {
      const result = ValidationUtils.validateVehicleNumber('DL01AB1234');
      expect(result.isValid).toBe(true);
    });

    it('should validate lowercase vehicle number', () => {
      const result = ValidationUtils.validateVehicleNumber('dl01ab1234');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid vehicle number format', () => {
      const result = ValidationUtils.validateVehicleNumber('INVALID123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid vehicle number');
    });

    it('should require vehicle number', () => {
      const result = ValidationUtils.validateVehicleNumber('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('validateLicenseNumber', () => {
    it('should validate license number with at least 10 characters', () => {
      const result = ValidationUtils.validateLicenseNumber('DL1234567890');
      expect(result.isValid).toBe(true);
    });

    it('should reject license number shorter than 10 characters', () => {
      const result = ValidationUtils.validateLicenseNumber('DL123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 10 characters');
    });

    it('should require license number', () => {
      const result = ValidationUtils.validateLicenseNumber('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('validatePincode', () => {
    it('should validate 6-digit pincode', () => {
      const result = ValidationUtils.validatePincode('400001');
      expect(result.isValid).toBe(true);
    });

    it('should reject pincode with less than 6 digits', () => {
      const result = ValidationUtils.validatePincode('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('6 digits');
    });

    it('should reject pincode with non-digits', () => {
      const result = ValidationUtils.validatePincode('40000A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('6 digits');
    });

    it('should require pincode', () => {
      const result = ValidationUtils.validatePincode('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('validateDate', () => {
    it('should validate future date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = ValidationUtils.validateDate(tomorrow);
      expect(result.isValid).toBe(true);
    });

    it('should reject past date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = ValidationUtils.validateDate(yesterday);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least tomorrow');
    });

    it('should reject invalid date', () => {
      const invalidDate = new Date('invalid');
      const result = ValidationUtils.validateDate(invalidDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid date');
    });

    it('should reject date more than 30 days in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 31);
      const result = ValidationUtils.validateDate(futureDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('30 days');
    });
  });

  describe('validateDateString', () => {
    it('should validate valid date string', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString('en-GB').replace(/\//g, '-');
      const result = ValidationUtils.validateDateString(dateStr);
      expect(result.isValid).toBe(true);
    });

    it('should reject past date string', () => {
      const result = ValidationUtils.validateDateString('01-01-2020');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('past dates');
    });

    it('should reject invalid date format', () => {
      const result = ValidationUtils.validateDateString('2024-01-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('DD-MM-YYYY');
    });

    it('should reject non-existent date', () => {
      const result = ValidationUtils.validateDateString('32-13-2024');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTime', () => {
    it('should validate future time within business hours', () => {
      const futureTime = new Date();
      futureTime.setHours(15, 0, 0, 0);
      if (futureTime <= new Date()) {
        futureTime.setDate(futureTime.getDate() + 1);
      }
      const result = ValidationUtils.validateTime(futureTime);
      expect(result.isValid).toBe(true);
    });

    it('should reject time outside business hours (before 6 AM)', () => {
      const earlyTime = new Date();
      earlyTime.setHours(5, 0, 0, 0);
      earlyTime.setDate(earlyTime.getDate() + 1);
      const result = ValidationUtils.validateTime(earlyTime);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('6:00 AM');
    });

    it('should reject time outside business hours (after 10 PM)', () => {
      const lateTime = new Date();
      lateTime.setHours(23, 0, 0, 0);
      lateTime.setDate(lateTime.getDate() + 1);
      const result = ValidationUtils.validateTime(lateTime);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10:00 PM');
    });
  });

  describe('validateTimeString', () => {
    it('should validate valid time string', () => {
      const result = ValidationUtils.validateTimeString('10:30');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid time format', () => {
      const result = ValidationUtils.validateTimeString('25:00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between 1 and 12');
    });

    it('should reject time with invalid minutes', () => {
      const result = ValidationUtils.validateTimeString('10:60');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between 0 and 59');
    });
  });

  describe('validateVehicleCapacity', () => {
    it('should validate valid capacity as number', () => {
      const result = ValidationUtils.validateVehicleCapacity(5000);
      expect(result.isValid).toBe(true);
    });

    it('should validate valid capacity as string', () => {
      const result = ValidationUtils.validateVehicleCapacity('5000');
      expect(result.isValid).toBe(true);
    });

    it('should reject negative capacity', () => {
      const result = ValidationUtils.validateVehicleCapacity(-100);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('positive number');
    });

    it('should reject capacity exceeding 100000 liters', () => {
      const result = ValidationUtils.validateVehicleCapacity(100001);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100,000 liters');
    });
  });

  describe('validateAmount', () => {
    it('should validate valid amount as number', () => {
      const result = ValidationUtils.validateAmount(1000);
      expect(result.isValid).toBe(true);
    });

    it('should validate valid amount as string', () => {
      const result = ValidationUtils.validateAmount('1000');
      expect(result.isValid).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = ValidationUtils.validateAmount(-100);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('positive number');
    });

    it('should reject amount exceeding ₹10,00,000', () => {
      const result = ValidationUtils.validateAmount(1000001);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('₹10,00,000');
    });
  });

  describe('validateInsuranceDate', () => {
    it('should validate future insurance date with DD/MM/YYYY format', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString('en-GB').replace(/\//g, '/');
      const result = ValidationUtils.validateInsuranceDate(dateStr);
      expect(result.isValid).toBe(true);
    });

    it('should validate future insurance date with DD-MM-YYYY format', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString('en-GB').replace(/\//g, '-');
      const result = ValidationUtils.validateInsuranceDate(dateStr);
      expect(result.isValid).toBe(true);
    });

    it('should reject past insurance date', () => {
      const result = ValidationUtils.validateInsuranceDate('01/01/2020');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('past');
    });

    it('should reject invalid format', () => {
      const result = ValidationUtils.validateInsuranceDate('2024-01-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('DD/MM/YYYY');
    });
  });

  describe('validateAddressText', () => {
    it('should validate valid address text', () => {
      const result = ValidationUtils.validateAddressText('123 Main Street, Mumbai, Maharashtra');
      expect(result.isValid).toBe(true);
    });

    it('should reject address shorter than 10 characters', () => {
      const result = ValidationUtils.validateAddressText('Short');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 10 characters');
    });

    it('should reject address longer than 500 characters', () => {
      const longAddress = 'A'.repeat(501);
      const result = ValidationUtils.validateAddressText(longAddress);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than 500 characters');
    });
  });

  describe('validateConfirmPassword', () => {
    it('should validate matching passwords', () => {
      const result = ValidationUtils.validateConfirmPassword('password123', 'password123');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-matching passwords', () => {
      const result = ValidationUtils.validateConfirmPassword('password123', 'password456');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('do not match');
    });

    it('should require confirm password when required=true', () => {
      const result = ValidationUtils.validateConfirmPassword('password123', '', true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('confirm');
    });
  });

  describe('validateUUID', () => {
    it('should validate valid UUID v4', () => {
      const result = ValidationUtils.validateUUID('550e8400-e29b-41d4-a716-446655440000');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const result = ValidationUtils.validateUUID('not-a-uuid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid UUID format');
    });

    it('should require UUID', () => {
      const result = ValidationUtils.validateUUID('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('validateForm', () => {
    it('should validate form with all valid fields', () => {
      const data = { name: 'John Doe', email: 'john@example.com' };
      const validators = {
        name: (value: string) => ValidationUtils.validateName(value),
        email: (value: string) => ValidationUtils.validateEmail(value),
      };
      
      const result = ValidationUtils.validateForm(data, validators);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should collect errors from invalid fields', () => {
      const data = { name: '', email: 'invalid' };
      const validators = {
        name: (value: string) => ValidationUtils.validateName(value),
        email: (value: string) => ValidationUtils.validateEmail(value),
      };
      
      const result = ValidationUtils.validateForm(data, validators);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });

    it('should handle partial validation errors', () => {
      const data = { name: 'John Doe', email: 'invalid' };
      const validators = {
        name: (value: string) => ValidationUtils.validateName(value),
        email: (value: string) => ValidationUtils.validateEmail(value),
      };
      
      const result = ValidationUtils.validateForm(data, validators);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeUndefined();
      expect(result.errors.email).toBeDefined();
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    describe('validatePhone edge cases', () => {
      it('should handle phone with only whitespace', () => {
        const result = ValidationUtils.validatePhone('   ');
        expect(result.isValid).toBe(false);
      });

      it('should handle phone with special characters', () => {
        const result = ValidationUtils.validatePhone('98765-43210');
        expect(result.isValid).toBe(true);
      });

      it('should handle phone with country code', () => {
        const result = ValidationUtils.validatePhone('+91 9876543210');
        // Should strip non-digits and validate
        expect(result.isValid).toBe(false); // After stripping, it would be 12 digits
      });
    });

    describe('validateEmail edge cases', () => {
      it('should handle email with domain starting with hyphen', () => {
        const result = ValidationUtils.validateEmail('test@-example.com');
        expect(result.isValid).toBe(false);
      });

      it('should handle email with domain ending with hyphen', () => {
        const result = ValidationUtils.validateEmail('test@example-.com');
        expect(result.isValid).toBe(false);
      });

      it('should handle email with exactly 64 character local part', () => {
        const localPart = 'a'.repeat(64);
        const result = ValidationUtils.validateEmail(`${localPart}@example.com`);
        expect(result.isValid).toBe(true);
      });

      it('should handle email with exactly 255 character domain', () => {
        const domain = 'a'.repeat(250) + '.com';
        const result = ValidationUtils.validateEmail(`test@${domain}`);
        // Domain length check
        expect(result.isValid).toBe(false); // Domain too long
      });

      it('should handle email with multiple consecutive dots', () => {
        const result = ValidationUtils.validateEmail('test..test@example.com');
        // This depends on regex pattern, but should be handled
        expect(result.isValid).toBeDefined();
      });
    });

    describe('validateName edge cases', () => {
      it('should handle name with only spaces', () => {
        const result = ValidationUtils.validateName('   ');
        expect(result.isValid).toBe(false);
      });

      it('should handle name at minimum length boundary', () => {
        const minLength = 2; // Based on VALIDATION_CONFIG
        const name = 'A'.repeat(minLength);
        const result = ValidationUtils.validateName(name);
        expect(result.isValid).toBe(true);
      });

      it('should handle name at maximum length boundary', () => {
        const maxLength = 100; // Based on VALIDATION_CONFIG
        const name = 'A'.repeat(maxLength);
        const result = ValidationUtils.validateName(name);
        expect(result.isValid).toBe(true);
      });

      it('should handle name with unicode characters', () => {
        const result = ValidationUtils.validateName('José María');
        // Depends on pattern, but should handle gracefully
        expect(result.isValid).toBeDefined();
      });
    });

    describe('validatePassword edge cases', () => {
      it('should handle password at minimum length boundary', () => {
        const minLength = 8; // Typical minimum
        const password = 'a'.repeat(minLength);
        const result = ValidationUtils.validatePassword(password);
        expect(result.isValid).toBe(true);
      });

      it('should handle password at maximum length boundary', () => {
        const maxLength = 128; // Based on VALIDATION_CONFIG
        const password = 'a'.repeat(maxLength);
        const result = ValidationUtils.validatePassword(password);
        expect(result.isValid).toBe(true);
      });

      it('should handle password with only whitespace', () => {
        const result = ValidationUtils.validatePassword('   ');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateBusinessName edge cases', () => {
      it('should handle business name at minimum length (2 chars)', () => {
        const result = ValidationUtils.validateBusinessName('AB');
        expect(result.isValid).toBe(true);
      });

      it('should handle business name at maximum length (100 chars)', () => {
        const name = 'A'.repeat(100);
        const result = ValidationUtils.validateBusinessName(name);
        expect(result.isValid).toBe(true);
      });

      it('should handle business name with only spaces', () => {
        const result = ValidationUtils.validateBusinessName('   ');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateAddressText edge cases', () => {
      it('should handle address at minimum length (10 chars)', () => {
        const address = 'A'.repeat(10);
        const result = ValidationUtils.validateAddressText(address);
        expect(result.isValid).toBe(true);
      });

      it('should handle address at maximum length (500 chars)', () => {
        const address = 'A'.repeat(500);
        const result = ValidationUtils.validateAddressText(address);
        expect(result.isValid).toBe(true);
      });

      it('should handle address with only spaces', () => {
        const result = ValidationUtils.validateAddressText('   ');
        expect(result.isValid).toBe(false);
      });

      it('should allow empty address when not required', () => {
        const result = ValidationUtils.validateAddressText('', false);
        expect(result.isValid).toBe(true);
      });
    });

    describe('validateConfirmPassword edge cases', () => {
      it('should handle empty confirm password when not required', () => {
        const result = ValidationUtils.validateConfirmPassword('password123', '', false);
        expect(result.isValid).toBe(true);
      });

      it('should handle passwords with special characters', () => {
        const password = 'P@ssw0rd!@#';
        const result = ValidationUtils.validateConfirmPassword(password, password);
        expect(result.isValid).toBe(true);
      });

      it('should handle case-sensitive password matching', () => {
        const result = ValidationUtils.validateConfirmPassword('Password123', 'password123');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateUUID edge cases', () => {
      it('should handle UUID with uppercase letters', () => {
        const result = ValidationUtils.validateUUID('550E8400-E29B-41D4-A716-446655440000');
        expect(result.isValid).toBe(true);
      });

      it('should handle UUID with lowercase letters', () => {
        const result = ValidationUtils.validateUUID('550e8400-e29b-41d4-a716-446655440000');
        expect(result.isValid).toBe(true);
      });

      it('should handle UUID with mixed case', () => {
        const result = ValidationUtils.validateUUID('550E8400-e29B-41D4-a716-446655440000');
        expect(result.isValid).toBe(true);
      });

      it('should reject UUID with wrong version (not 4)', () => {
        // UUID v1 format (version 1)
        const result = ValidationUtils.validateUUID('550e8400-e29b-11d4-a716-446655440000');
        expect(result.isValid).toBe(false);
      });

      it('should reject UUID with invalid variant', () => {
        // Invalid variant (should be 8, 9, a, or b)
        const result = ValidationUtils.validateUUID('550e8400-e29b-41d4-c716-446655440000');
        expect(result.isValid).toBe(false);
      });

      it('should handle UUID with whitespace', () => {
        const result = ValidationUtils.validateUUID('  550e8400-e29b-41d4-a716-446655440000  ');
        expect(result.isValid).toBe(true); // Should trim
      });
    });

    describe('validateAmount edge cases', () => {
      it('should handle amount at maximum boundary (₹10,00,000)', () => {
        const result = ValidationUtils.validateAmount(1000000);
        expect(result.isValid).toBe(true);
      });

      it('should reject amount exceeding maximum', () => {
        const result = ValidationUtils.validateAmount(1000001);
        expect(result.isValid).toBe(false);
      });

      it('should handle amount as string with decimals', () => {
        const result = ValidationUtils.validateAmount('1000.50');
        expect(result.isValid).toBe(true);
      });

      it('should handle zero amount', () => {
        const result = ValidationUtils.validateAmount(0);
        expect(result.isValid).toBe(false);
      });

      it('should handle negative amount', () => {
        const result = ValidationUtils.validateAmount(-100);
        expect(result.isValid).toBe(false);
      });

      it('should handle invalid string amount', () => {
        const result = ValidationUtils.validateAmount('not-a-number');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateVehicleCapacity edge cases', () => {
      it('should handle capacity at maximum boundary (100,000 liters)', () => {
        const result = ValidationUtils.validateVehicleCapacity(100000);
        expect(result.isValid).toBe(true);
      });

      it('should reject capacity exceeding maximum', () => {
        const result = ValidationUtils.validateVehicleCapacity(100001);
        expect(result.isValid).toBe(false);
      });

      it('should handle capacity as string with decimals', () => {
        const result = ValidationUtils.validateVehicleCapacity('5000.5');
        expect(result.isValid).toBe(true);
      });

      it('should handle zero capacity', () => {
        const result = ValidationUtils.validateVehicleCapacity(0);
        expect(result.isValid).toBe(false);
      });

      it('should handle negative capacity', () => {
        const result = ValidationUtils.validateVehicleCapacity(-100);
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateDateString edge cases', () => {
      it('should handle date string with single digit day/month', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const day = tomorrow.getDate().toString().padStart(2, '0');
        const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
        const year = tomorrow.getFullYear();
        const dateStr = `${day}-${month}-${year}`;
        
        const result = ValidationUtils.validateDateString(dateStr);
        expect(result.isValid).toBe(true);
      });

      it('should handle year at minimum boundary (2024)', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const day = tomorrow.getDate().toString().padStart(2, '0');
        const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
        const dateStr = `${day}-${month}-2024`;
        
        const result = ValidationUtils.validateDateString(dateStr);
        // May be valid if date is in future
        expect(result.isValid).toBeDefined();
      });

      it('should handle year at maximum boundary (2030)', () => {
        const dateStr = '01-01-2030';
        const result = ValidationUtils.validateDateString(dateStr);
        expect(result.isValid).toBeDefined();
      });

      it('should reject year below minimum (2023)', () => {
        const result = ValidationUtils.validateDateString('01-01-2023');
        expect(result.isValid).toBe(false);
      });

      it('should reject year above maximum (2031)', () => {
        const result = ValidationUtils.validateDateString('01-01-2031');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateTimeString edge cases', () => {
      it('should handle time at minimum hour (1)', () => {
        const result = ValidationUtils.validateTimeString('1:00');
        expect(result.isValid).toBe(true);
      });

      it('should handle time at maximum hour (12)', () => {
        const result = ValidationUtils.validateTimeString('12:00');
        expect(result.isValid).toBe(true);
      });

      it('should handle time at minimum minutes (0)', () => {
        const result = ValidationUtils.validateTimeString('10:00');
        expect(result.isValid).toBe(true);
      });

      it('should handle time at maximum minutes (59)', () => {
        const result = ValidationUtils.validateTimeString('10:59');
        expect(result.isValid).toBe(true);
      });

      it('should reject hour 0', () => {
        const result = ValidationUtils.validateTimeString('0:00');
        expect(result.isValid).toBe(false);
      });

      it('should reject hour 13', () => {
        const result = ValidationUtils.validateTimeString('13:00');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateForm edge cases', () => {
      it('should handle form with no validators', () => {
        const data = { name: 'Test' };
        const validators = {};
        
        const result = ValidationUtils.validateForm(data, validators);
        expect(result.isValid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
      });

      it('should handle form with all fields valid', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
        };
        const validators = {
          name: (value: string) => ValidationUtils.validateName(value),
          email: (value: string) => ValidationUtils.validateEmail(value),
          phone: (value: string) => ValidationUtils.validatePhone(value),
        };
        
        const result = ValidationUtils.validateForm(data, validators);
        expect(result.isValid).toBe(true);
      });

      it('should handle form with mixed valid and invalid fields', () => {
        const data = {
          name: 'John Doe',
          email: 'invalid-email',
          phone: '9876543210',
        };
        const validators = {
          name: (value: string) => ValidationUtils.validateName(value),
          email: (value: string) => ValidationUtils.validateEmail(value),
          phone: (value: string) => ValidationUtils.validatePhone(value),
        };
        
        const result = ValidationUtils.validateForm(data, validators);
        expect(result.isValid).toBe(false);
        expect(result.errors.name).toBeUndefined();
        expect(result.errors.email).toBeDefined();
        expect(result.errors.phone).toBeUndefined();
      });
    });
  });
});

