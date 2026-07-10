import type { Booking } from '../types';

export type BookingPaymentChip = 'paid' | 'unpaid' | 'failed' | 'cod' | 'refunded';

export function getBookingPaymentChip(booking: Booking): BookingPaymentChip {
  if (booking.paymentStatus === 'completed') return 'paid';
  if (booking.paymentStatus === 'failed') return 'failed';
  if (booking.paymentStatus === 'refunded') return 'refunded';
  if (booking.totalPrice <= 0) return 'cod';
  if (booking.paymentId?.startsWith('cod_')) return 'cod';
  return 'unpaid';
}

export function getBookingPaymentChipLabel(chip: BookingPaymentChip): string {
  switch (chip) {
    case 'paid':
      return 'Paid';
    case 'unpaid':
      return 'Unpaid';
    case 'failed':
      return 'Failed';
    case 'cod':
      return 'COD';
    case 'refunded':
      return 'Refunded';
    default:
      return 'Unknown';
  }
}

/** Booking is unpaid and priced — the customer pays the driver (QR scan or cash) at delivery. */
export function shouldShowPayAtDeliveryNote(booking: Booking): boolean {
  if (booking.status === 'cancelled') return false;
  if (booking.totalPrice <= 0) return false;
  return booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed';
}

export function getBookingPaymentStatusLabel(booking: Booking): string {
  const chip = getBookingPaymentChip(booking);
  if (chip === 'paid' && booking.paymentId?.startsWith('pay_')) {
    return 'Paid online';
  }
  if (chip === 'paid') {
    return 'Paid';
  }
  return getBookingPaymentChipLabel(chip);
}
