/**
 * Session Manager Utility
 * 
 * Enhanced session management with timeout, device tracking, and security checks.
 * Complements Supabase Auth session management with additional security features.
 */

import { supabase } from '../lib/supabaseClient';
import { securityLogger, SecurityEventType } from './securityLogger';

export interface SessionInfo {
  userId: string;
  userRole: string;
  createdAt: Date;
  lastActivity: Date;
  deviceId?: string;
  expiresAt?: Date;
}

export interface SessionConfig {
  maxIdleTime: number; // Maximum idle time in milliseconds (default: 30 minutes)
  maxSessionDuration: number; // Maximum session duration in milliseconds (default: 24 hours)
  checkInterval: number; // How often to check session validity (default: 1 minute)
}

class SessionManager {
  private currentSession: SessionInfo | null = null;
  private activityTimer: ReturnType<typeof setInterval> | null = null;
  private config: SessionConfig = {
    maxIdleTime: 30 * 60 * 1000, // 30 minutes
    maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    checkInterval: 60 * 1000, // 1 minute
  };

  /**
   * Initialize session manager
   */
  async initialize(): Promise<void> {
    // Restore session from Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Fetch user role from database
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

      if (roles) {
        this.currentSession = {
          userId: session.user.id,
          userRole: roles.role,
          createdAt: new Date(session.user.created_at || Date.now()),
          lastActivity: new Date(),
        };
        this.startActivityMonitoring();
      }
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date();
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    // Check Supabase Auth session validity
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      await this.clearSession();
      return false;
    }

    // Check idle time
    const idleTime = Date.now() - this.currentSession.lastActivity.getTime();
    if (idleTime > this.config.maxIdleTime) {
      await this.handleSessionTimeout('idle');
      return false;
    }

    // Check session duration
    if (this.currentSession.expiresAt) {
      if (Date.now() > this.currentSession.expiresAt.getTime()) {
        await this.handleSessionTimeout('expired');
        return false;
      }
    }

    return true;
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Clear session
   */
  async clearSession(): Promise<void> {
    if (this.currentSession) {
      securityLogger.log(
        SecurityEventType.LOGOUT,
        'info' as any,
        {
          userId: this.currentSession.userId,
          sessionDuration: Date.now() - this.currentSession.createdAt.getTime(),
        },
        this.currentSession.userId,
        this.currentSession.userRole
      );
    }

    this.currentSession = null;
    this.stopActivityMonitoring();
  }

  /**
   * Set session configuration
   */
  setConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get session configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Handle auth state changes
   * Note: This should be called by your authentication system when auth state changes
   */
  async handleAuthStateChange(
    event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED',
    userId?: string,
    userRole?: string
  ): Promise<void> {
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
        if (userId && userRole) {
          this.currentSession = {
            userId: userId,
            userRole: userRole,
            createdAt: new Date(),
            lastActivity: new Date(),
          };

          if (event === 'TOKEN_REFRESHED') {
            securityLogger.log(
              SecurityEventType.SESSION_REFRESHED,
              'info' as any,
              {},
              userId,
              userRole
            );
          }

          this.startActivityMonitoring();
        }
        break;

      case 'SIGNED_OUT':
        await this.clearSession();
        break;

      case 'USER_UPDATED':
        // Update session if user data changed
        if (this.currentSession) {
          this.updateActivity();
        }
        break;
    }
  }

  /**
   * Start monitoring session activity
   */
  private startActivityMonitoring(): void {
    this.stopActivityMonitoring(); // Clear any existing timer

    this.activityTimer = setInterval(async () => {
      const isValid = await this.isSessionValid();
      if (!isValid) {
        // Session is invalid, will be handled by isSessionValid
        return;
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring session activity
   */
  private stopActivityMonitoring(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(reason: 'idle' | 'expired'): Promise<void> {
    if (this.currentSession) {
      securityLogger.logSessionEvent(
        SecurityEventType.SESSION_EXPIRED,
        this.currentSession.userId,
        { reason }
      );

      // Sign out from Supabase Auth
      await supabase.auth.signOut();
      await this.clearSession();
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

