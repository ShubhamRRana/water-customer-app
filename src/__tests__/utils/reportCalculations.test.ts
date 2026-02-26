/**
 * Report Calculations Tests
 */

import {
  calculateMonthlyData,
  calculateDailyBreakdown,
  calculateYearlyData,
  calculateMonthlyBreakdown,
  MonthlyData,
  DailyBreakdownItem,
  MonthlyBreakdownItem,
} from '../../utils/reportCalculations';
import { Booking } from '../../types';

describe('Report Calculations', () => {
  const createMockBooking = (
    id: string,
    date: Date,
    status: Booking['status'],
    totalPrice: number
  ): Booking => ({
    id,
    customerId: 'customer-1',
    customerName: 'Test Customer',
    customerPhone: '1234567890',
    status,
    totalPrice,
    createdAt: date,
    updatedAt: date,
    deliveryAddress: {
      address: 'Test Street, Test City, Test State, 123456',
      latitude: 28.6139,
      longitude: 77.2090,
    },
    tankerSize: 10000,
    distance: 10,
    basePrice: 600,
    distanceCharge: 50,
    agencyId: 'agency-1',
    paymentStatus: 'completed',
    canCancel: false,
  });

  describe('calculateMonthlyData', () => {
    it('should calculate monthly revenue and orders for completed bookings', () => {
      const year = 2024;
      const month = 0; // January

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'delivered', 650),
        createMockBooking('2', new Date(2024, 0, 20), 'delivered', 700),
        createMockBooking('3', new Date(2024, 0, 25), 'pending', 600), // Should not count
        createMockBooking('4', new Date(2023, 11, 30), 'delivered', 500), // Different month
        createMockBooking('5', new Date(2024, 1, 5), 'delivered', 550), // Different month
      ];

      const result = calculateMonthlyData(bookings, year, month);

      expect(result.totalRevenue).toBe(1350); // 650 + 700
      expect(result.totalOrders).toBe(2);
    });

    it('should return zero for month with no completed bookings', () => {
      const year = 2024;
      const month = 2; // March

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'pending', 650),
        createMockBooking('2', new Date(2024, 1, 20), 'cancelled', 700),
      ];

      const result = calculateMonthlyData(bookings, year, month);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
    });

    it('should handle empty bookings array', () => {
      const result = calculateMonthlyData([], 2024, 0);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
    });

    it('should include bookings on first and last day of month', () => {
      const year = 2024;
      const month = 0; // January

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 1, 0, 0, 0), 'delivered', 600),
        createMockBooking('2', new Date(2024, 0, 31, 23, 59, 59), 'delivered', 700),
      ];

      const result = calculateMonthlyData(bookings, year, month);

      expect(result.totalRevenue).toBe(1300);
      expect(result.totalOrders).toBe(2);
    });
  });

  describe('calculateDailyBreakdown', () => {
    it('should calculate daily breakdown for a month', () => {
      const year = 2024;
      const month = 0; // January (31 days)

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'delivered', 650),
        createMockBooking('2', new Date(2024, 0, 15), 'delivered', 700), // Same day
        createMockBooking('3', new Date(2024, 0, 20), 'delivered', 600),
        createMockBooking('4', new Date(2024, 0, 25), 'pending', 500), // Should not count
      ];

      const result = calculateDailyBreakdown(bookings, year, month);

      expect(result.length).toBe(31); // All days in January
      expect(result[14].revenue).toBe(1350); // Day 15 (0-indexed: 14)
      expect(result[14].orders).toBe(2);
      expect(result[19].revenue).toBe(600); // Day 20
      expect(result[19].orders).toBe(1);
      expect(result[24].revenue).toBe(0); // Day 25 (pending booking)
      expect(result[24].orders).toBe(0);
    });

    it('should return zero revenue for days with no bookings', () => {
      const year = 2024;
      const month = 0;

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'delivered', 650),
      ];

      const result = calculateDailyBreakdown(bookings, year, month);

      // Day 1 should have zero revenue
      expect(result[0].revenue).toBe(0);
      expect(result[0].orders).toBe(0);
      expect(result[0].day).toBe(1);
    });

    it('should handle February correctly (28/29 days)', () => {
      const year = 2024; // Leap year
      const month = 1; // February

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 1, 15), 'delivered', 650),
      ];

      const result = calculateDailyBreakdown(bookings, year, month);

      expect(result.length).toBe(29); // 2024 is a leap year
    });

    it('should handle empty bookings array', () => {
      const year = 2024;
      const month = 0;

      const result = calculateDailyBreakdown([], year, month);

      expect(result.length).toBe(31);
      result.forEach((day) => {
        expect(day.revenue).toBe(0);
        expect(day.orders).toBe(0);
      });
    });
  });

  describe('calculateYearlyData', () => {
    it('should calculate yearly revenue and orders for completed bookings', () => {
      const year = 2024;

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'delivered', 650),
        createMockBooking('2', new Date(2024, 5, 20), 'delivered', 700),
        createMockBooking('3', new Date(2024, 11, 25), 'delivered', 600),
        createMockBooking('4', new Date(2023, 11, 30), 'delivered', 500), // Different year
        createMockBooking('5', new Date(2024, 6, 10), 'pending', 550), // Should not count
      ];

      const result = calculateYearlyData(bookings, year);

      expect(result.totalRevenue).toBe(1950); // 650 + 700 + 600
      expect(result.totalOrders).toBe(3);
    });

    it('should return zero for year with no completed bookings', () => {
      const year = 2024;

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'pending', 650),
        createMockBooking('2', new Date(2024, 5, 20), 'cancelled', 700),
      ];

      const result = calculateYearlyData(bookings, year);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
    });

    it('should include bookings from January 1 to December 31', () => {
      const year = 2024;

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 1, 0, 0, 0), 'delivered', 600),
        createMockBooking('2', new Date(2024, 11, 31, 23, 59, 59), 'delivered', 700),
      ];

      const result = calculateYearlyData(bookings, year);

      expect(result.totalRevenue).toBe(1300);
      expect(result.totalOrders).toBe(2);
    });

    it('should handle empty bookings array', () => {
      const result = calculateYearlyData([], 2024);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
    });
  });

  describe('calculateMonthlyBreakdown', () => {
    it('should calculate monthly breakdown for a year', () => {
      const year = 2024;

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'delivered', 650), // January
        createMockBooking('2', new Date(2024, 0, 20), 'delivered', 700), // January
        createMockBooking('3', new Date(2024, 5, 10), 'delivered', 600), // June
        createMockBooking('4', new Date(2024, 11, 25), 'delivered', 550), // December
        createMockBooking('5', new Date(2024, 2, 5), 'pending', 500), // Should not count
      ];

      const result = calculateMonthlyBreakdown(bookings, year);

      expect(result.length).toBe(12);
      expect(result[0].month).toBe('January');
      expect(result[0].revenue).toBe(1350); // 650 + 700
      expect(result[0].orders).toBe(2);
      expect(result[5].month).toBe('June');
      expect(result[5].revenue).toBe(600);
      expect(result[5].orders).toBe(1);
      expect(result[11].month).toBe('December');
      expect(result[11].revenue).toBe(550);
      expect(result[11].orders).toBe(1);
    });

    it('should return zero for months with no completed bookings', () => {
      const year = 2024;

      const bookings: Booking[] = [
        createMockBooking('1', new Date(2024, 0, 15), 'delivered', 650), // January only
      ];

      const result = calculateMonthlyBreakdown(bookings, year);

      expect(result.length).toBe(12);
      expect(result[0].revenue).toBe(650);
      expect(result[0].orders).toBe(1);
      // All other months should have zero
      for (let i = 1; i < 12; i++) {
        expect(result[i].revenue).toBe(0);
        expect(result[i].orders).toBe(0);
      }
    });

    it('should return all 12 months in correct order', () => {
      const result = calculateMonthlyBreakdown([], 2024);

      expect(result.length).toBe(12);
      expect(result[0].month).toBe('January');
      expect(result[1].month).toBe('February');
      expect(result[2].month).toBe('March');
      expect(result[3].month).toBe('April');
      expect(result[4].month).toBe('May');
      expect(result[5].month).toBe('June');
      expect(result[6].month).toBe('July');
      expect(result[7].month).toBe('August');
      expect(result[8].month).toBe('September');
      expect(result[9].month).toBe('October');
      expect(result[10].month).toBe('November');
      expect(result[11].month).toBe('December');
    });

    it('should handle empty bookings array', () => {
      const result = calculateMonthlyBreakdown([], 2024);

      expect(result.length).toBe(12);
      result.forEach((month) => {
        expect(month.revenue).toBe(0);
        expect(month.orders).toBe(0);
      });
    });
  });
});

