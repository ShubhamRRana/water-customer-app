// src/services/user.service.ts

import { dataAccess } from '../lib';
import { User, UserRole, isDriverUser, isCustomerUser, isAdminUser } from '../types/index';
import { handleAsyncOperationWithRethrow, handleError } from '../utils/errorHandler';

/**
 * UserService - Handles user management operations for admin users
 * 
 * Note: Authentication operations are handled by AuthService.
 * This service is for admin operations like fetching all users, managing user profiles, etc.
 * Uses the data access layer (Supabase) for data persistence.
 */
export class UserService {
  /**
   * Helper function to convert auth_id to users table id
   * In Supabase, the auth user ID is the same as the users table id
   */
  static async getUsersTableIdByAuthId(authId: string): Promise<string | null> {
    try {
      const user = await dataAccess.users.getUserById(authId);
      return user ? user.id : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all users from the data access layer.
   * When adminId is provided (e.g. admin viewing driver list), only drivers created by that admin are included.
   */
  static async getAllUsers(adminId?: string): Promise<User[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const users = await dataAccess.users.getUsers(
          adminId ? { createdByAdminId: adminId } : undefined
        );
        return users;
      },
      {
        context: { operation: 'getAllUsers', adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const allUsers = await dataAccess.users.getUsers();
        return allUsers.filter(u => u.role === role);
      },
      {
        context: { operation: 'getUsersByRole', role },
        userFacing: false,
      }
    );
  }

  /**
   * Get a single user by id (primary key for fetching users)
   */
  static async getUserById(id: string): Promise<User | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const user = await dataAccess.users.getUserById(id);
        return user;
      },
      {
        context: { operation: 'getUserById', id },
        userFacing: false,
      }
    );
  }

  /**
   * Batch fetch users by IDs - eliminates N+1 query problem
   * Returns a Map of userId -> User for O(1) lookup
   */
  static async getUsersByIds(userIds: string[]): Promise<Map<string, User>> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const allUsers = await dataAccess.users.getUsers();
        const userMap = new Map<string, User>();
        userIds.forEach(id => {
          const user = allUsers.find(u => u.id === id);
          if (user) {
            userMap.set(id, user);
          }
        });
        return userMap;
      },
      {
        context: { operation: 'getUsersByIds', userIdCount: userIds.length },
        userFacing: false,
      }
    );
  }

  /**
   * Create a new user (typically used by admin to create drivers)
   * Note: This creates the user profile only. Auth account should be created via AuthService.register()
   */
  static async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const id = dataAccess.generateId();
        const newUser: User = {
          ...userData,
          id,
          createdAt: new Date(),
        };

        await dataAccess.users.saveUserToCollection(newUser);
        return newUser;
      },
      {
        context: { operation: 'createUser', role: userData.role },
        userFacing: false,
      }
    );
  }

  /**
   * Update user profile by id
   */
  static async updateUser(id: string, updates: Partial<User>): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const currentUser = await dataAccess.users.getUserById(id);
        
        if (!currentUser) {
          throw new Error('User not found');
        }

        // Merge updates (excluding id and role)
        const { id: userId, role, ...allowedUpdates } = updates;
        const updatedUser = { ...currentUser, ...allowedUpdates };

        await dataAccess.users.updateUserProfile(id, updatedUser);
      },
      {
        context: { operation: 'updateUser', id },
        userFacing: false,
      }
    );
  }

  /**
   * Delete a user by id (admin only).
   * Dispatches to the appropriate data-access delete based on user role (driver, customer, admin).
   */
  static async deleteUser(id: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const user = await dataAccess.users.getUserById(id);
        if (!user) {
          throw new Error('User not found');
        }
        if (isDriverUser(user)) {
          await dataAccess.users.deleteDriverAccount(id);
        } else if (isCustomerUser(user)) {
          await dataAccess.users.deleteCustomerAccount(id);
        } else if (isAdminUser(user)) {
          await dataAccess.users.deleteAdminAccount(id);
        } else {
          throw new Error('Unknown user role');
        }
      },
      {
        context: { operation: 'deleteUser', id },
        userFacing: false,
      }
    );
  }

  /**
   * Subscribe to real-time user updates by id
   */
  static subscribeToUserUpdates(
    id: string,
    callback: (user: User | null) => void
  ): () => void {
    return dataAccess.users.subscribeToUserUpdates(id, callback);
  }

  /**
   * Subscribe to real-time updates for all users (admin only)
   * Maintains a local array of all users and provides it to the callback
   */
  static subscribeToAllUsersUpdates(
    callback: (users: User[]) => void
  ): () => void {
    // Maintain local state of all users
    let allUsers: User[] = [];
    let isInitialized = false;

    // Initialize by fetching all users
    dataAccess.users.getUsers().then(users => {
      allUsers = users;
      isInitialized = true;
      callback([...allUsers]);
    }).catch(error => {
      handleError(error, {
        context: { operation: 'subscribeToAllUsersUpdates', phase: 'initialization' },
        userFacing: false,
      });
      isInitialized = true;
      callback([]);
    });

    // Subscribe to individual user changes and update the array
    const unsubscribe = dataAccess.users.subscribeToAllUsersUpdates(
      (user: User | null, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
        if (!isInitialized) return;

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (user) {
            const index = allUsers.findIndex(u => u.id === user.id);
            if (index >= 0) {
              allUsers[index] = user;
            } else {
              allUsers.push(user);
            }
            callback([...allUsers]);
          }
        } else if (eventType === 'DELETE') {
          // For DELETE, we need to refetch all users since we don't get the user ID
          // Alternatively, we could track the deleted user ID, but refetching is safer
          dataAccess.users.getUsers().then(users => {
            allUsers = users;
            callback([...allUsers]);
          }).catch(error => {
            handleError(error, {
              context: { operation: 'subscribeToAllUsersUpdates', phase: 'refetchAfterDelete' },
              userFacing: false,
            });
          });
        }
      }
    );

    return unsubscribe;
  }
}
