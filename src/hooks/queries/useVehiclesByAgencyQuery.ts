import { useQuery } from '@tanstack/react-query';
import { VehicleService } from '../../services/vehicle.service';
import { queryKeys } from './queryKeys';

export function useVehiclesByAgencyQuery(agencyId: string | null | undefined) {
  const id = agencyId ?? undefined;
  return useQuery({
    queryKey: id ? queryKeys.vehicles.byAgency(id) : queryKeys.vehicles.idle,
    queryFn: () => VehicleService.getVehiclesByAgency(id!),
    enabled: Boolean(id),
  });
}
