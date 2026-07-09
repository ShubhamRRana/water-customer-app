import { create } from 'zustand';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, AdminUser, CustomerAccountKind, isCustomerUser } from '../types/index';
import { AuthService } from '../services/auth.service';
import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';
import { ErrorSeverity } from '../utils/errorLogger';
import { isInvalidRefreshTokenError } from '../utils/authErrors';
import { parseRecoveryTokensFromUrl } from '../utils/recoveryLink';
import { maybeProvisionCustomerTrial } from '../utils/provisionCustomerTrial';

const CUSTOMER_ACCOUNT_KIND_KEY = '@water_customer_account_kind';

let linkingSubscription: { remove: () => void } | null = null;

async function applyRecoverySessionFromUrl(
  url: string,
  set: (partial: Partial<AuthState>) => void,
  subscribeToAuthChanges: () => void
): Promise<boolean> {
  const tokens = parseRecoveryTokensFromUrl(url);
  if (!tokens) return false;

  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error) return false;

  set({
    user: null,
    isAuthenticated: false,
    needsPasswordReset: true,
    isLoading: false,
    showPostRegisterWelcome: false,
  });
  subscribeToAuthChanges();
  return true;
}

function subscribeToRecoveryDeepLinks(
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState
): void {
  if (linkingSubscription) return;

  linkingSubscription = Linking.addEventListener('url', ({ url }) => {
    void applyRecoverySessionFromUrl(url, set, () => get().subscribeToAuthChanges());
  });
}

async function readStoredCustomerAccountKind(): Promise<CustomerAccountKind> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMER_ACCOUNT_KIND_KEY);
    return raw === 'society' ? 'society' : 'individual';
  } catch {
    return 'individual';
  }
}

async function writeStoredCustomerAccountKind(kind: CustomerAccountKind | null): Promise<void> {
  try {
    if (kind == null) {
      await AsyncStorage.removeItem(CUSTOMER_ACCOUNT_KIND_KEY);
    } else {
      await AsyncStorage.setItem(CUSTOMER_ACCOUNT_KIND_KEY, kind);
    }
  } catch {
    // non-fatal
  }
}

/** Clears persisted Supabase tokens when refresh is invalid (no server round-trip). */
async function clearCorruptedLocalAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Non-fatal when storage is already inconsistent
  }
}

/** Returns true if the error is a network failure (e.g. device can't reach Supabase). */
function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Network request failed') return true;
  const msg = error && typeof (error as Error).message === 'string' ? (error as Error).message : '';
  return msg.includes('Network request failed') || msg.includes('network') || msg.includes('fetch failed');
}

/**
 * Authentication store state interface
 *
 * **Phase 3 — responsibilities (see `docs/state-management-migration.md`):**
 * Zustand keeps session lifecycle, Supabase `onAuthStateChange`, deep-link recovery,
 * `AsyncStorage` for customer account kind, and cross-screen flags (`showPostRegisterWelcome`, `needsPasswordReset`). Remote profile rows may also be cached under React Query
 * (`useAuthProfileQuery`) for refetch/invalidation; this store remains the source for
 * `user` / `isAuthenticated` used by navigation.
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  unsubscribeAuth: (() => void) | null;
  /** Role-specific login in progress - prevents auth listener from overriding role */
  pendingLoginRole: UserRole | null;
  /** True when session is from password reset link; show Set new password screen */
  needsPasswordReset: boolean;
  /** Set when logging in via individual vs society flow; restored from storage with session */
  customerAccountKind: CustomerAccountKind | null;
  /** After successful registration with session, show one-time welcome on home */
  showPostRegisterWelcome: boolean;
  dismissPostRegisterWelcome: () => void;
  clearNeedsPasswordReset: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithRole: (email: string, role: UserRole) => Promise<void>;
  loginWithCredentialsAndRole: (
    email: string,
    password: string,
    role: UserRole,
    customerAccountKind?: CustomerAccountKind
  ) => Promise<void>;
  setPendingLoginRole: (role: UserRole | null) => void;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    phone: string,
    customerAccountKind?: CustomerAccountKind,
    businessName?: string
  ) => Promise<{ needsEmailConfirmation?: boolean } | void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  /** Refetch profile from the server and update `user` (lighter than full `initializeAuth`). */
  refreshUserProfile: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  subscribeToAuthChanges: () => void;
  unsubscribeFromAuthChanges: () => void;
}

