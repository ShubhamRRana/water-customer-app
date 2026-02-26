import { supabase } from '../lib/supabaseClient';
import { User as AppUser, UserRole, DriverUser, AdminUser } from '../types/index';
import { ERROR_MESSAGES } from '../constants/config';
import { securityLogger, SecurityEventType, SecuritySeverity } from '../utils/securityLogger';
import { rateLimiter } from '../utils/rateLimiter';
import { SanitizationUtils } from '../utils/sanitization';
import { ValidationUtils } from '../utils/validation';
import { dataAccess } from '../lib/index';
import { deserializeDate } from '../utils/dateSerialization';
import { handleError } from '../utils/errorHandler';
import { getErrorMessage } from '../utils/errors';

/**
 * Result of authentication operations
 */
export interface AuthResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Authenticated user data (if successful) */
  user?: AppUser;
  /** Error message (if failed) */
  error?: string;
  /** Available roles for user (if multiple roles exist) */
  availableRoles?: UserRole[];
  /** Whether user needs to select a role */
  requiresRoleSelection?: boolean;
}

/**
 * Helper: Fetch user from Supabase with specific role
 * @param userId - The user ID to fetch (must be the current/new user_id, not a cached one)
 * @param role - Optional role to filter by
 * @param retryCount - Internal retry counter for handling race conditions
 */
async function fetchUserWithRole(userId: string, role?: UserRole, retryCount: number = 0): Promise<AppUser | null> {
  try {
    // Fetch user
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      // If this is a retry and we still can't find the user, silently fail
      if (retryCount > 0) {
        // Failed to fetch user after retries
      }
      return null;
    }

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (rolesError || !roles || roles.length === 0) {
      // Retry once if roles are not found (might be a race condition after registration)
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        return fetchUserWithRole(userId, role, 1);
      }
      return null;
    }

    // If role is specified, check if user has that role
    if (role) {
      const hasRole = roles.some(r => r.role === role);
      if (!hasRole) {
        return null;
      }
    }

    // Fetch role-specific data
    let customerData = null;
    let driverData = null;
    let adminData = null;

    const selectedRole = role || roles[0].role;

    if (selectedRole === 'customer') {
      const { data, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // If customer data not found and this is the first attempt, retry once
      if (customerError && retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        return fetchUserWithRole(userId, role, 1);
      }
      
      customerData = data;
    } else if (selectedRole === 'driver') {
      const { data, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // If driver data not found and this is the first attempt, retry once
      if (driverError && retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        return fetchUserWithRole(userId, role, 1);
      }
      
      driverData = data;
    } else if (selectedRole === 'admin') {
      const { data, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // If admin data not found and this is the first attempt, retry once
      if (adminError && retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        return fetchUserWithRole(userId, role, 1);
      }
      
      adminData = data;
    }

    // Map to User type
    const baseUser = {
      id: userRow.id,
      email: userRow.email,
      password: '', // No longer needed with Supabase Auth
      name: userRow.name,
      phone: userRow.phone || undefined,
      createdAt: deserializeDate(userRow.created_at) || new Date(),
    };

    if (selectedRole === 'customer' && customerData) {
      return {
        ...baseUser,
        role: 'customer',
        savedAddresses: (customerData.saved_addresses as any) || [],
      } as AppUser;
    } else if (selectedRole === 'driver' && driverData) {
      return {
        ...baseUser,
        role: 'driver',
        vehicleNumber: driverData.vehicle_number,
        licenseNumber: driverData.license_number,
        licenseExpiry: deserializeDate(driverData.license_expiry) || undefined,
        driverLicenseImage: driverData.driver_license_image_url,
        vehicleRegistrationImage: driverData.vehicle_registration_image_url,
        totalEarnings: Number(driverData.total_earnings),
        completedOrders: driverData.completed_orders,
        createdByAdmin: driverData.created_by_admin,
        emergencyContactName: driverData.emergency_contact_name || undefined,
        emergencyContactPhone: driverData.emergency_contact_phone || undefined,
      } as AppUser;
    } else if (selectedRole === 'admin') {
      return {
        ...baseUser,
        role: 'admin',
        businessName: adminData?.business_name || undefined,
      } as AppUser;
    }

    return null;
  } catch (error) {
    handleError(error, {
      context: { operation: 'fetchUserWithRole', userId, role },
      userFacing: false,
    });
    return null;
  }
}

/**
 * Helper: Get available roles for a user
 */
async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      securityLogger.logAuthAttempt('unknown', false, `Failed to fetch roles: ${error.message}`);
      return [];
    }

    if (!roles || roles.length === 0) {
      // Check if user exists in users table
      const { data: userExists, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!userExists) {
        // User does not exist in users table
      }
      return [];
    }

    return roles.map(r => r.role as UserRole);
  } catch (error) {
    handleError(error, {
      context: { operation: 'getUserRoles', userId },
      userFacing: false,
    });
    return [];
  }
}

