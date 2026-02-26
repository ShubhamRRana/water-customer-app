import { create } from 'zustand';
import { User, UserRole } from '../types';
import { UserService } from '../services/user.service';
import { handleError } from '../utils/errorHandler';
import { ErrorSeverity } from '../utils/errorLogger';
import { getErrorMessage } from '../utils/errors';

interface UserState {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;
  unsubscribeAllUsers: (() => void) | null;
  
  // Actions
  fetchAllUsers: (adminId?: string) => Promise<void>;
  fetchUsersByRole: (role: UserRole) => Promise<void>;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  setSelectedUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  subscribeToAllUsers: () => void;
  unsubscribeFromAllUsers: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  selectedUser: null,
  isLoading: false,
  error: null,
  unsubscribeAllUsers: null,

  fetchAllUsers: async (adminId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await UserService.getAllUsers(adminId);
      set({ users, isLoading: false });
    } catch (error) {
      handleError(error, {
        context: { operation: 'fetchAllUsers' },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to fetch users');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchUsersByRole: async (role) => {
    set({ isLoading: true, error: null });
    try {
      const users = await UserService.getUsersByRole(role);
      set({ users, isLoading: false });
    } catch (error) {
      handleError(error, {
        context: { operation: 'fetchUsersByRole', role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to fetch users by role');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  addUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const newUser = await UserService.createUser(userData);
      
      // Update local state
      const { users } = get();
      set({ users: [...users, newUser], isLoading: false });
    } catch (error) {
      handleError(error, {
        context: { operation: 'addUser', userData: { email: userData.email, role: userData.role } },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to add user');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    set({ isLoading: true, error: null });
    try {
      await UserService.updateUser(userId, updates);
      
      // Update local state
      const { users } = get();
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      );
      set({ users: updatedUsers, isLoading: false });
    } catch (error) {
      handleError(error, {
        context: { operation: 'updateUser', userId },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to update user');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await UserService.deleteUser(userId);
      
      // Update local state
      const { users } = get();
      const updatedUsers = users.filter(user => user.id !== userId);
      set({ 
        users: updatedUsers, 
        selectedUser: get().selectedUser?.id === userId ? null : get().selectedUser,
        isLoading: false 
      });
    } catch (error) {
      handleError(error, {
        context: { operation: 'deleteUser', userId },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      const errorMessage = getErrorMessage(error, 'Failed to delete user');
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  subscribeToAllUsers: () => {
    const { unsubscribeAllUsers } = get();
    // Clean up existing subscription if any
    if (unsubscribeAllUsers) {
      unsubscribeAllUsers();
    }

    const unsubscribe = UserService.subscribeToAllUsersUpdates((users) => {
      set({ users });
    });

    set({ unsubscribeAllUsers: unsubscribe });
  },

  unsubscribeFromAllUsers: () => {
    const { unsubscribeAllUsers } = get();
    if (unsubscribeAllUsers) {
      unsubscribeAllUsers();
      set({ unsubscribeAllUsers: null });
    }
  },

  setSelectedUser: (user) => {
    set({ selectedUser: user });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
