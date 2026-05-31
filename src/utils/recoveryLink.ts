export interface RecoveryTokens {
  access_token: string;
  refresh_token: string;
  type: string;
}

function parseFragmentParams(fragment: string): Record<string, string> {
  return fragment.split('&').reduce<Record<string, string>>((acc, pair) => {
    const [k, v] = pair.split('=');
    if (k && v) acc[decodeURIComponent(k)] = decodeURIComponent(v);
    return acc;
  }, {});
}

/**
 * Extract Supabase password-recovery tokens from a deep link or redirect URL.
 * Supabase appends tokens in the URL hash: #access_token=...&refresh_token=...&type=recovery
 */
export function parseRecoveryTokensFromUrl(url: string): RecoveryTokens | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;

  const params = parseFragmentParams(url.slice(hashIndex + 1));
  if (
    params.access_token &&
    params.refresh_token &&
    params.type === 'recovery'
  ) {
    return {
      access_token: params.access_token,
      refresh_token: params.refresh_token,
      type: params.type,
    };
  }
  return null;
}

export function getPasswordResetRedirectUrl(): string {
  return (
    process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL ||
    'wtccustomer://reset-password'
  );
}
