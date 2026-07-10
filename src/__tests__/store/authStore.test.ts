/**
 * Auth Store Tests
 */

jest.mock('../../lib/supabaseClient');

import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../services/auth.service';
import { supabase } from '../../lib/supabaseClient';
import { isInvalidRefreshTokenError } from '../../utils/authErrors';
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
      pendingLoginRole: null,
      needsPasswordReset: false,
      customerAccountKind: null,
      showPostRegisterWelcome: false,
    });
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockReset();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'mock-token',
        },
      },
      error: null,
    });
    (supabase.auth.signOut as jest.Mock).mockReset();
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
  });

  describe('isInvalidRefreshTokenError', () => {
    it('returns true for Invalid Refresh Token message', () => {
      expect(isInvalidRefreshTokenError(new Error('Invalid Refresh Token: Refresh Token Not Found'))).toBe(true);
    });

    it('returns true for Refresh Token Not Found substring', () => {
      expect(isInvalidRefreshTokenError(new Error('Refresh Token Not Found'))).toBe(true);
    });

    it('returns true for refresh_token_not_found code', () => {
      expect(isInvalidRefreshTokenError({ code: 'refresh_token_not_found', message: 'x' })).toBe(true);
    });

    it('returns true for invalid_grant code', () => {
      expect(isInvalidRefreshTokenError({ code: 'invalid_grant' })).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isInvalidRefreshTokenError(new Error('Network request failed'))).toBe(false);
      expect(isInvalidRefreshTokenError(null)).toBe(false);
    });
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

    it('should clear local session and finish logged out when getSession returns invalid refresh error', async () => {
      (AuthService.initializeApp as jest.Mock).mockResolvedValue(undefined);
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid Refresh Token: Refresh Token Not Found' },
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await useAuthStore.getState().initializeAuth();

      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(AuthService.getCurrentUserData).not.toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should clear local session when getSession throws invalid refresh error', async () => {
      (AuthService.initializeApp as jest.Mock).mockResolvedValue(undefined);
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(
        new Error('Invalid Refresh Token: Refresh Token Not Found')
      );
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await useAuthStore.getState().initializeAuth();

      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(AuthService.getCurrentUserData).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
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
        'customer',
        '9876543210'
      );

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.showPostRegisterWelcome).toBe(true);
    });

    it('should return needsEmailConfirmation without setting user or welcome flag', async () => {
      (AuthService.register as jest.Mock).mockResolvedValue({
        success: true,
        needsEmailConfirmation: true,
      });

      const result = await useAuthStore.getState().register(
        'test@example.com',
        'password',
        'Test User',
        'customer',
        '9876543210'
      );

      expect(result).toEqual({ needsEmailConfirmation: true });
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.showPostRegisterWelcome).toBe(false);
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
          'customer',
          '9876543210'
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
      expect(state.showPostRegisterWelcome).toBe(false);
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

  describe('updateSavedAddresses', () => {
    const addresses = [
      {
        id: 'addr-1',
        address: '123 Main Street, Example City',
        latitude: 28.6,
        longitude: 77.2,
        isDefault: true,
      },
    ];

    it('should persist saved addresses for customer users', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        savedAddresses: [],
        createdAt: new Date(),
      };

      useAuthStore.setState({ user: mockUser, customerAccountKind: 'individual' });
      (AuthService.updateCustomerSavedAddresses as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().updateSavedAddresses(addresses);

      const state = useAuthStore.getState();
      expect(state.user?.savedAddresses).toEqual(addresses);
      expect(state.isLoading).toBe(false);
      expect(AuthService.updateCustomerSavedAddresses).toHaveBeenCalledWith(
        'user-1',
        addresses,
        'individual'
      );
    });

    it('should reject saved address updates for non-customer users', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'admin',
        createdAt: new Date(),
      };

      useAuthStore.setState({ user: mockUser });

      await expect(
        useAuthStore.getState().updateSavedAddresses(addresses)
      ).rejects.toThrow('Only customer accounts can save addresses.');
    });
  });

  describe('refreshUserProfile', () => {
    it('should no-op when there is no user', async () => {
      await useAuthStore.getState().refreshUserProfile();
      expect(AuthService.getCurrentUserData).not.toHaveBeenCalled();
    });

    it('should update user when fetch returns data', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };
      const refreshed: User = { ...mockUser, name: 'Refreshed' };
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      (AuthService.getCurrentUserData as jest.Mock).mockResolvedValue(refreshed);

      await useAuthStore.getState().refreshUserProfile();

      expect(AuthService.getCurrentUserData).toHaveBeenCalledWith('user-1');
      expect(useAuthStore.getState().user?.name).toBe('Refreshed');
    });

    it('should leave user unchanged when fetch returns null', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
        createdAt: new Date(),
      };
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      (AuthService.getCurrentUserData as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().refreshUserProfile();

      expect(useAuthStore.getState().user?.name).toBe('Test User');
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

