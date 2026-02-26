/**
 * Centralized Date Utilities
 * 
 * Provides consistent date formatting, parsing, and timezone handling across the application.
 * All dates should be stored/transmitted as ISO strings for Supabase compatibility.
 */

import { DATE_CONFIG } from '../constants/config';
import { errorLogger } from './errorLogger';

/**
 * Supported date formats for display
 */
export type DateFormat = 
  | 'short'           // Jan 15, 2024
  | 'medium'          // Jan 15, 2024, 10:30 AM
  | 'long'            // January 15, 2024, 10:30 AM
  | 'date'            // 15/01/2024
  | 'time'            // 10:30 AM
  | 'datetime'        // 15/01/2024 10:30 AM
  | 'iso'             // 2024-01-15T10:30:00.000Z
  | 'dateOnly'        // Jan 15, 2024 (no time)
  | 'timeOnly';       // 10:30 AM

/**
 * Convert a Date object or ISO string to a Date object
 * Handles both Date objects and ISO strings safely
 */
export function toDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Format a date for display using the specified format
 * Handles both Date objects and ISO strings
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: DateFormat = 'medium',
  locale: string = 'en-IN',
  timezone?: string
): string {
  const dateObj = toDate(date);
  if (!dateObj) {
    return 'Unknown date';
  }

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || DATE_CONFIG.timezone,
    };

    switch (format) {
      case 'short':
        options.day = 'numeric';
        options.month = 'short';
        options.year = 'numeric';
        break;

      case 'medium':
        options.day = 'numeric';
        options.month = 'short';
        options.year = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;

      case 'long':
        options.day = 'numeric';
        options.month = 'long';
        options.year = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;

      case 'date':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;

      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;

      case 'datetime':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;

      case 'iso':
        return dateObj.toISOString();

      case 'dateOnly':
        options.day = 'numeric';
        options.month = 'short';
        options.year = 'numeric';
        break;

      case 'timeOnly':
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;

      default:
        options.day = 'numeric';
        options.month = 'short';
        options.year = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
    }

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    errorLogger.low('Failed to format date', error, { date, format, locale });
    return 'Invalid date';
  }
}

/**
 * Format date only (no time component)
 */
export function formatDateOnly(
  date: Date | string | null | undefined,
  locale: string = 'en-IN',
  timezone?: string
): string {
  return formatDate(date, 'dateOnly', locale, timezone);
}

/**
 * Format time only (no date component)
 */
export function formatTimeOnly(
  date: Date | string | null | undefined,
  locale: string = 'en-IN',
  timezone?: string
): string {
  return formatDate(date, 'timeOnly', locale, timezone);
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  locale: string = 'en-IN',
  timezone?: string
): string {
  return formatDate(date, 'medium', locale, timezone);
}

/**
 * Convert a date to ISO string for storage/transmission
 * This is the format Supabase expects (TIMESTAMPTZ)
 */
export function toISOString(date: Date | string | null | undefined): string | null {
  const dateObj = toDate(date);
  if (!dateObj) return null;
  return dateObj.toISOString();
}

/**
 * Parse a date string in DD-MM-YYYY format to a Date object
 * Used for user input parsing (booking dates, etc.)
 */
export function parseDateString(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  try {
    // Handle DD-MM-YYYY format
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      return null;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }

    const date = new Date(year, month, day);
    
    // Validate the date (handles invalid dates like 32-13-2024)
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  } catch (error) {
    errorLogger.low('Failed to parse date string', error, { dateString });
    return null;
  }
}

/**
 * Parse a time string in HH:MM format to hours and minutes
 * Returns { hours: number, minutes: number } or null
 */
export function parseTimeString(timeString: string): { hours: number; minutes: number } | null {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }

  try {
    const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return { hours, minutes };
  } catch (error) {
    errorLogger.low('Failed to parse time string', error, { timeString });
    return null;
  }
}

/**
 * Create a Date object from date string (DD-MM-YYYY) and time string (HH:MM) with AM/PM period
 * Used for booking scheduling
 */
export function createScheduledDate(
  dateString: string,
  timeString: string,
  period: 'AM' | 'PM'
): Date | null {
  try {
    const date = parseDateString(dateString);
    if (!date) {
      return null;
    }

    const time = parseTimeString(timeString);
    if (!time) {
      return null;
    }

    // Convert 12-hour format to 24-hour format
    let hours24 = time.hours;
    if (period === 'AM') {
      if (hours24 === 12) {
        hours24 = 0;
      }
    } else {
      // PM
      if (hours24 !== 12) {
        hours24 += 12;
      }
    }

    // Validate hours
    if (hours24 < 0 || hours24 > 23) {
      return null;
    }

    date.setHours(hours24, time.minutes, 0, 0);
    return date;
  } catch (error) {
    errorLogger.medium('Failed to create scheduled date', error, { dateString, timeString, period });
    return null;
  }
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
  return toDate(date) !== null;
}

/**
 * Get current date/time in ISO format
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Get current date/time as Date object
 */
export function now(): Date {
  return new Date();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | null | undefined): boolean {
  const dateObj = toDate(date);
  if (!dateObj) return false;

  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string | null | undefined): boolean {
  const dateObj = toDate(date);
  if (!dateObj) return false;
  return dateObj.getTime() < now().getTime();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string | null | undefined): boolean {
  const dateObj = toDate(date);
  if (!dateObj) return false;
  return dateObj.getTime() > now().getTime();
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  const dateObj = toDate(date);
  if (!dateObj) return 'Unknown';

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isPast = diffMs < 0;
  const prefix = isPast ? '' : 'in ';
  const suffix = isPast ? ' ago' : '';

  if (diffDays > 0) {
    return `${prefix}${diffDays} day${diffDays > 1 ? 's' : ''}${suffix}`;
  }
  if (diffHours > 0) {
    return `${prefix}${diffHours} hour${diffHours > 1 ? 's' : ''}${suffix}`;
  }
  if (diffMinutes > 0) {
    return `${prefix}${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}${suffix}`;
  }
  return 'just now';
}

