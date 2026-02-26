/**
 * Auth Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService, AuthResult } from '../../services/auth.service';
import { LocalStorageService } from '../../services/localStorage';
import { User, UserRole, DriverUser, AdminUser } from '../../types';
import { rateLimiter } from '../../utils/rateLimiter';
import { securityLogger } from '../../utils/securityLogger';
import { SanitizationUtils } from '../../utils/sanitization';
import { ValidationUtils } from '../../utils/validation';
import { ERROR_MESSAGES } from '../../constants/config';

// Clear AsyncStorage and reset mocks before each test
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  rateLimiter.resetAll();
});

// Restore all mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
  rateLimiter.resetAll();
});

describe('AuthService', () => {
  const mockCustomerUser: Omit<User, 'id' | 'createdAt'> = {
    email: 'customer@test.com',
    password: 'password123',
    name: 'Test Customer',
    phone: '1234567890',
    role: 'customer',
  };

  const mockDriverUser: Omit<DriverUser, 'id' | 'createdAt'> = {
    email: 'driver@test.com',
    password: 'password123',
    name: 'Test Driver',
    phone: '9876543210',
    role: 'driver',
    licenseNumber: 'DL123456',
    vehicleNumber: 'ABC123',
    isAvailable: true,
    createdByAdmin: true,
  };

  const mockAdminUser: Omit<AdminUser, 'id' | 'createdAt'> = {
    email: 'admin@test.com',
    password: 'password123',
    name: 'Test Admin',
    phone: '1234567890',
    role: 'admin',
    businessName: 'Test Business',
  };

  describe('register', () => {
    it('should successfully register a new customer', async () => {
      const result = await AuthService.register(
        'newcustomer@test.com',
        'password123',
        'New Customer',
        'customer',
        { phone: '1234567890' }
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('newcustomer@test.com');
      expect(result.user?.role).toBe('customer');
      expect(result.user?.savedAddresses).toEqual([]);
    });

    it('should successfully register a new admin-created driver', async () => {
      const result = await AuthService.register(
        'newdriver@test.com',
        'password123',
        'New Driver',
        'driver',
        { createdByAdmin: true, phone: '9876543210' }
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('driver');
      expect((result.user as DriverUser).createdByAdmin).toBe(true);
    });

    it('should reject driver self-registration', async () => {
      const result = await AuthService.register(
        'driver@test.com',
        'password123',
        'Driver',
        'driver'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.auth.adminCreatedDriverOnly);
    });

    it('should reject registration with invalid email', async () => {
      jest.spyOn(ValidationUtils, 'validateEmail').mockReturnValue({
        isValid: false,
        error: 'Invalid email address',
      });

      const result = await AuthService.register(
        'invalid-email',
        'password123',
        'Test User',
        'customer'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should reject registration when rate limit exceeded', async () => {
      // Exceed rate limit
      for (let i = 0; i < 3; i++) {
        rateLimiter.record('register', 'test@example.com');
      }

      jest.spyOn(rateLimiter, 'isAllowed').mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000,
      });

      const result = await AuthService.register(
        'test@example.com',
        'password123',
        'Test User',
        'customer'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many registration attempts');
    });

    it('should reject registration when user already exists with same email and role', async () => {
      // Create existing user
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'existing-user',
        createdAt: new Date(),
      } as User);

      const result = await AuthService.register(
        'customer@test.com',
        'password123',
        'Test User',
        'customer'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User already exists');
    });

    it('should allow registration with same email but different role', async () => {
      // Create existing customer
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User);

      // Register as driver (admin-created)
      const result = await AuthService.register(
        'customer@test.com',
        'password123',
        'Test User',
        'driver',
        { createdByAdmin: true, phone: '9876543210' }
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('driver');
    });

    it('should sanitize email and name inputs', async () => {
      const sanitizeEmailSpy = jest.spyOn(SanitizationUtils, 'sanitizeEmail');
      const sanitizeNameSpy = jest.spyOn(SanitizationUtils, 'sanitizeName');

      await AuthService.register(
        '  TEST@EXAMPLE.COM  ',
        'password123',
        '  Test User  ',
        'customer',
        { phone: '1234567890' }
      );

      expect(sanitizeEmailSpy).toHaveBeenCalled();
      expect(sanitizeNameSpy).toHaveBeenCalled();
    });

    it('should handle errors during registration', async () => {
      jest.spyOn(LocalStorageService, 'getUsers').mockRejectedValue(new Error('Database error'));

      const result = await AuthService.register(
        'test@example.com',
        'password123',
        'Test User',
        'customer'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should include driver-specific fields when registering driver', async () => {
      const result = await AuthService.register(
        'driver@test.com',
        'password123',
        'Driver Name',
        'driver',
        {
          createdByAdmin: true,
          phone: '9876543210',
          vehicleNumber: 'XYZ789',
          licenseNumber: 'DL987654',
        }
      );

      expect(result.success).toBe(true);
      const driver = result.user as DriverUser;
      expect(driver.vehicleNumber).toBe('XYZ789');
      expect(driver.licenseNumber).toBe('DL987654');
    });

    it('should include admin-specific fields when registering admin', async () => {
      const result = await AuthService.register(
        'admin@test.com',
        'password123',
        'Admin Name',
        'admin',
        {
          phone: '1234567890',
          businessName: 'My Business',
        }
      );

      expect(result.success).toBe(true);
      const admin = result.user as AdminUser;
      expect(admin.businessName).toBe('My Business');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User);
    });

    it('should successfully login with valid credentials', async () => {
      const result = await AuthService.login('customer@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('customer@test.com');
      expect(result.user?.role).toBe('customer');
      expect(result.requiresRoleSelection).toBeUndefined();
    });

    it('should reject login with invalid email format', async () => {
      jest.spyOn(ValidationUtils, 'validateEmail').mockReturnValue({
        isValid: false,
        error: 'Invalid email address',
      });

      const result = await AuthService.login('invalid-email', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should reject login when rate limit exceeded', async () => {
      jest.spyOn(rateLimiter, 'isAllowed').mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 900000,
      });

      const result = await AuthService.login('customer@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many login attempts');
    });

    it('should reject login when user not found', async () => {
      const result = await AuthService.login('nonexistent@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should reject login with incorrect password', async () => {
      const result = await AuthService.login('customer@test.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });

    it('should require role selection when user has multiple accounts', async () => {
      // Create multiple accounts with same email
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User);
      await LocalStorageService.saveUserToCollection({
        ...mockDriverUser,
        id: 'driver-1',
        email: 'customer@test.com',
        password: 'password123',
        createdAt: new Date(),
      } as DriverUser);

      const result = await AuthService.login('customer@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.requiresRoleSelection).toBe(true);
      expect(result.availableRoles).toContain('customer');
      expect(result.availableRoles).toContain('driver');
      expect(result.user).toBeUndefined();
    });

    it('should filter out non-admin-created drivers during login', async () => {
      // Create driver not created by admin
      await LocalStorageService.saveUserToCollection({
        ...mockDriverUser,
        id: 'driver-1',
        createdByAdmin: false,
        createdAt: new Date(),
      } as DriverUser);

      const result = await AuthService.login('driver@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.auth.adminCreatedDriverOnly);
    });

    it('should handle errors during login', async () => {
      jest.spyOn(LocalStorageService, 'getUsers').mockRejectedValue(new Error('Database error'));

      const result = await AuthService.login('customer@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should sanitize email input', async () => {
      const sanitizeEmailSpy = jest.spyOn(SanitizationUtils, 'sanitizeEmail');

      await AuthService.login('  CUSTOMER@TEST.COM  ', 'password123');

      expect(sanitizeEmailSpy).toHaveBeenCalled();
    });
  });

  describe('loginWithRole', () => {
    beforeEach(async () => {
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User);
      await LocalStorageService.saveUserToCollection({
        ...mockDriverUser,
        id: 'driver-1',
        email: 'customer@test.com',
        password: 'password123',
        createdAt: new Date(),
      } as DriverUser);
    });

    it('should successfully login with selected role', async () => {
      const result = await AuthService.loginWithRole('customer@test.com', 'customer');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('customer');
    });

    it('should reject login when user not found with selected role', async () => {
      const result = await AuthService.loginWithRole('customer@test.com', 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found with selected role');
    });

    it('should reject login for non-admin-created driver', async () => {
      await LocalStorageService.saveUserToCollection({
        ...mockDriverUser,
        id: 'driver-2',
        email: 'driver2@test.com',
        createdByAdmin: false,
        createdAt: new Date(),
      } as DriverUser);

      const result = await AuthService.loginWithRole('driver2@test.com', 'driver');

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.auth.adminCreatedDriverOnly);
    });

    it('should handle errors during role-based login', async () => {
      jest.spyOn(LocalStorageService, 'getUsers').mockRejectedValue(new Error('Database error'));

      const result = await AuthService.loginWithRole('customer@test.com', 'customer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      await LocalStorageService.saveUser({
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User);
    });

    it('should successfully logout current user', async () => {
      await AuthService.logout();

      const currentUser = await LocalStorageService.getCurrentUser();
      expect(currentUser).toBeNull();
    });

    it('should log logout event', async () => {
      const logSpy = jest.spyOn(securityLogger, 'log');

      await AuthService.logout();

      expect(logSpy).toHaveBeenCalled();
    });

    it('should handle errors during logout', async () => {
      jest.spyOn(LocalStorageService, 'getCurrentUser').mockRejectedValue(new Error('Storage error'));

      await expect(AuthService.logout()).rejects.toThrow('Storage error');
    });
  });

  describe('getCurrentUserData', () => {
    beforeEach(async () => {
      const userData = {
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User;
      await LocalStorageService.saveUser(userData);
      await LocalStorageService.saveUserToCollection(userData);
    });

    it('should return current user from session', async () => {
      const user = await AuthService.getCurrentUserData();

      expect(user).toBeDefined();
      expect(user?.email).toBe('customer@test.com');
    });

    it('should return user by id when provided', async () => {
      const user = await AuthService.getCurrentUserData('customer-1');

      expect(user).toBeDefined();
      expect(user?.id).toBe('customer-1');
    });

    it('should return null when no user in session', async () => {
      await LocalStorageService.removeUser();

      const user = await AuthService.getCurrentUserData();

      expect(user).toBeNull();
    });

    it('should return null when user not found by id', async () => {
      const user = await AuthService.getCurrentUserData('non-existent');

      expect(user).toBeNull();
    });

    it('should return null on error', async () => {
      jest.spyOn(LocalStorageService, 'getCurrentUser').mockRejectedValue(new Error('Error'));

      const user = await AuthService.getCurrentUserData();

      expect(user).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User);
      userId = 'customer-1';
    });

    it('should successfully update user profile', async () => {
      await AuthService.updateUserProfile(userId, {
        name: 'Updated Name',
        phone: '9999999999',
      });

      const updatedUser = await LocalStorageService.getUserById(userId);
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.phone).toBe('9999999999');
    });

    it('should update current session when updating logged-in user', async () => {
      await LocalStorageService.saveUser({
        ...mockCustomerUser,
        id: userId,
        createdAt: new Date(),
      } as User);

      await AuthService.updateUserProfile(userId, {
        name: 'Updated Name',
      });

      const sessionUser = await LocalStorageService.getCurrentUser();
      expect(sessionUser?.name).toBe('Updated Name');
    });

    it('should not allow updating id', async () => {
      await AuthService.updateUserProfile(userId, {
        id: 'new-id',
      } as Partial<User>);

      const user = await LocalStorageService.getUserById(userId);
      expect(user?.id).toBe(userId);
    });

    it('should not allow updating role', async () => {
      await AuthService.updateUserProfile(userId, {
        role: 'admin',
      } as Partial<User>);

      const user = await LocalStorageService.getUserById(userId);
      expect(user?.role).toBe('customer');
    });

    it('should throw error when user not found', async () => {
      await expect(
        AuthService.updateUserProfile('non-existent', { name: 'Test' })
      ).rejects.toThrow('User not found');
    });

    it('should handle errors during update', async () => {
      jest.spyOn(LocalStorageService, 'getUserById').mockRejectedValue(new Error('Database error'));

      await expect(
        AuthService.updateUserProfile(userId, { name: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('initializeApp', () => {
    it('should initialize app successfully', async () => {
      await expect(AuthService.initializeApp()).resolves.not.toThrow();
    });

    it('should handle errors during initialization', async () => {
      jest.spyOn(LocalStorageService, 'initializeSampleData').mockRejectedValue(new Error('Init error'));

      await expect(AuthService.initializeApp()).resolves.not.toThrow();
    });
  });
});

