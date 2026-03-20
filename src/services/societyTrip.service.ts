import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';

export interface CreateSocietyTripInput {
  customerId: string;
  agencyName: string;
  scheduledAt: Date;
  tankerSizeLiters: number;
  photoUrl: string;
}

export class SocietyTripService {
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
