import { useQuery } from '@tanstack/react-query';
import { AuthService } from '../../services/auth.service';
import { queryKeys } from './queryKeys';

/**
 * Server-backed profile row for the signed-in user. Session and navigation gates stay in
 * `useAuthStore`; this query enables refetch-on-focus and cache invalidation after profile edits.
 */
export function useAuthProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? queryKeys.auth.profile(userId) : queryKeys.auth.profileIdle,
    queryFn: () => AuthService.getCurrentUserData(userId!),
    enabled: !!userId,
  });
}
