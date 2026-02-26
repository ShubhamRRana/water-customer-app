// Payment service for Cash on Delivery (COD) implementation
// This is a simplified version for MVP - payment gateway integration will be added in v2

import { dataAccess } from '../lib/index';
import { handleError } from '../utils/errorHandler';
import { getErrorMessage } from '../utils/errors';

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Process Cash on Delivery payment - marks payment as pending in local storage
   */
  static async processCODPayment(bookingId: string, amount: number): Promise<PaymentResult> {
    try {
      // Check if booking exists first
      const booking = await dataAccess.bookings.getBookingById(bookingId);
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      // For COD, we just mark the payment as pending in the booking
      // The actual payment happens when the driver delivers
      const paymentId = `cod_${bookingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await dataAccess.bookings.updateBooking(bookingId, {
        paymentStatus: 'pending',
        paymentId,
      });
      
      return {
        success: true,
        paymentId,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'processCODPayment', bookingId, amount },
        userFacing: false,
      });
      return {
        success: false,
        error: getErrorMessage(error, 'Payment processing failed'),
      };
    }
  }

  /**
   * Mark payment as completed when driver confirms delivery
   */
  static async confirmCODPayment(bookingId: string): Promise<PaymentResult> {
    try {
      // Check if booking exists first
      const booking = await dataAccess.bookings.getBookingById(bookingId);
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      const paymentId = `cod_confirmed_${bookingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await dataAccess.bookings.updateBooking(bookingId, {
        paymentStatus: 'completed',
        paymentId,
      });
      
      return {
        success: true,
        paymentId,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'confirmCODPayment', bookingId },
        userFacing: false,
      });
      return {
        success: false,
        error: getErrorMessage(error, 'Payment confirmation failed'),
      };
    }
  }

  // Future implementation for online payments (v2)
  static async processOnlinePayment(
    bookingId: string,
    amount: number,
    paymentMethod: 'razorpay' | 'stripe'
  ): Promise<PaymentResult> {
    // This will be implemented in v2 with actual payment gateway integration
    throw new Error('Online payments not implemented in MVP. Use COD instead.');
  }
}
