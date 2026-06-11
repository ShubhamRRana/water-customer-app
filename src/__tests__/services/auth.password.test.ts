/**
 * AuthService password reset / change — isolated tests with mocked Supabase client.
 */

jest.mock('../../lib/supabaseClient');

import { AuthService } from '../../services/auth.service';
import { rateLimiter } from '../../utils/rateLimiter';
import { ValidationUtils } from '../../utils/validation';
import { supabase } from '../../lib/supabaseClient';
import { parseRecoveryTokensFromUrl } from '../../utils/recoveryLink';

beforeEach(() => {
  jest.clearAllMocks();
  rateLimiter.resetAll();
});

afterEach(() => {
  jest.restoreAllMocks();
  rateLimiter.resetAll();
});

describe('AuthService.requestPasswordReset', () => {
  it('succeeds when Supabase resetPasswordForEmail returns no error', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });

    const result = await AuthService.requestPasswordReset('user@test.com');

    expect(result.success).toBe(true);
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      expect.stringContaining('user@test.com'),
      expect.objectContaining({
        redirectTo: expect.stringMatching(/^wtccustomer:\/\//),
      })
    );
  });

  it('returns server error when reset fails for a non-rate-limit reason', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      error: { message: 'SMTP error' },
    });

    const result = await AuthService.requestPasswordReset('user@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('SMTP error');
  });

  it('maps Supabase email rate limit to friendlier copy', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      error: { message: 'Email rate limit exceeded' },
    });

    const result = await AuthService.requestPasswordReset('user@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many emails');
  });

  it('rejects invalid email', async () => {
    jest.spyOn(ValidationUtils, 'validateEmail').mockReturnValue({
      isValid: false,
      error: 'Invalid email address',
    });

    const result = await AuthService.requestPasswordReset('not-an-email');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email address');
  });

  it('rejects when client-side password_reset rate limit is exceeded', async () => {
    for (let i = 0; i < 3; i++) {
      rateLimiter.record('password_reset', 'limited@test.com');
    }

    const result = await AuthService.requestPasswordReset('limited@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many reset attempts');
  });
});

describe('AuthService.updatePassword', () => {
  it('succeeds when Supabase updateUser returns no error', async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null });

    const result = await AuthService.updatePassword('newpassword123');

    expect(result.success).toBe(true);
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
  });

  it('rejects weak password', async () => {
    jest.spyOn(ValidationUtils, 'validatePassword').mockReturnValue({
      isValid: false,
      error: 'Password too short',
    });

    const result = await AuthService.updatePassword('short');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Password too short');
  });
});

describe('AuthService.verifyCurrentPassword', () => {
  it('succeeds when signInWithPassword succeeds', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

    const result = await AuthService.verifyCurrentPassword('user@test.com', 'password123');

    expect(result.success).toBe(true);
  });

  it('returns invalid credentials when signInWithPassword fails', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const result = await AuthService.verifyCurrentPassword('user@test.com', 'wrongpassword123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid email address or password');
  });
});

describe('parseRecoveryTokensFromUrl', () => {
  it('extracts recovery tokens from URL hash', () => {
    const url =
      'wtccustomer://reset-password#access_token=abc&refresh_token=def&type=recovery';
    expect(parseRecoveryTokensFromUrl(url)).toEqual({
      access_token: 'abc',
      refresh_token: 'def',
      type: 'recovery',
    });
  });
});
