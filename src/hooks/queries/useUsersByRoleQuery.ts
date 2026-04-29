import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../services/user.service';
import type { UserRole } from '../../types';
import { queryKeys } from './queryKeys';

export function useUsersByRoleQuery(role: UserRole) {
  return useQuery({
    queryKey: queryKeys.users.byRole(role),
    queryFn: () => UserService.getUsersByRole(role),
  });
}
