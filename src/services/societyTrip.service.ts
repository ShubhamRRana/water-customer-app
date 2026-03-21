import { supabase } from '../lib/supabaseClient';
import { SocietyTrip } from '../types';
import { handleError } from '../utils/errorHandler';

export interface CreateSocietyTripInput {
  customerId: string;
  agencyName: string;
  scheduledAt: Date;
  tankerSizeLiters: number;
  photoUrl: string;
}

type SocietyTripRow = {
  id: string;
  customer_id: string;
  agency_name: string;
  scheduled_at: string;
  tanker_size_liters: number;
  photo_url: string;
  created_at: string;
};

function mapRow(row: SocietyTripRow): SocietyTrip {
  return {
    id: row.id,
    customerId: row.customer_id,
    agencyName: row.agency_name,
    scheduledAt: new Date(row.scheduled_at),
    tankerSizeLiters: row.tanker_size_liters,
    photoUrl: row.photo_url,
    createdAt: new Date(row.created_at),
  };
}

export class SocietyTripService {
  static async listTripsForCustomer(customerId: string): Promise<SocietyTrip[]> {
    try {
      const { data, error } = await supabase
        .from('society_trips')
        .select(
          'id, customer_id, agency_name, scheduled_at, tanker_size_liters, photo_url, created_at',
        )
        .eq('customer_id', customerId)
        .order('scheduled_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to load trips');
      }
      const rows = (data ?? []) as SocietyTripRow[];
      return rows.map(mapRow);
    } catch (error) {
      handleError(error, {
        context: { operation: 'listSocietyTrips', customerId },
        userFacing: false,
      });
      throw error;
    }
  }

  static async createTrip(input: CreateSocietyTripInput): Promise<void> {
    try {
      const { error } = await supabase.from('society_trips').insert({
        customer_id: input.customerId,
        agency_name: input.agencyName.trim(),
        scheduled_at: input.scheduledAt.toISOString(),
        tanker_size_liters: input.tankerSizeLiters,
        photo_url: input.photoUrl,
      });

      if (error) {
        throw new Error(error.message || 'Failed to save trip');
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'createSocietyTrip', customerId: input.customerId },
        userFacing: false,
      });
      throw error;
    }
  }
}
