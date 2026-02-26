/**
 * Auth Store Tests
 */

import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../types';

// Mock the AuthService
jest.mock('../../services/auth.service');

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      unsubscribeAuth: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.unsubscribeAuth).toBeNull();
    });
  });

  describe('initializeAuth', () => {
    it('should initialize auth and set user when user exists', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };

      (AuthService.initializeApp as jest.Mock).mockResolvedValue(undefined);
      (AuthService.getCurrentUserData as jest.Mock).mockResolvedValue(mockUser);

      await useAuthStore.getState().initializeAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(AuthService.initializeApp).toHaveBeenCalled();
      expect(AuthService.getCurrentUserData).toHaveBeenCalled();
    });

    it('should set isAuthenticated to false when no user exists', async () => {
      (AuthService.initializeApp as jest.Mock).mockResolvedValue(undefined);
      (AuthService.getCurrentUserData as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().initializeAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should handle errors during initialization silently', async () => {
      (AuthService.initializeApp as jest.Mock).mockRejectedValue(new Error('Init error'));

      // initializeAuth catches errors and doesn't rethrow them
      await useAuthStore.getState().initializeAuth();

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully and set user', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };

      (AuthService.login as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      await useAuthStore.getState().login('test@example.com', 'password');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should throw error when role selection is required', async () => {
      (AuthService.login as jest.Mock).mockResolvedValue({
        success: true,
        requiresRoleSelection: true,
      });

      await expect(
        useAuthStore.getState().login('test@example.com', 'password')
      ).rejects.toThrow('ROLE_SELECTION_REQUIRED');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should handle login failure', async () => {
      (AuthService.login as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      await expect(
        useAuthStore.getState().login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle login errors', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        useAuthStore.getState().login('test@example.com', 'password')
      ).rejects.toThrow('Network error');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loginWithRole', () => {
    it('should login with role successfully', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'driver',
        createdAt: new Date(),
      };

      (AuthService.loginWithRole as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      await useAuthStore.getState().loginWithRole('test@example.com', 'driver');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should handle login with role failure', async () => {
      (AuthService.loginWithRole as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Role selection failed',
      });

      await expect(
        useAuthStore.getState().loginWithRole('test@example.com', 'driver')
      ).rejects.toThrow('Role selection failed');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully and set user', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };

      (AuthService.register as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      await useAuthStore.getState().register(
        'test@example.com',
        'password',
        'Test User',
        'customer'
      );

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should handle registration failure', async () => {
      (AuthService.register as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      await expect(
        useAuthStore.getState().register(
          'test@example.com',
          'password',
          'Test User',
          'customer'
        )
      ).rejects.toThrow('Email already exists');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };

      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(AuthService.logout).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      (AuthService.logout as jest.Mock).mockRejectedValue(new Error('Logout error'));

      await expect(useAuthStore.getState().logout()).rejects.toThrow('Logout error');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };

      useAuthStore.setState({ user: mockUser });
      (AuthService.updateUserProfile as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().updateUser({ name: 'Updated Name' });

      const state = useAuthStore.getState();
      expect(state.user?.name).toBe('Updated Name');
      expect(state.isLoading).toBe(false);
      expect(AuthService.updateUserProfile).toHaveBeenCalledWith('user-1', { name: 'Updated Name' });
    });

    it('should not update when no user is logged in', async () => {
      useAuthStore.setState({ user: null });

      await useAuthStore.getState().updateUser({ name: 'Updated Name' });

      expect(AuthService.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };

      useAuthStore.setState({ user: mockUser });
      (AuthService.updateUserProfile as jest.Mock).mockRejectedValue(new Error('Update error'));

      await expect(
        useAuthStore.getState().updateUser({ name: 'Updated Name' })
      ).rejects.toThrow('Update error');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and update isAuthenticated', () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };

      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set user to null and update isAuthenticated', () => {
      useAuthStore.getState().setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true);

      expect(useAuthStore.getState().isLoading).toBe(true);

      useAuthStore.getState().setLoading(false);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('subscribeToAuthChanges', () => {
    it('should clean up existing subscription before creating new one', () => {
      const mockUnsubscribe = jest.fn();
      useAuthStore.setState({ unsubscribeAuth: mockUnsubscribe });

      useAuthStore.getState().subscribeToAuthChanges();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().unsubscribeAuth).toBeDefined();
    });

    it('should set unsubscribe function', () => {
      useAuthStore.getState().subscribeToAuthChanges();

      expect(useAuthStore.getState().unsubscribeAuth).toBeDefined();
      expect(typeof useAuthStore.getState().unsubscribeAuth).toBe('function');
    });
  });

  describe('unsubscribeFromAuthChanges', () => {
    it('should call unsubscribe and clear it', () => {
      const mockUnsubscribe = jest.fn();
      useAuthStore.setState({ unsubscribeAuth: mockUnsubscribe });

      useAuthStore.getState().unsubscribeFromAuthChanges();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().unsubscribeAuth).toBeNull();
    });

    it('should handle when no subscription exists', () => {
      useAuthStore.setState({ unsubscribeAuth: null });

      expect(() => {
        useAuthStore.getState().unsubscribeFromAuthChanges();
      }).not.toThrow();

      expect(useAuthStore.getState().unsubscribeAuth).toBeNull();
    });
  });
});

