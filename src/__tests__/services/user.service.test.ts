/**
 * User Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserService } from '../../services/user.service';
import { LocalStorageService } from '../../services/localStorage';
import { User, UserRole } from '../../types';

// Clear AsyncStorage before each test
beforeEach(async () => {
  await AsyncStorage.clear();
});

// Restore all mocks after each test to prevent mock leakage
afterEach(() => {
  jest.restoreAllMocks();
});

describe('UserService', () => {
  const mockCustomerUser: Omit<User, 'id' | 'createdAt'> = {
    email: 'customer@test.com',
    password: 'hashed-password',
    name: 'Test Customer',
    phone: '1234567890',
    role: 'customer',
  };

  const mockDriverUser: Omit<User, 'id' | 'createdAt'> = {
    email: 'driver@test.com',
    password: 'hashed-password',
    name: 'Test Driver',
    phone: '9876543210',
    role: 'driver',
    licenseNumber: 'DL123456',
    vehicleNumber: 'ABC123',
  };

  const mockAdminUser: Omit<User, 'id' | 'createdAt'> = {
    email: 'admin@test.com',
    password: 'hashed-password',
    name: 'Test Admin',
    role: 'admin',
    businessName: 'Test Business',
  };

  describe('getUsersTableIdByAuthId', () => {
    beforeEach(async () => {
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'user-1',
        createdAt: new Date(),
      } as User);
    });

    it('should return id when user exists', async () => {
      const id = await UserService.getUsersTableIdByAuthId('user-1');
      
      expect(id).toBe('user-1');
    });

    it('should return null when user does not exist', async () => {
      const id = await UserService.getUsersTableIdByAuthId('non-existent');
      
      expect(id).toBeNull();
    });

    it('should return null when LocalStorageService throws error', async () => {
      jest.spyOn(LocalStorageService, 'getUserById').mockRejectedValue(new Error('Error'));
      
      const id = await UserService.getUsersTableIdByAuthId('user-1');
      
      expect(id).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'user-1',
        createdAt: new Date(),
      } as User);
      await LocalStorageService.saveUserToCollection({
        ...mockDriverUser,
        id: 'user-2',
        createdAt: new Date(),
      } as User);
    });

    it('should return all users', async () => {
      const users = await UserService.getAllUsers();
      
      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users.some(u => u.role === 'customer')).toBe(true);
      expect(users.some(u => u.role === 'driver')).toBe(true);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getUsers').mockRejectedValue(new Error('Fetch error'));
      
      await expect(UserService.getAllUsers()).rejects.toThrow('Fetch error');
    });
  });

  describe('getUsersByRole', () => {
    beforeEach(async () => {
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'customer-1',
        createdAt: new Date(),
      } as User);
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'customer-2',
        email: 'customer2@test.com',
        createdAt: new Date(),
      } as User);
      await LocalStorageService.saveUserToCollection({
        ...mockDriverUser,
        id: 'driver-1',
        createdAt: new Date(),
      } as User);
    });

    it('should return only customers when filtering by customer role', async () => {
      const users = await UserService.getUsersByRole('customer');
      
      expect(users.length).toBe(2);
      users.forEach(user => {
        expect(user.role).toBe('customer');
      });
    });

    it('should return only drivers when filtering by driver role', async () => {
      const users = await UserService.getUsersByRole('driver');
      
      expect(users.length).toBe(1);
      expect(users[0].role).toBe('driver');
    });

    it('should return empty array when no users with role exist', async () => {
      const users = await UserService.getUsersByRole('admin');
      
      expect(users).toHaveLength(0);
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getUsers').mockRejectedValue(new Error('Fetch error'));
      
      await expect(UserService.getUsersByRole('customer')).rejects.toThrow('Fetch error');
    });
  });

  describe('getUserById', () => {
    beforeEach(async () => {
      await LocalStorageService.saveUserToCollection({
        ...mockCustomerUser,
        id: 'user-1',
        createdAt: new Date(),
      } as User);
    });

    it('should return user by id', async () => {
      const user = await UserService.getUserById('user-1');
      
      expect(user).toBeTruthy();
      expect(user?.id).toBe('user-1');
      expect(user?.email).toBe('customer@test.com');
    });

    it('should return null for non-existent user', async () => {
      const user = await UserService.getUserById('non-existent');
      
      expect(user).toBeNull();
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getUserById').mockRejectedValue(new Error('Fetch error'));
      
      await expect(UserService.getUserById('user-1')).rejects.toThrow('Fetch error');
    });
  });

  describe('createUser', () => {
    it('should create a new user with generated id', async () => {
      const user = await UserService.createUser(mockCustomerUser);
      
      expect(user.id).toBeTruthy();
      expect(typeof user.id).toBe('string');
      expect(user.email).toBe(mockCustomerUser.email);
      expect(user.role).toBe(mockCustomerUser.role);
      expect(user.createdAt).toBeInstanceOf(Date);
      
      const savedUser = await LocalStorageService.getUserById(user.id);
      expect(savedUser).toBeTruthy();
    });

    it('should create driver user with driver-specific fields', async () => {
      const user = await UserService.createUser(mockDriverUser);
      
      expect(user.role).toBe('driver');
      expect((user as any).licenseNumber).toBe('DL123456');
      expect((user as any).vehicleNumber).toBe('ABC123');
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'saveUserToCollection').mockRejectedValue(new Error('Save error'));
      
      await expect(UserService.createUser(mockCustomerUser)).rejects.toThrow('Save error');
    });
  });

  describe('updateUser', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await UserService.createUser(mockCustomerUser);
      userId = user.id;
    });

    it('should update user profile', async () => {
      const updates = { name: 'Updated Name', phone: '9999999999' };
      await UserService.updateUser(userId, updates);
      
      const updatedUser = await LocalStorageService.getUserById(userId);
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.phone).toBe('9999999999');
    });

    it('should not allow updating id', async () => {
      const updates = { id: 'new-id' } as Partial<User>;
      await UserService.updateUser(userId, updates);
      
      const user = await LocalStorageService.getUserById(userId);
      expect(user?.id).toBe(userId);
    });

    it('should not allow updating role', async () => {
      const updates = { role: 'admin' as UserRole };
      await UserService.updateUser(userId, updates);
      
      const user = await LocalStorageService.getUserById(userId);
      expect(user?.role).toBe('customer');
    });

    it('should throw error when user does not exist', async () => {
      await expect(UserService.updateUser('non-existent', { name: 'Test' })).rejects.toThrow('User not found');
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getUserById').mockRejectedValue(new Error('Fetch error'));
      
      await expect(UserService.updateUser(userId, { name: 'Test' })).rejects.toThrow('Fetch error');
    });
  });

  describe('deleteUser', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await UserService.createUser(mockCustomerUser);
      userId = user.id;
    });

    it('should delete user by id', async () => {
      await UserService.deleteUser(userId);
      
      const user = await LocalStorageService.getUserById(userId);
      expect(user).toBeNull();
    });

    it('should not throw error when deleting non-existent user', async () => {
      await expect(UserService.deleteUser('non-existent')).resolves.not.toThrow();
    });

    it('should throw error when LocalStorageService fails', async () => {
      jest.spyOn(LocalStorageService, 'getUsers').mockRejectedValue(new Error('Fetch error'));
      
      await expect(UserService.deleteUser(userId)).rejects.toThrow('Fetch error');
    });
  });

  describe('subscribeToUserUpdates', () => {
    it('should return a no-op unsubscribe function', () => {
      const unsubscribe = UserService.subscribeToUserUpdates('user-1', () => {});
      
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('subscribeToAllUsersUpdates', () => {
    it('should return a no-op unsubscribe function', () => {
      const unsubscribe = UserService.subscribeToAllUsersUpdates(() => {});
      
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});

