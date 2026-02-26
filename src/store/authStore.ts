import { create } from 'zustand';
import { User, UserRole, AdminUser } from '../types/index';
import { AuthService } from '../services/auth.service';
import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';
import { ErrorSeverity } from '../utils/errorLogger';

/** Returns true if the error is a network failure (e.g. device can't reach Supabase). */
function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Network request failed') return true;
  const msg = error && typeof (error as Error).message === 'string' ? (error as Error).message : '';
  return msg.includes('Network request failed') || msg.includes('network') || msg.includes('fetch failed');
}

/**
 * Authentication store state interface
 * 
 * Manages user authentication state, loading states, and authentication operations.
 * Uses Zustand for state management.
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  unsubscribeAuth: (() => void) | null;
  /** Role-specific login in progress - prevents auth listener from overriding role */
  pendingLoginRole: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithRole: (email: string, role: UserRole) => Promise<void>;
  loginWithCredentialsAndRole: (email: string, password: string, role: UserRole) => Promise<void>;
  setPendingLoginRole: (role: UserRole | null) => void;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    phone: string,
    businessName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  subscribeToAuthChanges: () => void;
  unsubscribeFromAuthChanges: () => void;
}

/**
 * Authentication store using Zustand
 * 
 * Provides global authentication state management including:
 * - User data and authentication status
 * - Login, logout, and registration operations
 * - User profile updates
 * - Real-time auth state subscriptions (placeholder for Supabase)
 * 
 * @example
 * ```tsx
 * const { user, login, logout, isAuthenticated } = useAuthStore();
 * 
 * await login('user@example.com', 'password');
 * ```
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  unsubscribeAuth: null,
  pendingLoginRole: null,

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      await AuthService.initializeApp();

      let session = null;
      try {
        const result = await supabase.auth.getSession();
        session = result.data?.session ?? null;
      } catch (sessionError) {
        if (isNetworkFailure(sessionError)) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          get().subscribeToAuthChanges();
          return;
        }
        throw sessionError;
      }

      if (session?.user) {
        let userData = null;
        try {
          userData = await AuthService.getCurrentUserData(session.user.id);
        } catch (userError) {
          if (isNetworkFailure(userError)) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            get().subscribeToAuthChanges();
            return;
          }
          throw userError;
        }
        set({
          user: userData,
          isAuthenticated: !!userData,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }

      get().subscribeToAuthChanges();
    } catch (error) {
      if (isNetworkFailure(error)) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        get().subscribeToAuthChanges();
        return;
      }
      handleError(error, {
        context: { operation: 'initializeAuth' },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.login(email, password);
      if (result.success) {
        if (result.requiresRoleSelection) {
          // This will be handled by the navigation system
          // The login screen will navigate to role selection
          set({ isLoading: false });
          throw new Error('ROLE_SELECTION_REQUIRED');
        } else if (result.user) {
          set({
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
          throw new Error(result.error || 'Login failed');
        }
      } else {
        set({ isLoading: false });
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'login', email },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithRole: async (email: string, role: UserRole) => {
    // Set pending role to prevent auth listener from overriding with wrong role
    set({ isLoading: true, pendingLoginRole: role });
    try {
      const result = await AuthService.loginWithRole(email, role);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          pendingLoginRole: null,
        });
      } else {
        set({ isLoading: false, pendingLoginRole: null });
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'loginWithRole', email, role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false, pendingLoginRole: null });
      throw error;
    }
  },

  loginWithCredentialsAndRole: async (email: string, password: string, role: UserRole) => {
    // Set pending role BEFORE auth to prevent listener from overriding with wrong role
    set({ isLoading: true, pendingLoginRole: role });
    try {
      const result = await AuthService.login(email, password, role);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          pendingLoginRole: null,
        });
      } else {
        // Login failed - sign out to clean up and clear pending role
        await AuthService.logout();
        set({ isLoading: false, pendingLoginRole: null });
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      // Ensure we're signed out on failure
      try {
        await AuthService.logout();
      } catch {
        // Ignore logout errors
      }
      handleError(error, {
        context: { operation: 'loginWithCredentialsAndRole', email, role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false, pendingLoginRole: null });
      throw error;
    }
  },

  setPendingLoginRole: (role: UserRole | null) => {
    set({ pendingLoginRole: role });
  },

  register: async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    phone: string,
    businessName?: string
  ) => {
    set({ isLoading: true });
    try {
      const additionalData: Partial<User> = { phone };
      if (role === 'admin' && businessName) {
        (additionalData as Partial<AdminUser>).businessName = businessName;
      }
      const result = await AuthService.register(email, password, name, role, additionalData);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'register', email, role },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      handleError(error, {
        context: { operation: 'logout' },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  updateUser: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    try {
      await AuthService.updateUserProfile(user.id, updates);
      const updatedUser = { ...user, ...updates };
      set({
        user: updatedUser,
        isLoading: false,
      });
    } catch (error) {
      handleError(error, {
        context: { operation: 'updateUser', userId: user.id },
        userFacing: false,
        severity: ErrorSeverity.MEDIUM,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  subscribeToAuthChanges: () => {
    const { unsubscribeAuth } = get();
    // Clean up existing subscription if any
    if (unsubscribeAuth) {
      unsubscribeAuth();
    }

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: { user: { id: string } } | null) => {
      const fetchAndSetUser = async (userId: string) => {
        try {
          const userData = await AuthService.getCurrentUserData(userId);
          if (userData) set({ user: userData, isAuthenticated: true });
        } catch (err) {
          if (!isNetworkFailure(err)) handleError(err, { context: { operation: 'onAuthStateChange' }, userFacing: false, severity: ErrorSeverity.MEDIUM });
        }
      };

      if (event === 'SIGNED_IN' && session?.user) {
        const { pendingLoginRole, user: currentUser } = get();
        if (pendingLoginRole || currentUser) return;
        await fetchAndSetUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, isAuthenticated: false, pendingLoginRole: null });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const { pendingLoginRole } = get();
        if (pendingLoginRole) return;
        await fetchAndSetUser(session.user.id);
      }
    });
    
    set({ unsubscribeAuth: () => subscription.unsubscribe() });
  },

  unsubscribeFromAuthChanges: () => {
    const { unsubscribeAuth } = get();
    if (unsubscribeAuth) {
      unsubscribeAuth();
      set({ unsubscribeAuth: null });
    }
  },
}));