/**
 * Authentication store using Zustand — session, flags, and imperative auth API.
 * Optional profile caching via React Query is layered on in hooks; see `useAuthProfileQuery`.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  unsubscribeAuth: null,
  pendingLoginRole: null,
  needsPasswordReset: false,
  customerAccountKind: null,
  showPostRegisterWelcome: false,

  dismissPostRegisterWelcome: () => set({ showPostRegisterWelcome: false }),

  clearNeedsPasswordReset: () => set({ needsPasswordReset: false }),

  requestPasswordReset: async (email: string) => {
    const result = await AuthService.requestPasswordReset(email);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send reset email');
    }
    return { success: true };
  },

  updatePassword: async (newPassword: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.updatePassword(newPassword);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update password');
      }
      await AuthService.logout();
      set({
        user: null,
        isAuthenticated: false,
        needsPasswordReset: false,
        isLoading: false,
        customerAccountKind: null,
        showPostRegisterWelcome: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { user } = get();
    if (!user?.email) {
      throw new Error('You must be signed in to change your password.');
    }
    set({ isLoading: true });
    try {
      const verifyResult = await AuthService.verifyCurrentPassword(
        user.email,
        currentPassword
      );
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'Current password is incorrect.');
      }
      const updateResult = await AuthService.updatePassword(newPassword, user.id);
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update password.');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      await AuthService.initializeApp();

      let session = null;
      try {
        const result = await supabase.auth.getSession();
        if (result.error && isInvalidRefreshTokenError(result.error)) {
          await clearCorruptedLocalAuthSession();
          session = null;
        } else {
          session = result.data?.session ?? null;
        }
      } catch (sessionError) {
        if (isInvalidRefreshTokenError(sessionError)) {
          await clearCorruptedLocalAuthSession();
          session = null;
        } else if (isNetworkFailure(sessionError)) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            customerAccountKind: null,
            showPostRegisterWelcome: false,
          });
          get().subscribeToAuthChanges();
          return;
        } else {
          throw sessionError;
        }
      }

      // If no session, check for password reset deep link (app opened from reset email link)
      if (!session?.user) {
        try {
          const url = await Linking.getInitialURL();
          if (url) {
            const handled = await applyRecoverySessionFromUrl(
              url,
              set,
              () => get().subscribeToAuthChanges()
            );
            if (handled) return;
          }
        } catch (_) {
          // Ignore URL parse errors
        }
      }

      if (session?.user) {
        let userData = null;
        try {
          userData = await AuthService.getCurrentUserData(session.user.id);
        } catch (userError) {
          if (isNetworkFailure(userError)) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              customerAccountKind: null,
              showPostRegisterWelcome: false,
            });
            get().subscribeToAuthChanges();
            return;
          }
          throw userError;
        }
        let kind: CustomerAccountKind | null = null;
        if (userData && isCustomerUser(userData)) {
          try {
            kind = await AuthService.getCustomerAccountKind(userData.id);
            await writeStoredCustomerAccountKind(kind);
          } catch {
            kind = await readStoredCustomerAccountKind();
          }
        }
        set({
          user: userData,
          isAuthenticated: !!userData,
          isLoading: false,
          customerAccountKind: userData ? kind : null,
          showPostRegisterWelcome: false,
        });
        maybeProvisionCustomerTrial(userData);
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          customerAccountKind: null,
          showPostRegisterWelcome: false,
        });
      }

      get().subscribeToAuthChanges();
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearCorruptedLocalAuthSession();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          customerAccountKind: null,
          showPostRegisterWelcome: false,
        });
        get().subscribeToAuthChanges();
        return;
      }
      if (isNetworkFailure(error)) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          customerAccountKind: null,
          showPostRegisterWelcome: false,
        });
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
          maybeProvisionCustomerTrial(result.user);
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
        maybeProvisionCustomerTrial(result.user);
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

  loginWithCredentialsAndRole: async (
    email: string,
    password: string,
    role: UserRole,
    accountKind?: CustomerAccountKind
  ) => {
    // Set pending role BEFORE auth to prevent listener from overriding with wrong role
    set({ isLoading: true, pendingLoginRole: role });
    try {
      const result = await AuthService.login(email, password, role, accountKind);
      if (result.success && result.user) {
        let kind: CustomerAccountKind = accountKind ?? 'individual';
        if (isCustomerUser(result.user)) {
          kind = await AuthService.getCustomerAccountKind(result.user.id);
          await writeStoredCustomerAccountKind(kind);
        }
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          pendingLoginRole: null,
          customerAccountKind: isCustomerUser(result.user) ? kind : null,
        });
        maybeProvisionCustomerTrial(result.user);
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
    customerAccountKind?: CustomerAccountKind,
    businessName?: string
  ) => {
    set({ isLoading: true });
    try {
      const additionalData: Partial<User> & { customerAccountKind?: CustomerAccountKind } = {
        phone,
        ...(role === 'customer'
          ? { customerAccountKind: customerAccountKind ?? 'individual' }
          : {}),
      };
      if (role === 'admin' && businessName) {
        (additionalData as Partial<AdminUser>).businessName = businessName;
      }
      const result = await AuthService.register(email, password, name, role, additionalData);
      if (result.success && result.user) {
        let resolvedKind: CustomerAccountKind | null = null;
        if (isCustomerUser(result.user)) {
          resolvedKind = await AuthService.getCustomerAccountKind(result.user.id);
          await writeStoredCustomerAccountKind(resolvedKind);
        }
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          customerAccountKind: resolvedKind,
          showPostRegisterWelcome: true,
        });
        maybeProvisionCustomerTrial(result.user);
        return;
      }
      if (result.success && result.needsEmailConfirmation) {
        set({ isLoading: false });
        return { needsEmailConfirmation: true };
      }
      set({ isLoading: false });
      throw new Error(result.error || 'Registration failed');
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
      await writeStoredCustomerAccountKind(null);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        customerAccountKind: null,
        showPostRegisterWelcome: false,
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

  refreshUserProfile: async () => {
    const { user } = get();
    if (!user?.id) return;
    try {
      const userData = await AuthService.getCurrentUserData(user.id);
      if (userData) {
        set({
          user: userData,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      if (!isNetworkFailure(error)) {
        handleError(error, {
          context: { operation: 'refreshUserProfile', userId: user.id },
          userFacing: false,
          severity: ErrorSeverity.MEDIUM,
        });
      }
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
    subscribeToRecoveryDeepLinks(set, get);

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
          if (userData) {
            let kind: CustomerAccountKind | null = null;
            if (isCustomerUser(userData)) {
              try {
                kind = await AuthService.getCustomerAccountKind(userId);
                await writeStoredCustomerAccountKind(kind);
              } catch {
                kind = await readStoredCustomerAccountKind();
              }
            }
            set({
              user: userData,
              isAuthenticated: true,
              customerAccountKind: kind,
            });
            maybeProvisionCustomerTrial(userData);
          }
        } catch (err) {
          if (!isNetworkFailure(err)) handleError(err, { context: { operation: 'onAuthStateChange' }, userFacing: false, severity: ErrorSeverity.MEDIUM });
        }
      };

      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        void writeStoredCustomerAccountKind(null);
        set({
          user: null,
          isAuthenticated: false,
          needsPasswordReset: true,
          isLoading: false,
          customerAccountKind: null,
          showPostRegisterWelcome: false,
        });
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const { pendingLoginRole, user: currentUser } = get();
        if (pendingLoginRole || currentUser) return;
        await fetchAndSetUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        void writeStoredCustomerAccountKind(null);
        set({
          user: null,
          isAuthenticated: false,
          pendingLoginRole: null,
          needsPasswordReset: false,
          customerAccountKind: null,
          showPostRegisterWelcome: false,
        });
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
