/**
 * In-memory dataAccess implementation for BookingService unit tests.
 * Keeps tests independent of Supabase / expo-constants.
 */
import type { PaginationOptions, BookingQueryOptions } from '../../lib/dataAccess.interface';
import type { Booking, User } from '../../types/index';
import { NotFoundError } from '../../utils/errors';

export const bookingTestStore = new Map<string, Booking>();

export function clearBookingTestStore(): void {
  bookingTestStore.clear();
}

function sortKeyFromOptions(sortBy?: string): keyof Booking {
  if (sortBy === 'updated_at' || sortBy === 'updatedAt') return 'updatedAt';
  if (sortBy === 'delivered_at' || sortBy === 'deliveredAt') return 'deliveredAt' as keyof Booking;
  return 'createdAt';
}

function sortAndPaginate(list: Booking[], options?: PaginationOptions): Booking[] {
  const key = sortKeyFromOptions(options?.sortBy);
  const order = options?.sortOrder === 'asc' ? 1 : -1;
  const sorted = [...list].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const at = av instanceof Date ? av.getTime() : 0;
    const bt = bv instanceof Date ? bv.getTime() : 0;
    return (at - bt) * order;
  });
  const offset = options?.offset ?? 0;
  const limit = options?.limit;
  if (limit != null) {
    return sorted.slice(offset, offset + limit);
  }
  return offset > 0 ? sorted.slice(offset) : sorted;
}

export const inMemoryDataAccessForBookingTests = {
  generateId(): string {
    return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  bookings: {
    async saveBooking(booking: Booking): Promise<void> {
      bookingTestStore.set(booking.id, { ...booking });
    },

    async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
      const existing = bookingTestStore.get(bookingId);
      if (!existing) {
        throw new NotFoundError('Booking', bookingId);
      }
      bookingTestStore.set(bookingId, { ...existing, ...updates });
    },

    async getBookings(options?: PaginationOptions): Promise<Booking[]> {
      return sortAndPaginate([...bookingTestStore.values()], options);
    },

    async getBookingById(bookingId: string): Promise<Booking | null> {
      return bookingTestStore.get(bookingId) ?? null;
    },

    async getBookingsByCustomer(customerId: string, options?: PaginationOptions): Promise<Booking[]> {
      const list = [...bookingTestStore.values()].filter((b) => b.customerId === customerId);
      return sortAndPaginate(list, options);
    },

    async getBookingsByDriver(driverId: string, options?: BookingQueryOptions): Promise<Booking[]> {
      let list = [...bookingTestStore.values()].filter((b) => b.driverId === driverId);
      if (options?.status && options.status.length > 0) {
        list = list.filter((b) => options.status!.includes(b.status));
      }
      return sortAndPaginate(list, options);
    },

    async getAvailableBookings(options?: PaginationOptions): Promise<Booking[]> {
      const list = [...bookingTestStore.values()].filter(
        (b) => b.status === 'pending' && (b.driverId === undefined || b.driverId === null),
      );
      return sortAndPaginate(list, options);
    },

    subscribeToBookingUpdates(_bookingId: string, _callback: (b: Booking | null) => void): () => void {
      return () => {};
    },
  },

  users: {
    async updateUserProfile(_id: string, _updates: Partial<User>): Promise<void> {},
  },
};
