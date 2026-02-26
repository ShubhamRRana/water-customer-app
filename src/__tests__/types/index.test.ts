/**
 * Type Definitions Tests
 * Tests for type guards and utility types
 */

import {
  UserRole,
  User,
  CustomerUser,
  DriverUser,
  AdminUser,
  isCustomerUser,
  isDriverUser,
  isAdminUser,
} from '../../types/index';

describe('Type Guards', () => {
  describe('isCustomerUser', () => {
    it('should return true for customer user', () => {
      const customer: CustomerUser = {
        id: '1',
        email: 'customer@test.com',
        password: 'hashed',
        name: 'Test Customer',
        role: 'customer',
        createdAt: new Date(),
      };
      expect(isCustomerUser(customer)).toBe(true);
    });

    it('should return false for driver user', () => {
      const driver: DriverUser = {
        id: '2',
        email: 'driver@test.com',
        password: 'hashed',
        name: 'Test Driver',
        role: 'driver',
        createdAt: new Date(),
      };
      expect(isCustomerUser(driver)).toBe(false);
    });

    it('should return false for admin user', () => {
      const admin: AdminUser = {
        id: '3',
        email: 'admin@test.com',
        password: 'hashed',
        name: 'Test Admin',
        role: 'admin',
        createdAt: new Date(),
      };
      expect(isCustomerUser(admin)).toBe(false);
    });

    it('should narrow type correctly in TypeScript', () => {
      const user: User = {
        id: '1',
        email: 'customer@test.com',
        password: 'hashed',
        name: 'Test Customer',
        role: 'customer',
        createdAt: new Date(),
      };

      if (isCustomerUser(user)) {
        // TypeScript should know this is CustomerUser
        expect(user.role).toBe('customer');
        // CustomerUser specific properties should be accessible
        expect(user.savedAddresses).toBeUndefined();
      }
    });
  });

  describe('isDriverUser', () => {
    it('should return true for driver user', () => {
      const driver: DriverUser = {
        id: '2',
        email: 'driver@test.com',
        password: 'hashed',
        name: 'Test Driver',
        role: 'driver',
        createdAt: new Date(),
      };
      expect(isDriverUser(driver)).toBe(true);
    });

    it('should return false for customer user', () => {
      const customer: CustomerUser = {
        id: '1',
        email: 'customer@test.com',
        password: 'hashed',
        name: 'Test Customer',
        role: 'customer',
        createdAt: new Date(),
      };
      expect(isDriverUser(customer)).toBe(false);
    });

    it('should return false for admin user', () => {
      const admin: AdminUser = {
        id: '3',
        email: 'admin@test.com',
        password: 'hashed',
        name: 'Test Admin',
        role: 'admin',
        createdAt: new Date(),
      };
      expect(isDriverUser(admin)).toBe(false);
    });

    it('should narrow type correctly in TypeScript', () => {
      const user: User = {
        id: '2',
        email: 'driver@test.com',
        password: 'hashed',
        name: 'Test Driver',
        role: 'driver',
        createdAt: new Date(),
      };

      if (isDriverUser(user)) {
        // TypeScript should know this is DriverUser
        expect(user.role).toBe('driver');
        // DriverUser specific properties should be accessible
        expect(user.vehicleNumber).toBeUndefined();
      }
    });
  });

  describe('isAdminUser', () => {
    it('should return true for admin user', () => {
      const admin: AdminUser = {
        id: '3',
        email: 'admin@test.com',
        password: 'hashed',
        name: 'Test Admin',
        role: 'admin',
        createdAt: new Date(),
      };
      expect(isAdminUser(admin)).toBe(true);
    });

    it('should return false for customer user', () => {
      const customer: CustomerUser = {
        id: '1',
        email: 'customer@test.com',
        password: 'hashed',
        name: 'Test Customer',
        role: 'customer',
        createdAt: new Date(),
      };
      expect(isAdminUser(customer)).toBe(false);
    });

    it('should return false for driver user', () => {
      const driver: DriverUser = {
        id: '2',
        email: 'driver@test.com',
        password: 'hashed',
        name: 'Test Driver',
        role: 'driver',
        createdAt: new Date(),
      };
      expect(isAdminUser(driver)).toBe(false);
    });

    it('should narrow type correctly in TypeScript', () => {
      const user: User = {
        id: '3',
        email: 'admin@test.com',
        password: 'hashed',
        name: 'Test Admin',
        role: 'admin',
        createdAt: new Date(),
      };

      if (isAdminUser(user)) {
        // TypeScript should know this is AdminUser
        expect(user.role).toBe('admin');
        // AdminUser specific properties should be accessible
        expect(user.businessName).toBeUndefined();
      }
    });
  });

  describe('Type guard combinations', () => {
    it('should correctly identify all user types', () => {
      const customer: User = {
        id: '1',
        email: 'customer@test.com',
        password: 'hashed',
        name: 'Test Customer',
        role: 'customer',
        createdAt: new Date(),
      };

      const driver: User = {
        id: '2',
        email: 'driver@test.com',
        password: 'hashed',
        name: 'Test Driver',
        role: 'driver',
        createdAt: new Date(),
      };

      const admin: User = {
        id: '3',
        email: 'admin@test.com',
        password: 'hashed',
        name: 'Test Admin',
        role: 'admin',
        createdAt: new Date(),
      };

      expect(isCustomerUser(customer)).toBe(true);
      expect(isDriverUser(customer)).toBe(false);
      expect(isAdminUser(customer)).toBe(false);

      expect(isCustomerUser(driver)).toBe(false);
      expect(isDriverUser(driver)).toBe(true);
      expect(isAdminUser(driver)).toBe(false);

      expect(isCustomerUser(admin)).toBe(false);
      expect(isDriverUser(admin)).toBe(false);
      expect(isAdminUser(admin)).toBe(true);
    });
  });

  describe('UserRole type', () => {
    it('should accept valid user roles', () => {
      const roles: UserRole[] = ['customer', 'driver', 'admin'];
      roles.forEach(role => {
        expect(['customer', 'driver', 'admin']).toContain(role);
      });
    });
  });

  describe('User type union', () => {
    it('should accept customer user', () => {
      const user: User = {
        id: '1',
        email: 'customer@test.com',
        password: 'hashed',
        name: 'Test Customer',
        role: 'customer',
        createdAt: new Date(),
      };
      expect(user.role).toBe('customer');
    });

    it('should accept driver user', () => {
      const user: User = {
        id: '2',
        email: 'driver@test.com',
        password: 'hashed',
        name: 'Test Driver',
        role: 'driver',
        createdAt: new Date(),
      };
      expect(user.role).toBe('driver');
    });

    it('should accept admin user', () => {
      const user: User = {
        id: '3',
        email: 'admin@test.com',
        password: 'hashed',
        name: 'Test Admin',
        role: 'admin',
        createdAt: new Date(),
      };
      expect(user.role).toBe('admin');
    });

    it('should have common base properties for all user types', () => {
      const users: User[] = [
        {
          id: '1',
          email: 'customer@test.com',
          password: 'hashed',
          name: 'Test Customer',
          role: 'customer',
          createdAt: new Date(),
        },
        {
          id: '2',
          email: 'driver@test.com',
          password: 'hashed',
          name: 'Test Driver',
          role: 'driver',
          createdAt: new Date(),
        },
        {
          id: '3',
          email: 'admin@test.com',
          password: 'hashed',
          name: 'Test Admin',
          role: 'admin',
          createdAt: new Date(),
        },
      ];

      users.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('password');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('createdAt');
        expect(typeof user.id).toBe('string');
        expect(typeof user.email).toBe('string');
        expect(typeof user.name).toBe('string');
        expect(['customer', 'driver', 'admin']).toContain(user.role);
        expect(user.createdAt).toBeInstanceOf(Date);
      });
    });
  });
});

