import type { Booking } from '../../types';
import { FEATURE_FLAGS } from '../../constants/config';
import {
  canPayBookingOnline,
  getBookingPaymentChip,
  getBookingPaymentChipLabel,
  getBookingPaymentStatusLabel,
  shouldShowPayAtDeliveryNote,
} from '../../utils/paymentDisplay';

const baseBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'book-1',
  customerId: 'cust-1',
  customerName: 'Test User',
  customerPhone: '9876543210',
  status: 'pending',
  tankerSize: 1000,
  basePrice: 500,
  distanceCharge: 100,
  totalPrice: 600,
  deliveryAddress: {
    address: '123 Test St, Test City',
    latitude: 0,
    longitude: 0,
  },
  distance: 10,
  paymentStatus: 'pending',
  canCancel: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('paymentDisplay', () => {
  describe('getBookingPaymentChip', () => {
    it('returns paid when payment is completed', () => {
      expect(getBookingPaymentChip(baseBooking({ paymentStatus: 'completed' }))).toBe('paid');
    });

    it('returns failed when payment failed', () => {
      expect(getBookingPaymentChip(baseBooking({ paymentStatus: 'failed' }))).toBe('failed');
    });

    it('returns refunded when payment is refunded', () => {
      expect(getBookingPaymentChip(baseBooking({ paymentStatus: 'refunded' }))).toBe('refunded');
    });

    it('returns cod when total price is zero', () => {
      expect(getBookingPaymentChip(baseBooking({ totalPrice: 0 }))).toBe('cod');
    });

    it('returns cod when payment id has cod prefix', () => {
      expect(
        getBookingPaymentChip(
          baseBooking({ paymentId: 'cod_book_1', paymentStatus: 'pending' })
        )
      ).toBe('cod');
    });

    it('returns unpaid for pending online payment', () => {
      expect(getBookingPaymentChip(baseBooking({ paymentStatus: 'pending' }))).toBe('unpaid');
    });
  });

  describe('getBookingPaymentChipLabel', () => {
    it('returns human-readable labels', () => {
      expect(getBookingPaymentChipLabel('paid')).toBe('Paid');
      expect(getBookingPaymentChipLabel('unpaid')).toBe('Unpaid');
      expect(getBookingPaymentChipLabel('failed')).toBe('Failed');
      expect(getBookingPaymentChipLabel('cod')).toBe('COD');
      expect(getBookingPaymentChipLabel('refunded')).toBe('Refunded');
    });
  });

  describe('canPayBookingOnline', () => {
    it('allows pay when online flag on and booking is pending with price', () => {
      expect(canPayBookingOnline(baseBooking({ paymentStatus: 'pending' }))).toBe(true);
    });

    it('allows pay when payment failed', () => {
      expect(canPayBookingOnline(baseBooking({ paymentStatus: 'failed' }))).toBe(true);
    });

    it('blocks pay when booking is cancelled', () => {
      expect(canPayBookingOnline(baseBooking({ status: 'cancelled' }))).toBe(false);
    });

    it('blocks pay when total price is zero', () => {
      expect(canPayBookingOnline(baseBooking({ totalPrice: 0 }))).toBe(false);
    });

    it('blocks pay when online payment flag is off', () => {
      const previous = FEATURE_FLAGS.enableOnlinePayment;
      FEATURE_FLAGS.enableOnlinePayment = false;
      try {
        expect(canPayBookingOnline(baseBooking())).toBe(false);
      } finally {
        FEATURE_FLAGS.enableOnlinePayment = previous;
      }
    });
  });

  describe('shouldShowPayAtDeliveryNote', () => {
    it('shows note for a pending priced booking', () => {
      expect(shouldShowPayAtDeliveryNote(baseBooking({ paymentStatus: 'pending' }))).toBe(true);
    });

    it('shows note when a previous payment attempt failed', () => {
      expect(shouldShowPayAtDeliveryNote(baseBooking({ paymentStatus: 'failed' }))).toBe(true);
    });

    it('hides note when booking is cancelled', () => {
      expect(shouldShowPayAtDeliveryNote(baseBooking({ status: 'cancelled' }))).toBe(false);
    });

    it('hides note when total price is zero', () => {
      expect(shouldShowPayAtDeliveryNote(baseBooking({ totalPrice: 0 }))).toBe(false);
    });

    it('hides note once payment is completed', () => {
      expect(shouldShowPayAtDeliveryNote(baseBooking({ paymentStatus: 'completed' }))).toBe(false);
    });
  });

  describe('getBookingPaymentStatusLabel', () => {
    it('returns Paid online when completed with pay_ prefix', () => {
      expect(
        getBookingPaymentStatusLabel(
          baseBooking({ paymentStatus: 'completed', paymentId: 'pay_razorpay_1' })
        )
      ).toBe('Paid online');
    });

    it('returns Paid when completed without pay_ prefix', () => {
      expect(
        getBookingPaymentStatusLabel(
          baseBooking({ paymentStatus: 'completed', paymentId: 'cod_confirmed_1' })
        )
      ).toBe('Paid');
    });

    it('returns chip label for non-paid statuses', () => {
      expect(getBookingPaymentStatusLabel(baseBooking({ paymentStatus: 'pending' }))).toBe('Unpaid');
    });
  });
});
