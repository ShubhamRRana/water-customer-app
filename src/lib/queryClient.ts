import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query defaults for server-backed lists (bookings, users, vehicles).
 * Per-query overrides can tighten or loosen freshness as screens are migrated.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 2,
      },
    },
  });
}