/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and session management.
 * Includes security features like rate limiting, input sanitization, and brute force protection.
 * Uses Supabase Auth for authentication and Supabase database for user data persistence.
 * 
 * @example
 * ```typescript
 * // Register a new user
 * const result = await AuthService.register('user@example.com', 'password123', 'John Doe', 'customer');
 * if (result.success) {
 *   console.log('User registered:', result.user);
 * }
 * 
 * // Login
 * const loginResult = await AuthService.login('user@example.com', 'password123');
 * if (loginResult.success && loginResult.user) {
 *   // User logged in successfully
 * }
 * ```
 */
export class AuthService {
  /**
   * Register a new user and save to local storage.
   * 
   * Includes input sanitization, rate limiting, and security event logging.
   * Prevents driver self-registration (only admin-created drivers allowed).
   * 
   * @param email - User's email address (will be sanitized automatically)
   * @param password - User's password
   * @param name - User's name (will be sanitized automatically)
   * @param role - User role ('customer' | 'driver' | 'admin')
   * @param additionalData - Optional additional user data
   * @returns Promise resolving to AuthResult with success status and user data
   * @throws Never throws - returns error in AuthResult.error instead
   * 
   * @example
   * ```typescript
   * const result = await AuthService.register(
   *   'user@example.com',
   *   'password123',
   *   'John Doe',
   *   'customer'
   * );
   * 
   * if (result.success) {
   *   console.log('User registered:', result.user);
   * } else {
   *   console.error('Registration failed:', result.error);
   * }
   * ```
   */
  static async register(
    email: string,
    password: string,
    name: string,
    role: UserRole,
    additionalData?: Partial<AppUser>
  ): Promise<AuthResult> {
    try {
      // Sanitize inputs
      const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
      const sanitizedName = SanitizationUtils.sanitizeName(name);
      const sanitizedPhone = additionalData?.phone ? SanitizationUtils.sanitizePhone(additionalData.phone) : undefined;

      // Validate email format
      const emailValidation = ValidationUtils.validateEmail(sanitizedEmail, true);
      if (!emailValidation.isValid) {
        return {
          success: false,
          error: emailValidation.error || 'Invalid email address'
        };
      }

      // Check rate limit for registration
      const rateLimitCheck = rateLimiter.isAllowed('register', sanitizedEmail);
      if (!rateLimitCheck.allowed) {
        securityLogger.logRateLimitExceeded('register');
        return {
          success: false,
          error: `Too many registration attempts. Please try again after ${new Date(rateLimitCheck.resetTime).toLocaleTimeString()}`
        };
      }

      // Prevent driver self-registration - only admin-created drivers are allowed
      if (role === 'driver' && !(additionalData as Partial<DriverUser>)?.createdByAdmin) {
        securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, ERROR_MESSAGES.auth.adminCreatedDriverOnly);
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // Validate phone is provided (required)
      if (!sanitizedPhone || !sanitizedPhone.trim()) {
        return {
          success: false,
          error: 'Phone number is required'
        };
      }

      // Record rate limit
      rateLimiter.record('register', sanitizedEmail);

      // Check if user already exists in users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('email', sanitizedEmail.toLowerCase())
        .maybeSingle();

      let userId: string;

      if (existingUser) {
        // User already exists - verify password by attempting to sign in
        // This ensures the user owns the account before adding a new role
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: password,
        });

        if (authError || !authData.user) {
          securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, authError?.message || 'Invalid password for existing account');
          return {
            success: false,
            error: authError?.message || 'Invalid password. Please use the correct password for this email address.'
          };
        }

