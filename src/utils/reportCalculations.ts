import { Booking } from '../types';

const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface MonthlyData {
  totalRevenue: number;
  totalOrders: number;
}

export interface DailyBreakdownItem {
  day: number;
  revenue: number;
  orders: number;
}

export interface MonthlyBreakdownItem {
  month: string;
  revenue: number;
  orders: number;
}

/**
 * Calculate monthly revenue and order statistics
 */
export const calculateMonthlyData = (
  bookings: Booking[],
  selectedYear: number,
  selectedMonth: number
): MonthlyData => {
  const monthStart = new Date(selectedYear, selectedMonth, 1);
  const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

  const monthBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt);
    return bookingDate >= monthStart && bookingDate <= monthEnd;
  });

  const completedBookings = monthBookings.filter(b => b.status === 'delivered');
  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalOrders = completedBookings.length;

  return { totalRevenue, totalOrders };
};

/**
 * Calculate daily breakdown for a specific month
 */
export const calculateDailyBreakdown = (
  bookings: Booking[],
  selectedYear: number,
  selectedMonth: number
): DailyBreakdownItem[] => {
  const monthStart = new Date(selectedYear, selectedMonth, 1);
  const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
  const daysInMonth = monthEnd.getDate();

  const dailyData: DailyBreakdownItem[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStart = new Date(selectedYear, selectedMonth, day, 0, 0, 0, 0);
    const dayEnd = new Date(selectedYear, selectedMonth, day, 23, 59, 59, 999);

    const dayBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= dayStart && bookingDate <= dayEnd && booking.status === 'delivered';
    });

    const dayRevenue = dayBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const dayOrders = dayBookings.length;

    dailyData.push({
      day,
      revenue: dayRevenue,
      orders: dayOrders,
    });
  }

  return dailyData;
};

/**
 * Calculate yearly revenue and order statistics
 */
export const calculateYearlyData = (
  bookings: Booking[],
  selectedYear: number
): MonthlyData => {
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  const yearBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt);
    return bookingDate >= yearStart && bookingDate <= yearEnd;
  });

  const completedBookings = yearBookings.filter(b => b.status === 'delivered');
  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalOrders = completedBookings.length;

  return { totalRevenue, totalOrders };
};

/**
 * Calculate monthly breakdown for a specific year
 */
export const calculateMonthlyBreakdown = (
  bookings: Booking[],
  selectedYear: number
): MonthlyBreakdownItem[] => {
  const monthlyData: MonthlyBreakdownItem[] = [];
  
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthStart = new Date(selectedYear, monthIndex, 1);
    const monthEnd = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59, 999);

    const monthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= monthStart && bookingDate <= monthEnd && booking.status === 'delivered';
    });

    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const monthOrders = monthBookings.length;

    monthlyData.push({
      month: fullMonthNames[monthIndex],
      revenue: monthRevenue,
      orders: monthOrders,
    });
  }

  return monthlyData;
};

