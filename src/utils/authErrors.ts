/**
 * Helpers for classifying Supabase Auth errors on the client.
 */

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return String(error);
}

/**
 * Persisted session has a refresh token the server no longer accepts (revoked, user removed, wrong project, etc.).
 * Supabase surfaces this as AuthApiError with a message like "Invalid Refresh Token: Refresh Token Not Found".
 */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (error == null) return false;
  const msg = errorMessage(error).toLowerCase();
  if (msg.includes('invalid refresh token') || msg.includes('refresh token not found')) {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code).toLowerCase();
    if (code === 'refresh_token_not_found' || code === 'invalid_grant') {
      return true;
    }
  }
  return false;
}