        // Verify the authenticated user ID matches the existing user ID
        if (authData.user.id !== existingUser.id) {
          securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, 'User ID mismatch');
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Account verification failed. Please try again.'
          };
        }

        // User exists and password is correct - check if they already have this role
        const { data: existingRole, error: roleCheckError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', existingUser.id)
          .eq('role', role)
          .maybeSingle();

        if (existingRole) {
          securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, 'User already exists');
          await supabase.auth.signOut();
          return {
            success: false,
            error: `User already exists with this email address as ${role}`
          };
        }

        // User exists but doesn't have this role - add the role
        userId = existingUser.id;

        // Create user role (now authenticated, so RLS will allow)
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: role,
          });

        if (roleError) {
          securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, roleError.message);
          await supabase.auth.signOut();
          return {
            success: false,
            error: roleError.message || 'Failed to assign user role'
          };
        }

        // Update user phone if needed
        const { error: updateError } = await supabase
          .from('users')
          .update({
            phone: sanitizedPhone,
          })
          .eq('id', userId);

        if (updateError) {
          securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, updateError.message);
          await supabase.auth.signOut();
          return {
            success: false,
            error: updateError.message || 'Failed to update user profile'
          };
        }
      } else {
        // User doesn't exist in users table - try to create in Supabase Auth first
        // But if email already exists in Supabase Auth, try to sign in instead
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: password,
          options: {
            data: {
              name: sanitizedName,
              role: role,
              phone: sanitizedPhone,
            }
          }
        });

        // If signUp fails because email already exists in Supabase Auth, try to sign in instead
        // This handles the case where user exists in Auth but not in users table
        if (authError && (authError.message?.includes('already registered') || authError.message?.includes('already exists') || authError.status === 422)) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: sanitizedEmail,
            password: password,
          });

          if (signInError || !signInData?.user) {
            securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, signInError?.message || 'Invalid password for existing account');
            return {
              success: false,
              error: signInError?.message || 'Invalid password. Please use the correct password for this email address.'
            };
          }

          userId = signInData.user.id;

          // Check if user already has this role
          const { data: existingRole, error: roleCheckError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('role', role)
            .maybeSingle();

          if (existingRole) {
            securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, 'User already exists');
            await supabase.auth.signOut();
            return {
              success: false,
              error: `User already exists with this email address as ${role}`
            };
          }

          // Create user record in users table if it doesn't exist
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (!userExists) {
            const { error: userError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: sanitizedEmail,
                password_hash: '', // No longer needed with Supabase Auth
                name: sanitizedName,
                phone: sanitizedPhone,
              });

            if (userError) {
              securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, userError.message);
              await supabase.auth.signOut();
              return {
                success: false,
                error: userError.message || 'Failed to create user profile'
              };
            }
          }

          // Create user role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: role,
            });

          if (roleError) {
            securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, roleError.message);
            await supabase.auth.signOut();
            return {
              success: false,
              error: roleError.message || 'Failed to assign user role'
            };
          }

          // Skip to role-specific data creation (will be handled below)
        } else if (authError || !authData.user) {
          const errorMessage = authError ? (authError as any).message : 'Registration failed';
          const errorStatus = authError ? (authError as any).status : undefined;
          securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, errorMessage);
          return {
            success: false,
            error: errorMessage
          };
        } else {
          // New user successfully created in Supabase Auth.
          // Rows in public.users and public.user_roles are created by the database trigger
          // (migration 015) so we avoid RLS issues when the client has no session yet (e.g. confirm email).
          userId = authData.user.id;

          // Trigger may not have run yet; give it a moment then verify the row exists.
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: userRow } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
          if (!userRow) {
            securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, 'User profile not created by trigger');
            return {
              success: false,
              error: 'Account was created but profile setup failed. Please try logging in, or contact support if this persists.'
            };
          }
        }
      }

      // Create role-specific data (only if it doesn't exist)
      if (role === 'customer') {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!existingCustomer) {
          const { error: customerError } = await supabase
            .from('customers')
            .insert({
              user_id: userId,
              saved_addresses: [],
            });

          if (customerError) {
            securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, customerError.message);
            return {
              success: false,
              error: customerError.message || 'Failed to create customer profile'
            };
          }
        }
      } else if (role === 'driver') {
        const driverData = additionalData as Partial<DriverUser>;
        // Use UPSERT to handle case where trigger may have already created the record
        // This ensures all fields (especially created_by_admin) are set correctly
        const { error: driverError } = await supabase
          .from('drivers')
          .upsert({
            user_id: userId,
            vehicle_number: driverData?.vehicleNumber || '',
            license_number: driverData?.licenseNumber || '',
            license_expiry: driverData?.licenseExpiry?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            driver_license_image_url: driverData?.driverLicenseImage || '',
            vehicle_registration_image_url: driverData?.vehicleRegistrationImage || '',
            total_earnings: driverData?.totalEarnings ?? 0,
            completed_orders: driverData?.completedOrders ?? 0,
            created_by_admin: driverData?.createdByAdmin ?? false,
            created_by_admin_id: driverData?.createdByAdminId || null,
            emergency_contact_name: driverData?.emergencyContactName || null,
            emergency_contact_phone: driverData?.emergencyContactPhone || null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (driverError) {
          securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, driverError.message);
          return {
            success: false,
            error: driverError.message || 'Failed to create/update driver profile'
          };
        }
      } else if (role === 'admin') {
        const adminData = additionalData as Partial<AdminUser>;
        const { data: existingAdmin } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!existingAdmin) {
          const { error: adminError } = await supabase
            .from('admins')
            .insert({
              user_id: userId,
              business_name: adminData?.businessName || null,
            });

          if (adminError) {
            securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, adminError.message);
            return {
              success: false,
              error: adminError.message || 'Failed to create admin profile'
            };
          }
        }
      }

      // Small delay to ensure database writes are committed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Fetch the created user using the newly generated userId
      // Ensure we're using the userId from authData, not from any cached session
      const newUser = await fetchUserWithRole(userId, role);

      if (!newUser) {
        securityLogger.logRegistrationAttempt(sanitizedEmail, role, false, `Failed to fetch created user with ID: ${userId}`);
        return {
          success: false,
          error: 'Registration successful but failed to fetch user data. Please try logging in.'
        };
      }

      // Log successful registration
      securityLogger.logRegistrationAttempt(sanitizedEmail, role, true, undefined, newUser.id);

      return {
        success: true,
        user: newUser
      };
    } catch (error) {
      securityLogger.logRegistrationAttempt(
        SanitizationUtils.sanitizeEmail(email),
        role,
        false,
        getErrorMessage(error, 'Registration failed')
      );
      return {
        success: false,
        error: getErrorMessage(error, 'Registration failed')
      };
    }
  }

  /**
   * Login with email and password.
   * 
   * Supports multi-role users - if user has multiple roles and no preferredRole is provided, returns requiresRoleSelection flag.
   * If preferredRole is provided, it will login with that specific role only.
   * Includes rate limiting, brute force detection, and security event logging.
   * 
   * @param email - User's email address (will be sanitized automatically)
   * @param password - User's password
   * @param preferredRole - Optional preferred role to login with (if user has multiple roles)
   * @returns Promise resolving to AuthResult with success status and user data
   * @throws Never throws - returns error in AuthResult.error instead
   * 
   * @example
   * ```typescript
   * // Login with preferred role
   * const result = await AuthService.login('user@example.com', 'password123', 'customer');
   * 
   * // Login without preferred role
   * const result = await AuthService.login('user@example.com', 'password123');
   * 
   * if (result.success && result.user) {
   *   // User logged in successfully
   * } else if (result.requiresRoleSelection) {
   *   // User has multiple roles, need to select
   *   const roles = result.availableRoles || [];
   * } else {
   *   console.error('Login failed:', result.error);
   * }
   * ```
   */
  static async login(email: string, password: string, preferredRole?: UserRole): Promise<AuthResult> {
    try {
      // Sanitize email input
      const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);

      // Validate email format
      const emailValidation = ValidationUtils.validateEmail(sanitizedEmail, true);
      if (!emailValidation.isValid) {
        return {
          success: false,
          error: emailValidation.error || 'Invalid email address'
        };
      }

      // Check rate limit for login
      const rateLimitCheck = rateLimiter.isAllowed('login', sanitizedEmail);
      if (!rateLimitCheck.allowed) {
        securityLogger.logRateLimitExceeded('login');
        securityLogger.logBruteForceAttempt(sanitizedEmail, 5); // Assume 5+ attempts
        return {
          success: false,
          error: `Too many login attempts. Please try again after ${new Date(rateLimitCheck.resetTime).toLocaleTimeString()}`
        };
      }

      // Log login attempt
      securityLogger.logAuthAttempt(sanitizedEmail, false);

      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password,
      });

      if (authError || !authData.user) {
        securityLogger.logAuthAttempt(sanitizedEmail, false, authError?.message || 'Authentication failed');
        rateLimiter.record('login', sanitizedEmail);
        return {
          success: false,
          error: authError?.message || 'Invalid email or password'
        };
      }

      const userId = authData.user.id;

      // Get user roles
      const availableRoles = await getUserRoles(userId);

      if (availableRoles.length === 0) {
        securityLogger.logAuthAttempt(sanitizedEmail, false, 'User has no roles assigned');
        rateLimiter.record('login', sanitizedEmail);
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'User has no roles assigned. Please contact administrator.'
        };
      }

      // Filter out drivers not created by admin
      const validRoles: UserRole[] = [];
      for (const role of availableRoles) {
        if (role === 'driver') {
          const { data: driverData } = await supabase
            .from('drivers')
            .select('created_by_admin')
            .eq('user_id', userId)
            .single();

          if (driverData?.created_by_admin) {
            validRoles.push(role);
          }
        } else {
          validRoles.push(role);
        }
      }

      if (validRoles.length === 0) {
        securityLogger.logAuthAttempt(sanitizedEmail, false, ERROR_MESSAGES.auth.adminCreatedDriverOnly);
        rateLimiter.record('login', sanitizedEmail);
        await supabase.auth.signOut();
        return {
          success: false,
          error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
        };
      }

      // If preferredRole is provided, use that specific role
      if (preferredRole) {
        if (!validRoles.includes(preferredRole)) {
          securityLogger.logAuthAttempt(sanitizedEmail, false, `User not found with role: ${preferredRole}`);
          rateLimiter.record('login', sanitizedEmail);
          await supabase.auth.signOut();
          return {
            success: false,
            error: `User not found with selected role: ${preferredRole}`
          };
        }

        const appUser = await fetchUserWithRole(userId, preferredRole);

        if (!appUser) {
          securityLogger.logAuthAttempt(sanitizedEmail, false, 'Failed to fetch user data');
          rateLimiter.record('login', sanitizedEmail);
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Failed to fetch user data'
          };
        }

        // Record successful login
        rateLimiter.record('login', sanitizedEmail);
        securityLogger.logAuthAttempt(sanitizedEmail, true, undefined, appUser.id);

        return {
          success: true,
          user: appUser
        };
      }

      // If single role, return user with that role
      if (validRoles.length === 1) {
        const appUser = await fetchUserWithRole(userId, validRoles[0]);

        if (!appUser) {
          securityLogger.logAuthAttempt(sanitizedEmail, false, 'Failed to fetch user data');
          rateLimiter.record('login', sanitizedEmail);
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Failed to fetch user data'
          };
        }

        // Record successful login
        rateLimiter.record('login', sanitizedEmail);
        securityLogger.logAuthAttempt(sanitizedEmail, true, undefined, appUser.id);

        return {
          success: true,
          user: appUser
        };
      } else {
        // Multiple valid roles - require role selection
        // Don't record rate limit yet - wait for role selection
        // Keep session active for role selection
        return {
          success: true,
          requiresRoleSelection: true,
          availableRoles: validRoles,
          user: undefined
        };
      }
    } catch (error) {
      securityLogger.logAuthAttempt(
        SanitizationUtils.sanitizeEmail(email),
        false,
        getErrorMessage(error, 'Login failed')
      );
      return {
        success: false,
        error: getErrorMessage(error, 'Login failed')
      };
    }
  }

  /**
   * Login with email and selected role (used after role selection).
   * 
   * This method should be called after login() when user has multiple roles.
   * It selects the specific role for the user.
   * 
   * @param email - User's email address
   * @param role - Selected user role
   * @returns Promise resolving to AuthResult with success status and user data
   * @throws Never throws - returns error in AuthResult.error instead
   * 
   * @example
   * ```typescript
   * // First login
   * const loginResult = await AuthService.login('user@example.com', 'password123');
   * 
   * if (loginResult.requiresRoleSelection) {
   *   // User selected 'customer' role
   *   const roleResult = await AuthService.loginWithRole('user@example.com', 'customer');
   *   if (roleResult.success && roleResult.user) {
   *     // User logged in as customer
   *   }
   * }
   * ```
   */
  static async loginWithRole(email: string, role: UserRole): Promise<AuthResult> {
    try {
      // Sanitize email input
      const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        return {
          success: false,
          error: 'No active session. Please login again.'
        };
      }

      const userId = session.user.id;

      // Verify user has this role
      const availableRoles = await getUserRoles(userId);
      if (!availableRoles.includes(role)) {
        return {
          success: false,
          error: 'User not found with selected role'
        };
      }

      // Check if it's a driver that wasn't created by admin
      if (role === 'driver') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('created_by_admin')
          .eq('user_id', userId)
          .single();

        if (!driverData?.created_by_admin) {
          return {
            success: false,
            error: ERROR_MESSAGES.auth.adminCreatedDriverOnly
          };
        }
      }

      const appUser = await fetchUserWithRole(userId, role);

      if (!appUser) {
        return {
          success: false,
          error: 'Failed to fetch user data'
        };
      }
      
      return {
        success: true,
        user: appUser
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Login failed')
      };
    }
  }

  /**
   * Logout the current user.
   * 
   * Signs out the current user and logs the logout event for security monitoring.
   * 
   * @returns Promise that resolves when logout is complete
   * @throws Error if logout fails
   * 
   * @example
   * ```typescript
   * await AuthService.logout();
   * ```
   */
  static async logout(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'unknown';
      
      // Sign out from Supabase Auth
      await supabase.auth.signOut();
      
      // Log logout event
      securityLogger.log(
        SecurityEventType.LOGOUT,
        SecuritySeverity.INFO,
        {},
        userId
      );
    } catch (error) {
      handleError(error, {
        context: { operation: 'logout', userId },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Get current authenticated user data.
   * 
   * Fetches the user profile from local storage based on the current session.
   * 
   * @param id - Optional user ID to fetch user by. If not provided, gets from current session.
   * @returns Promise resolving to User object if authenticated, null otherwise
   * @throws Never throws - returns null on error
   * 
   * @example
   * ```typescript
   * const user = await AuthService.getCurrentUserData();
   * if (user) {
   *   console.log('Current user:', user);
   * } else {
   *   console.log('No user logged in');
   * }
   * ```
   */
  static async getCurrentUserData(id?: string): Promise<AppUser | null> {
    try {
      if (id) {
        // Fetch by id (no role specified, will use first role)
        return await fetchUserWithRole(id);
      } else {
        // Get from current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          return null;
        }
        // Fetch user with first available role
        return await fetchUserWithRole(session.user.id);
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'getCurrentUserData', id },
        userFacing: false,
      });
      return null;
    }
  }

  /**
   * Update user profile in local storage.
   * 
   * Updates user profile data. Note: role and id cannot be updated via this method.
   * 
   * @param id - User ID to update
   * @param updates - Partial user object with fields to update
   * @returns Promise that resolves when update is complete
   * @throws Error if user not found or update fails
   * 
   * @example
   * ```typescript
   * await AuthService.updateUserProfile('user-123', {
   *   name: 'John Updated',
   *   email: 'john@example.com'
   * });
   * ```
   */
  static async updateUserProfile(id: string, updates: Partial<AppUser>): Promise<void> {
    try {
      // Get current user
      const currentUser = await dataAccess.users.getUserById(id);
      
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Merge updates (excluding role and id)
      const { role, id: userId, ...allowedUpdates } = updates;
      const updatedUser = { ...currentUser, ...allowedUpdates };

      // Update in database
      await dataAccess.users.updateUserProfile(id, updatedUser);
    } catch (error) {
      handleError(error, {
        context: { operation: 'updateUserProfile', id },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Initialize app - restore session if available.
   * 
   * Should be called on app startup to restore any existing authentication session.
   * 
   * @returns Promise that resolves when initialization is complete
   * @throws Never throws - errors are logged to console
   * 
   * @example
   * ```typescript
   * await AuthService.initializeApp();
   * const user = await AuthService.getCurrentUserData();
   * if (user) {
   *   // User session was restored
   * }
   * ```
   */
  static async initializeApp(): Promise<void> {
    try {
      // Clean up expired rate limit entries on app startup
      rateLimiter.cleanup();
      // Supabase doesn't need initialization like LocalStorage
      // Database schema is already set up
    } catch (error) {
      handleError(error, {
        context: { operation: 'initializeApp' },
        userFacing: false,
      });
    }
  }

  /**
   * Permanently delete the current customer account and all related data (bookings, profile, then sign out).
   * Only allowed when the current user is a customer and the id matches the current user.
   *
   * @returns Promise resolving to { success, error? }
   */
  static async deleteCustomerAccount(customerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.id !== customerId) {
        return { success: false, error: 'You can only delete your own account.' };
      }

      const currentUser = await fetchUserWithRole(customerId, 'customer');
      if (!currentUser || currentUser.role !== 'customer') {
        return { success: false, error: 'Only customer accounts can be deleted from here.' };
      }

      await dataAccess.users.deleteCustomerAccount(customerId);
      await AuthService.logout();
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete account. Please try again.');
      return { success: false, error: message };
    }
  }

  /**
   * Permanently delete the current admin account and all related data (expenses, bank accounts, profile, then sign out).
   * Only allowed when the current user is an admin and the id matches the current user.
   *
   * @returns Promise resolving to { success, error? }
   */
  static async deleteAdminAccount(adminId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.id !== adminId) {
        return { success: false, error: 'You can only delete your own account.' };
      }

      const currentUser = await fetchUserWithRole(adminId, 'admin');
      if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Only admin accounts can be deleted from here.' };
      }

      await dataAccess.users.deleteAdminAccount(adminId);
      await AuthService.logout();
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete account. Please try again.');
      return { success: false, error: message };
    }
  }

  /**
   * Reset rate limit for login attempts for a specific email or all emails.
   * 
   * Useful for unblocking users who have exceeded rate limits during testing or legitimate use.
   * 
   * @param email - Optional email address to reset rate limit for. If not provided, resets all login rate limits.
   * @returns void
   * 
   * @example
   * ```typescript
   * // Reset rate limit for specific email
   * AuthService.resetLoginRateLimit('user@example.com');
   * 
   * // Reset all login rate limits
   * AuthService.resetLoginRateLimit();
   * ```
   */
  static resetLoginRateLimit(email?: string): void {
    if (email) {
      const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
      rateLimiter.reset('login', sanitizedEmail);
    } else {
      // Reset all login rate limits by getting all active limits and resetting login ones
      const activeLimits = rateLimiter.getActiveLimits();
      activeLimits.forEach((entry, key) => {
        if (key.startsWith('login:')) {
          const email = key.replace('login:', '');
          rateLimiter.reset('login', email);
        } else if (key === 'login') {
          rateLimiter.reset('login');
        }
      });
    }
  }
}
