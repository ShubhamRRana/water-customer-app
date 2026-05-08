/**
 * AuthService.resendSignupConfirmation — isolated tests with mocked Supabase client
 * so Jest does not load expo-constants via the real supabaseClient module.
 */

jest.mock('../../lib/supabaseClient');

import { AuthService } from '../../services/auth.service';
import { rateLimiter } from '../../utils/rateLimiter';
import { ValidationUtils } from '../../utils/validation';
import { supabase } from '../../lib/supabaseClient';

beforeEach(() => {
  jest.clearAllMocks();
  rateLimiter.resetAll();
});

afterEach(() => {
  jest.restoreAllMocks();
  rateLimiter.resetAll();
});

describe('AuthService.resendSignupConfirmation', () => {
  it('succeeds when Supabase resend returns no error', async () => {
    (supabase.auth.resend as jest.Mock).mockResolvedValue({ error: null });

    const result = await AuthService.resendSignupConfirmation('user@test.com');

    expect(result.success).toBe(true);
    expect(supabase.auth.resend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'signup',
        email: expect.stringContaining('user@test.com'),
        options: expect.objectContaining({
          emailRedirectTo: expect.any(String),
        }),
      })
    );
  });

  it('returns server error message when resend fails for a non-rate-limit reason', async () => {
    (supabase.auth.resend as jest.Mock).mockResolvedValue({
      error: { message: 'Signup disabled' },
    });

    const result = await AuthService.resendSignupConfirmation('user@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Signup disabled');
  });

  it('maps Supabase email rate limit to friendlier copy', async () => {
    (supabase.auth.resend as jest.Mock).mockResolvedValue({
      error: { message: 'Email rate limit exceeded' },
    });

    const result = await AuthService.resendSignupConfirmation('user@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many emails');
  });

  it('rejects invalid email', async () => {
    jest.spyOn(ValidationUtils, 'validateEmail').mockReturnValue({
      isValid: false,
      error: 'Invalid email address',
    });

    const result = await AuthService.resendSignupConfirmation('not-an-email');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email address');
  });

  it('rejects when client-side resend rate limit is exceeded', async () => {
    for (let i = 0; i < 3; i++) {
      rateLimiter.record('resend_signup_email', 'limited@test.com');
    }

    const result = await AuthService.resendSignupConfirmation('limited@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many resend attempts');
  });
});
