import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export function invalidateAuthProfileQueries(queryClient: QueryClient, userId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile(userId) });
}
