import { dataAccess } from '../lib/index';
import { Booking, BookingStatus } from '../types/index';
import { handleAsyncOperationWithRethrow, handleError } from '../utils/errorHandler';
import type { PaginationOptions, BookingQueryOptions } from '../lib/dataAccess.interface';

/**
 * Booking Service
 * 
 * Handles all booking-related operations including creation, updates, status changes,
 * and retrieval of bookings. Uses dataAccess layer for data persistence.
 * 
 * @example
 * ```typescript
 * // Create a new booking
 * const bookingId = await BookingService.createBooking({
 *   customerId: 'customer-123',
 *   agencyId: 'agency-456',
 *   // ... other booking data
 * });
 * 
 * // Update booking status
 * await BookingService.updateBookingStatus(bookingId, 'accepted');
 * ```
 */
export class BookingService {
  /**
   * Create a new booking in local storage
   * Note: bookingData.customerId, agencyId, driverId should be id values
   */
  static async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const id = dataAccess.generateId();
        const newBooking: Booking = {
          ...bookingData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await dataAccess.bookings.saveBooking(newBooking);
        return id;
      },
      {
        context: { operation: 'createBooking', customerId: bookingData.customerId, agencyId: bookingData.agencyId },
        userFacing: false,
      }
    );
  }

  /**
   * Update booking status in local storage
   */
  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    additionalData?: Partial<Booking>
  ): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const existingBooking = await dataAccess.bookings.getBookingById(bookingId);
        if (!existingBooking) {
          throw new Error('Booking not found');
        }

        const updates: Partial<Booking> = {
          status,
          updatedAt: new Date(),
        };

        if (status === 'accepted') {
          updates.acceptedAt = new Date();
        } else if (status === 'delivered') {
          updates.deliveredAt = new Date();
        }

        // Merge additional data
        if (additionalData) {
          Object.assign(updates, additionalData);
        }

        await dataAccess.bookings.updateBooking(bookingId, updates);

        // Keep driver earnings in sync with monthly delivered bookings
        if (status === 'delivered') {
          const driverId = additionalData?.driverId || existingBooking.driverId;
          if (driverId) {
            try {
              const now = new Date();
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const monthlyDeliveredBookings = await this.getBookingsForEarnings(driverId, {
                startDate: monthStart,
                status: ['delivered'],
              });

              const monthlyEarnings = monthlyDeliveredBookings.reduce(
                (sum, booking) => sum + (booking.totalPrice || 0),
                0
              );
              const monthlyCompleted = monthlyDeliveredBookings.length;

              await dataAccess.users.updateUserProfile(driverId, {
                totalEarnings: monthlyEarnings,
                completedOrders: monthlyCompleted,
              });
            } catch (earningsError) {
              // Failed to update driver monthly earnings - log but don't fail the main operation
              handleError(earningsError, {
                context: { operation: 'updateDriverEarnings', driverId, bookingId },
                userFacing: false,
              });
            }
          }
        }
      },
      {
        context: { operation: 'updateBookingStatus', bookingId, status },
        userFacing: false,
      }
    );
  }

  /**
   * Get all bookings for a customer by id
   * @param options - Optional pagination and sorting options
   */
  static async getBookingsByCustomer(
    customerId: string, 
    options?: { limit?: number; offset?: number; sortBy?: 'createdAt' | 'updatedAt'; sortOrder?: 'asc' | 'desc' }
  ): Promise<Booking[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        // Map service options to data access options (camelCase to snake_case)
        const paginationOptions: PaginationOptions = {
          limit: options?.limit,
          offset: options?.offset,
          sortBy: options?.sortBy === 'createdAt' ? 'created_at' : options?.sortBy === 'updatedAt' ? 'updated_at' : undefined,
          sortOrder: options?.sortOrder,
        };
        
        const bookings = await dataAccess.bookings.getBookingsByCustomer(customerId, paginationOptions);
        return bookings;
      },
      {
        context: { operation: 'getBookingsByCustomer', customerId, options },
        userFacing: false,
      }
    );
  }

  /**
   * Get all available bookings (pending status, no driver assigned)
   * @param options - Optional pagination and sorting options
   */
  static async getAvailableBookings(
    options?: { limit?: number; offset?: number; sortBy?: 'createdAt'; sortOrder?: 'asc' | 'desc' }
  ): Promise<Booking[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        // Map service options to data access options (camelCase to snake_case)
        const paginationOptions: PaginationOptions = {
          limit: options?.limit,
          offset: options?.offset,
          sortBy: options?.sortBy === 'createdAt' ? 'created_at' : undefined,
          sortOrder: options?.sortOrder,
        };
        
        const bookings = await dataAccess.bookings.getAvailableBookings(paginationOptions);
        return bookings;
      },
      {
        context: { operation: 'getAvailableBookings', options },
        userFacing: false,
      }
    );
  }

  /**
   * Get bookings for a driver by id with optional filtering
   * @param driverId - The driver's ID
   * @param options - Optional filtering, pagination and sorting options
   */
  static async getBookingsByDriver(
    driverId: string, 
    options?: { 
      status?: BookingStatus[]; 
      limit?: number; 
      offset?: number; 
      sortBy?: 'createdAt' | 'updatedAt' | 'deliveredAt'; 
      sortOrder?: 'asc' | 'desc' 
    }
  ): Promise<Booking[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        // Map service options to data access options (camelCase to snake_case)
        const queryOptions: BookingQueryOptions = {
          status: options?.status,
          limit: options?.limit,
          offset: options?.offset,
          sortBy: options?.sortBy === 'createdAt' ? 'created_at' : 
                  options?.sortBy === 'updatedAt' ? 'updated_at' : 
                  options?.sortBy === 'deliveredAt' ? 'delivered_at' : undefined,
          sortOrder: options?.sortOrder,
        };
        
        const bookings = await dataAccess.bookings.getBookingsByDriver(driverId, queryOptions);
        return bookings;
      },
      {
        context: { operation: 'getBookingsByDriver', driverId, options },
        userFacing: false,
      }
    );
  }

  /**
   * Get bookings for earnings calculation with date filtering
   * Optimized to only fetch completed bookings within date range
   */
  static async getBookingsForEarnings(
    driverId: string,
    options?: { 
      startDate?: Date; 
      endDate?: Date; 
      status?: BookingStatus[];
    }
  ): Promise<Booking[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        // Get all bookings for driver and filter client-side
        const allBookings = await dataAccess.bookings.getBookingsByDriver(driverId);
        
        // Filter by status (default to delivered for earnings)
        const statusFilter = options?.status || ['delivered'];
        let filtered = allBookings.filter(b => statusFilter.includes(b.status));
        
        // Filter by date range if provided
        if (options?.startDate) {
          filtered = filtered.filter(b => b.deliveredAt && b.deliveredAt >= options.startDate!);
        }
        if (options?.endDate) {
          filtered = filtered.filter(b => b.deliveredAt && b.deliveredAt <= options.endDate!);
        }
        
        return filtered;
      },
      {
        context: { operation: 'getBookingsForEarnings', driverId, options },
        userFacing: false,
      }
    );
  }

  /**
   * Get all bookings (admin only)
   * @param options - Optional pagination and sorting options
   */
  static async getAllBookings(options?: { limit?: number; offset?: number; sortBy?: 'createdAt' | 'updatedAt'; sortOrder?: 'asc' | 'desc' }): Promise<Booking[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        // Map service options to data access options (camelCase to snake_case)
        const paginationOptions: PaginationOptions = {
          limit: options?.limit,
          offset: options?.offset,
          sortBy: options?.sortBy === 'createdAt' ? 'created_at' : options?.sortBy === 'updatedAt' ? 'updated_at' : undefined,
          sortOrder: options?.sortOrder,
        };
        
        const bookings = await dataAccess.bookings.getBookings(paginationOptions);
        return bookings;
      },
      {
        context: { operation: 'getAllBookings', options },
        userFacing: false,
      }
    );
  }

  /**
   * Get a single booking by ID
   */
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const booking = await dataAccess.bookings.getBookingById(bookingId);
        return booking;
      },
      {
        context: { operation: 'getBookingById', bookingId },
        userFacing: false,
      }
    );
  }

  /**
   * Subscribe to real-time booking updates
   * Uses the dataAccess layer which supports real-time subscriptions with Supabase
   */
  static subscribeToBookingUpdates(
    bookingId: string,
    callback: (booking: Booking | null) => void
  ): () => void {
    return dataAccess.bookings.subscribeToBookingUpdates(bookingId, callback);
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, reason: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        await dataAccess.bookings.updateBooking(bookingId, {
          status: 'cancelled',
          cancellationReason: reason,
          updatedAt: new Date(),
        });
      },
      {
        context: { operation: 'cancelBooking', bookingId, reason },
        userFacing: false,
      }
    );
  }
}
