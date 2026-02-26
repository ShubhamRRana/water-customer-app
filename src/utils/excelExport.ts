/**
 * Excel Export Utility
 * 
 * Provides functionality to export booking data to Excel format
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Booking, Expense } from '../types';
import { formatDate } from './dateUtils';
import { PricingUtils } from './pricing';
import { errorLogger } from './errorLogger';
import { DailyBreakdownItem, MonthlyBreakdownItem } from './reportCalculations';

// Get document directory using legacy API
const getDocumentDirectory = (): string => {
  return FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
};


/**
 * Export bookings to Excel file for a specific year
 * @param bookings - Array of bookings to export
 * @param year - Year to filter bookings
 * @param fileName - Optional custom file name
 * @param isCustomerExport - If true, exports customer-specific data; if false, exports admin data
 */
export async function exportBookingsToExcel(
  bookings: Booking[],
  year: number,
  fileName?: string,
  isCustomerExport: boolean = false
): Promise<void> {
  try {
    // Filter bookings for the specified year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const yearBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= yearStart && bookingDate <= yearEnd;
    });

    if (yearBookings.length === 0) {
      throw new Error(`No bookings found for year ${year}`);
    }

    // Prepare data for Excel
    const excelData = yearBookings.map(booking => {
      const bookingDate = new Date(booking.createdAt);
      const deliveredDate = booking.deliveredAt ? new Date(booking.deliveredAt) : null;
      const acceptedDate = booking.acceptedAt ? new Date(booking.acceptedAt) : null;

      const baseRow: Record<string, any> = {
        'Booking ID': booking.id,
        'Date': formatDate(bookingDate, 'date'),
        'Time': formatDate(bookingDate, 'time'),
        'Status': booking.status,
        'Tanker Size (Liters)': booking.tankerSize,
        'Quantity': booking.quantity || 1,
        'Distance (km)': booking.distance.toFixed(2),
        'Base Price': PricingUtils.formatPrice(booking.basePrice),
        'Distance Charge': PricingUtils.formatPrice(booking.distanceCharge),
        'Total Price': PricingUtils.formatPrice(booking.totalPrice),
        'Payment Status': booking.paymentStatus,
        'Address': booking.deliveryAddress.address,
        'Latitude': booking.deliveryAddress.latitude,
        'Longitude': booking.deliveryAddress.longitude,
        'Accepted At': acceptedDate ? formatDate(acceptedDate, 'datetime') : '',
        'Delivered At': deliveredDate ? formatDate(deliveredDate, 'datetime') : '',
      };

      if (isCustomerExport) {
        // Customer export - include driver info if available
        return {
          ...baseRow,
          'Driver Name': booking.driverName || 'Not Assigned',
          'Driver Phone': booking.driverPhone || '',
        };
      } else {
        // Admin export - include customer and driver info
        return {
          ...baseRow,
          'Customer Name': booking.customerName,
          'Customer Phone': booking.customerPhone,
          'Driver Name': booking.driverName || 'Not Assigned',
          'Driver Phone': booking.driverPhone || '',
          'Agency Name': booking.agencyName || '',
        };
      }
    });

    // Generate CSV content
    const headers = Object.keys(excelData[0]);
    const csvRows: string[] = [];
    
    // Add headers
    csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
    
    // Add data rows
    excelData.forEach((row: Record<string, any>) => {
      const values = headers.map(header => {
        const value = row[header] ?? '';
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');

    // Generate file name (using .csv extension, but Excel will open it)
    const defaultFileName = isCustomerExport 
      ? `Customer_Orders_${year}.csv`
      : `Reports_${year}.csv`;
    const finalFileName = fileName || defaultFileName;

    // Write to file
    const docDir = getDocumentDirectory();
    const fileUri = `${docDir}${finalFileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${year} Data`,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    errorLogger.medium('Failed to export bookings to Excel', error, { year, isCustomerExport });
    throw error;
  }
}

/**
 * Export report data to Excel file
 * @param periodType - 'month' or 'year'
 * @param selectedYear - Selected year
 * @param selectedMonth - Selected month (0-11, only used for month period)
 * @param totalRevenue - Total revenue for the period
 * @param totalOrders - Total orders for the period
 * @param dailyBreakdown - Daily breakdown data (for month view)
 * @param monthlyBreakdown - Monthly breakdown data (for year view)
 * @param fileName - Optional custom file name
 */
export async function exportReportToExcel(
  periodType: 'month' | 'year',
  selectedYear: number,
  selectedMonth: number,
  totalRevenue: number,
  totalOrders: number,
  dailyBreakdown: DailyBreakdownItem[],
  monthlyBreakdown: MonthlyBreakdownItem[],
  fileName?: string
): Promise<void> {
  try {
    // Generate CSV content with multiple sections
    const csvRows: string[] = [];
    
    // Summary section
    csvRows.push('Summary');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Revenue,"${PricingUtils.formatPrice(totalRevenue)}"`);
    csvRows.push(`Total Orders,"${PricingUtils.formatNumber(totalOrders)}"`);
    csvRows.push(''); // Empty row separator
    
    // Breakdown section
    let breakdownData: Array<Record<string, any>> = [];
    let defaultFileName: string;
    let sectionTitle: string;
    
    if (periodType === 'month') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      breakdownData = dailyBreakdown.map(item => ({
        'Day': item.day,
        'Revenue': PricingUtils.formatPrice(item.revenue),
        'Orders': item.orders,
      }));
      defaultFileName = `Report_${monthNames[selectedMonth]}_${selectedYear}.csv`;
      sectionTitle = 'Daily Breakdown';
    } else {
      breakdownData = monthlyBreakdown.map(item => ({
        'Month': item.month,
        'Revenue': PricingUtils.formatPrice(item.revenue),
        'Orders': item.orders,
      }));
      defaultFileName = `Report_${selectedYear}.csv`;
      sectionTitle = 'Monthly Breakdown';
    }

    // Add breakdown section
    csvRows.push(sectionTitle);
    
    if (breakdownData.length > 0) {
      const breakdownHeaders = Object.keys(breakdownData[0]);
      csvRows.push(breakdownHeaders.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
      
      breakdownData.forEach((row: Record<string, any>) => {
        const values = breakdownHeaders.map(header => {
          const value = row[header] ?? '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });
    } else {
      // Handle empty breakdown data
      csvRows.push('No data available');
    }

    const csvContent = csvRows.join('\n');

    // Generate file name
    const finalFileName = fileName || defaultFileName;

    // Write to file
    const docDir = getDocumentDirectory();
    const fileUri = `${docDir}${finalFileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const dialogTitle = periodType === 'month' 
        ? `Export ${monthNames[selectedMonth]} ${selectedYear} Report`
        : `Export ${selectedYear} Report`;
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

  } catch (error) {
    errorLogger.medium('Failed to export report to Excel', error, { periodType, selectedYear, selectedMonth });
    throw error;
  }
}

/**
 * Export expenses to Excel file (CSV format)
 * @param expenses - Array of expenses to export
 * @param periodType - 'month' or 'year'
 * @param selectedYear - Selected year
 * @param selectedMonth - Selected month (0-11, only used for month period)
 * @param fileName - Optional custom file name
 */
export async function exportExpensesToExcel(
  expenses: Expense[],
  periodType: 'month' | 'year',
  selectedYear: number,
  selectedMonth: number,
  fileName?: string
): Promise<void> {
  try {
    // Filter expenses based on period
    let filteredExpenses: Expense[] = [];
    
    if (periodType === 'month') {
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      
      filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });
    } else {
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      
      filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= yearStart && expenseDate <= yearEnd;
      });
    }

    if (filteredExpenses.length === 0) {
      throw new Error(`No expenses found for the selected period`);
    }

    // Calculate summary
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const dieselExpenses = filteredExpenses.filter(e => e.expenseType === 'diesel');
    const maintenanceExpenses = filteredExpenses.filter(e => e.expenseType === 'maintenance');
    const dieselTotal = dieselExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const maintenanceTotal = maintenanceExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Generate CSV content with multiple sections
    const csvRows: string[] = [];
    
    // Summary section
    csvRows.push('Summary');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Expenses,"${PricingUtils.formatPrice(totalAmount)}"`);
    csvRows.push(`Diesel Expenses,"${PricingUtils.formatPrice(dieselTotal)}"`);
    csvRows.push(`Maintenance Expenses,"${PricingUtils.formatPrice(maintenanceTotal)}"`);
    csvRows.push(`Total Count,"${filteredExpenses.length}"`);
    csvRows.push(''); // Empty row separator
    
    // Expense details section
    csvRows.push('Expense Details');
    
    // Prepare data for Excel
    const excelData = filteredExpenses.map(expense => {
      const expenseDate = new Date(expense.expenseDate);
      const createdAt = new Date(expense.createdAt);
      
      return {
        'Date': formatDate(expenseDate, 'date'),
        'Type': expense.expenseType === 'diesel' ? 'Diesel' : 'Maintenance',
        'Amount (₹)': PricingUtils.formatPrice(expense.amount),
        'Description': expense.description || '',
        'Created At': formatDate(createdAt, 'datetime'),
      };
    });

    if (excelData.length > 0) {
      const headers = Object.keys(excelData[0]);
      csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
      
      excelData.forEach((row: Record<string, any>) => {
        const values = headers.map(header => {
          const value = row[header] ?? '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });
    } else {
      csvRows.push('No data available');
    }

    const csvContent = csvRows.join('\n');

    // Generate file name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const defaultFileName = periodType === 'month'
      ? `Expenses_${monthNames[selectedMonth]}_${selectedYear}.csv`
      : `Expenses_${selectedYear}.csv`;
    const finalFileName = fileName || defaultFileName;

    // Write to file
    const docDir = getDocumentDirectory();
    const fileUri = `${docDir}${finalFileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      const dialogTitle = periodType === 'month'
        ? `Export ${monthNames[selectedMonth]} ${selectedYear} Expenses`
        : `Export ${selectedYear} Expenses`;
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

  } catch (error) {
    errorLogger.medium('Failed to export expenses to Excel', error, { periodType, selectedYear, selectedMonth });
    throw error;
  }
}

