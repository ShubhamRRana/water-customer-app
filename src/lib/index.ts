/**
 * Data Access Layer Exports
 * 
 * Central export point for data access layer components.
 * Uses SupabaseDataAccess as the default implementation.
 */

export { IDataAccessLayer, IUserDataAccess, IBookingDataAccess, IVehicleDataAccess, IBankAccountDataAccess, IExpenseDataAccess } from './dataAccess.interface';
export { SupabaseDataAccess } from './supabaseDataAccess';

// Use SupabaseDataAccess as the default data access layer
import { SupabaseDataAccess } from './supabaseDataAccess';
import type { IDataAccessLayer } from './dataAccess.interface';
export const dataAccess: IDataAccessLayer = new SupabaseDataAccess();
export { supabase } from './supabaseClient';
export { SubscriptionManager, subscriptionManager, createManagedSubscription } from './subscriptionManager';
export type { SubscriptionCallback, CollectionSubscriptionCallback, Unsubscribe } from './dataAccess.interface';

