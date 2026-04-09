import { ERROR_MESSAGES } from '../constants/config';
import { supabase } from '../lib/supabaseClient';
import { SocietyTrip } from '../types';
import { handleError } from '../utils/errorHandler';
import { SubscriptionService } from './subscription.service';
import {
  societyPaymentPeriodKey,
  type SocietyPaymentCompletePeriod,
} from '../navigation/rootNavigation';

export interface CreateSocietyTripInput {
  customerId: string;
  agencyName: string;
  /** Admin/agency user id selected in the UI (enables admin-scoped Trip Details). */
  agencyAdminId?: string;
  scheduledAt: Date;
  tankerSizeLiters: number;
  /** Amount in ₹ (required when creating from the app) */
  tankerAmount: number;
  photoUrls: string[];
}

type SocietyTripRow = {
  id: string;
  customer_id: string;
  agency_name: string;
  scheduled_at: string;
  tanker_size_liters: number;
  tanker_amount: number | null;
  photo_urls: unknown;
  created_at: string;
};

function parsePhotoUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const urls = raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
    return [...new Set(urls)];
  }
  return [];
}

function mapRow(row: SocietyTripRow): SocietyTrip {
  return {
    id: row.id,
    customerId: row.customer_id,
    agencyName: row.agency_name,
    scheduledAt: new Date(row.scheduled_at),
    tankerSizeLiters: row.tanker_size_liters,
    tankerAmount:
      row.tanker_amount != null && Number.isFinite(row.tanker_amount)
        ? row.tanker_amount
        : null,
    photoUrls: parsePhotoUrls(row.photo_urls),
    createdAt: new Date(row.created_at),
  };
}

export class SocietyTripService {
  static async listTripsForCustomer(customerId: string): Promise<SocietyTrip[]> {
    try {
      const { data, error } = await supabase
        .from('society_trips')
        .select(
          'id, customer_id, agency_name, scheduled_at, tanker_size_liters, tanker_amount, photo_urls, created_at',
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
      const allowed = await SubscriptionService.hasActiveSubscription(input.customerId);
      if (!allowed) {
        const err = new Error(ERROR_MESSAGES.societyTrip.subscriptionRequired);
        (err as Error & { code: string }).code = 'SUBSCRIPTION_REQUIRED';
        throw err;
      }

      const { error } = await supabase.from('society_trips').insert({
        customer_id: input.customerId,
        agency_name: input.agencyName.trim(),
        ...(input.agencyAdminId ? { agency_admin_id: input.agencyAdminId } : {}),
        scheduled_at: input.scheduledAt.toISOString(),
        tanker_size_liters: input.tankerSizeLiters,
        tanker_amount: Math.round(input.tankerAmount),
        photo_urls: input.photoUrls,
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

  static async deleteTripsForCustomer(customerId: string, tripIds: string[]): Promise<void> {
    if (tripIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('society_trips')
        .delete()
        .eq('customer_id', customerId)
        .in('id', tripIds);

      if (error) {
        throw new Error(error.message || 'Failed to delete trips');
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'deleteSocietyTrips', customerId, tripIds },
        userFacing: false,
      });
      throw error;
    }
  }

  /** Keys match `societyPaymentPeriodKey` (e.g. `m:2026-2`, `y:2026`). */
  static async listCompletedPaymentPeriodKeys(customerId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('society_payment_periods_completed')
        .select('period_key')
        .eq('customer_id', customerId);

      if (error) {
        throw new Error(error.message || 'Failed to load payment periods');
      }
      const rows = (data ?? []) as { period_key: string }[];
      return rows.map((r) => r.period_key);
    } catch (error) {
      handleError(error, {
        context: { operation: 'listSocietyPaymentPeriodsCompleted', customerId },
        userFacing: false,
      });
      throw error;
    }
  }

  static async markPaymentPeriodComplete(
    customerId: string,
    period: SocietyPaymentCompletePeriod,
  ): Promise<void> {
    const periodKey = societyPaymentPeriodKey(period);
    try {
      const { error } = await supabase.from('society_payment_periods_completed').upsert(
        {
          customer_id: customerId,
          period_key: periodKey,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id,period_key' },
      );

      if (error) {
        throw new Error(error.message || 'Failed to save payment status');
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'markSocietyPaymentPeriodComplete', customerId, periodKey },
        userFacing: false,
      });
      throw error;
    }
  }
}
