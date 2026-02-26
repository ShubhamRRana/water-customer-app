// Input sanitization utilities to prevent XSS and injection attacks

/**
 * Sanitization utilities for user inputs
 * These functions help prevent XSS attacks and ensure data integrity
 */
export class SanitizationUtils {
  /**
   * Sanitize a string by removing potentially dangerous characters
   * Removes script tags, HTML entities, and other potentially harmful content
   */
  static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove other potentially dangerous HTML tags
      .replace(/<[^>]+>/g, '')
      // Remove javascript: and data: protocols
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      // Remove null bytes
      .replace(/\0/g, '')
      // Trim whitespace
      .trim();
  }

  /**
   * Sanitize a phone number - keep only digits
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Remove all non-digit characters
    return phone.replace(/\D/g, '').trim();
  }

  /**
   * Sanitize a name - keep only letters, spaces, and common name characters
   */
  static sanitizeName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }

    return name
      .trim()
      // Keep only letters, spaces, hyphens, apostrophes, and periods
      .replace(/[^a-zA-Z\s\-'.]/g, '')
      // Remove multiple consecutive spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sanitize a business name - keep alphanumeric and common business characters
   */
  static sanitizeBusinessName(businessName: string): string {
    if (!businessName || typeof businessName !== 'string') {
      return '';
    }

    return businessName
      .trim()
      // Keep letters, numbers, spaces, and common business name characters
      .replace(/[^a-zA-Z0-9\s&.,'-]/g, '')
      // Remove multiple consecutive spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sanitize and normalize an email address
   * - Trims whitespace
   * - Converts to lowercase (email normalization)
   * - Removes potentially dangerous characters while keeping valid email format
   * 
   * Note: Email addresses are case-insensitive per RFC 5321, so normalization
   * to lowercase ensures consistent storage and comparison.
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    return email
      .trim()
      .toLowerCase() // Normalize to lowercase for consistent storage and comparison
      // Remove potentially dangerous characters while keeping valid email format
      .replace(/[<>\"'`]/g, '')
      .trim();
  }

  /**
   * Sanitize an address - keep alphanumeric, spaces, and common address characters
   */
  static sanitizeAddress(address: string): string {
    if (!address || typeof address !== 'string') {
      return '';
    }

    return address
      .trim()
      // Keep letters, numbers, spaces, and common address characters
      .replace(/[^a-zA-Z0-9\s\-.,#/]/g, '')
      // Remove multiple consecutive spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sanitize a numeric input - keep only digits and decimal point
   */
  static sanitizeNumber(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Keep only digits and decimal points
    const cleaned = input.trim().replace(/[^\d.]/g, '');
    
    // Split by decimal points and keep only the first one
    const parts = cleaned.split('.');
    if (parts.length === 1) {
      return cleaned.trim();
    }
    
    // Keep first part and join the rest (removing dots)
    return (parts[0] + '.' + parts.slice(1).join('')).trim();
  }

  /**
   * Sanitize a pincode - keep only digits
   */
  static sanitizePincode(pincode: string): string {
    if (!pincode || typeof pincode !== 'string') {
      return '';
    }

    // Keep only digits
    return pincode.replace(/\D/g, '').trim();
  }

  /**
   * Sanitize a vehicle number - convert to uppercase and keep only valid characters
   */
  static sanitizeVehicleNumber(vehicleNumber: string): string {
    if (!vehicleNumber || typeof vehicleNumber !== 'string') {
      return '';
    }

    return vehicleNumber
      .trim()
      .toUpperCase()
      // Keep only letters and numbers
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  }

  /**
   * Sanitize a license number
   */
  static sanitizeLicenseNumber(licenseNumber: string): string {
    if (!licenseNumber || typeof licenseNumber !== 'string') {
      return '';
    }

    return licenseNumber
      .trim()
      .toUpperCase()
      // Keep alphanumeric and common license number characters
      .replace(/[^A-Z0-9\s\-]/g, '')
      // Remove multiple consecutive spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sanitize a date string (DD-MM-YYYY format)
   */
  static sanitizeDateString(dateString: string): string {
    if (!dateString || typeof dateString !== 'string') {
      return '';
    }

    // Keep only digits and separators
    return dateString
      .trim()
      .replace(/[^\d\-/]/g, '')
      .trim();
  }

  /**
   * Sanitize a time string (HH:MM format)
   */
  static sanitizeTimeString(timeString: string): string {
    if (!timeString || typeof timeString !== 'string') {
      return '';
    }

    // Keep only digits and colon
    return timeString
      .trim()
      .replace(/[^\d:]/g, '')
      .trim();
  }

  /**
   * Sanitize special instructions or notes - allow more characters but still safe
   */
  static sanitizeText(text: string, maxLength: number = 1000): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      // Remove script tags and dangerous HTML
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      // Remove javascript: and data: protocols
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      // Remove null bytes
      .replace(/\0/g, '')
      // Limit length
      .substring(0, maxLength)
      .trim();
  }

  /**
   * Sanitize an object by sanitizing all string values
   */
  static sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    sanitizers?: { [K in keyof T]?: (value: T[K]) => T[K] }
  ): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj };

    for (const key in sanitized) {
      if (sanitizers && sanitizers[key]) {
        // Use custom sanitizer if provided
        sanitized[key] = sanitizers[key](sanitized[key]);
      } else if (typeof sanitized[key] === 'string') {
        // Auto-detect email fields and use sanitizeEmail
        if (key.toLowerCase().includes('email')) {
          sanitized[key] = this.sanitizeEmail(sanitized[key] as string) as T[Extract<keyof T, string>];
        } else {
          // Default: sanitize strings
          sanitized[key] = this.sanitizeString(sanitized[key] as string) as T[Extract<keyof T, string>];
        }
      }
    }

    return sanitized;
  }
}

