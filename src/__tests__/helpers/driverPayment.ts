import { dataAccess } from '../../lib/index';

/**
 * Simulates the driver app marking a booking paid (QR scan or cash collected)
 * by writing to the shared database, as the real driver app does.
 */
export async function simulateDriverPaymentConfirmation(bookingId: string): Promise<string> {
  const paymentId = `driver_qr_${bookingId}`;
  await dataAccess.bookings.updateBooking(bookingId, {
    paymentStatus: 'completed',
    paymentId,
  });
  return paymentId;
}
