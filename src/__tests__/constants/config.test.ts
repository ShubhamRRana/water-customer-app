/**
 * Configuration Constants Tests
 * Tests for all configuration constants to ensure they are properly defined
 */

import {
  APP_CONFIG,
  API_CONFIG,
  STORAGE_CONFIG,
  BOOKING_CONFIG,
  PRICING_CONFIG,
  LOCATION_CONFIG,
  UI_CONFIG,
  VALIDATION_CONFIG,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LOADING_MESSAGES,
  DATE_CONFIG,
  FEATURE_FLAGS,
  DEV_CONFIG,
} from '../../constants/config';

describe('Configuration Constants', () => {
  describe('APP_CONFIG', () => {
    it('should have all required properties', () => {
      expect(APP_CONFIG).toHaveProperty('name');
      expect(APP_CONFIG).toHaveProperty('version');
      expect(APP_CONFIG).toHaveProperty('description');
    });

    it('should have correct app name', () => {
      expect(APP_CONFIG.name).toBe('Water Tanker Booking');
    });

    it('should have valid version format', () => {
      expect(APP_CONFIG.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have non-empty description', () => {
      expect(APP_CONFIG.description).toBeTruthy();
      expect(typeof APP_CONFIG.description).toBe('string');
    });
  });

  describe('API_CONFIG', () => {
    it('should have all required properties', () => {
      expect(API_CONFIG).toHaveProperty('timeout');
      expect(API_CONFIG).toHaveProperty('retryAttempts');
      expect(API_CONFIG).toHaveProperty('retryDelay');
    });

    it('should have positive timeout value', () => {
      expect(API_CONFIG.timeout).toBeGreaterThan(0);
    });

    it('should have positive retry attempts', () => {
      expect(API_CONFIG.retryAttempts).toBeGreaterThan(0);
    });

    it('should have positive retry delay', () => {
      expect(API_CONFIG.retryDelay).toBeGreaterThan(0);
    });
  });

  describe('STORAGE_CONFIG', () => {
    it('should have collections object', () => {
      expect(STORAGE_CONFIG).toHaveProperty('collections');
      expect(typeof STORAGE_CONFIG.collections).toBe('object');
    });

    it('should have all required collection keys', () => {
      const collections = STORAGE_CONFIG.collections;
      expect(collections).toHaveProperty('users');
      expect(collections).toHaveProperty('bookings');
      expect(collections).toHaveProperty('tankerSizes');
      expect(collections).toHaveProperty('pricing');
      expect(collections).toHaveProperty('driverApplications');
      expect(collections).toHaveProperty('notifications');
    });

    it('should have non-empty collection values', () => {
      Object.values(STORAGE_CONFIG.collections).forEach(value => {
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('BOOKING_CONFIG', () => {
    it('should have all required properties', () => {
      expect(BOOKING_CONFIG).toHaveProperty('maxAdvanceBookingDays');
      expect(BOOKING_CONFIG).toHaveProperty('minAdvanceBookingHours');
      expect(BOOKING_CONFIG).toHaveProperty('businessHours');
      expect(BOOKING_CONFIG).toHaveProperty('defaultTankerSizes');
    });

    it('should have valid max advance booking days', () => {
      expect(BOOKING_CONFIG.maxAdvanceBookingDays).toBeGreaterThan(0);
    });

    it('should have valid min advance booking hours', () => {
      expect(BOOKING_CONFIG.minAdvanceBookingHours).toBeGreaterThan(0);
    });

    it('should have valid business hours', () => {
      expect(BOOKING_CONFIG.businessHours).toHaveProperty('start');
      expect(BOOKING_CONFIG.businessHours).toHaveProperty('end');
      expect(BOOKING_CONFIG.businessHours.start).toBeGreaterThanOrEqual(0);
      expect(BOOKING_CONFIG.businessHours.start).toBeLessThan(24);
      expect(BOOKING_CONFIG.businessHours.end).toBeGreaterThan(BOOKING_CONFIG.businessHours.start);
      expect(BOOKING_CONFIG.businessHours.end).toBeLessThanOrEqual(24);
    });

    it('should have default tanker sizes array', () => {
      expect(Array.isArray(BOOKING_CONFIG.defaultTankerSizes)).toBe(true);
      expect(BOOKING_CONFIG.defaultTankerSizes.length).toBeGreaterThan(0);
    });

    it('should have valid tanker size objects', () => {
      BOOKING_CONFIG.defaultTankerSizes.forEach(tanker => {
        expect(tanker).toHaveProperty('size');
        expect(tanker).toHaveProperty('basePrice');
        expect(tanker).toHaveProperty('displayName');
        expect(tanker.size).toBeGreaterThan(0);
        expect(tanker.basePrice).toBeGreaterThanOrEqual(0);
        expect(typeof tanker.displayName).toBe('string');
      });
    });
  });

  describe('PRICING_CONFIG', () => {
    it('should have all required properties', () => {
      expect(PRICING_CONFIG).toHaveProperty('defaultPricePerKm');
      expect(PRICING_CONFIG).toHaveProperty('defaultMinimumCharge');
      expect(PRICING_CONFIG).toHaveProperty('currency');
      expect(PRICING_CONFIG).toHaveProperty('currencySymbol');
    });

    it('should have positive price per km', () => {
      expect(PRICING_CONFIG.defaultPricePerKm).toBeGreaterThan(0);
    });

    it('should have positive minimum charge', () => {
      expect(PRICING_CONFIG.defaultMinimumCharge).toBeGreaterThanOrEqual(0);
    });

    it('should have valid currency code', () => {
      expect(PRICING_CONFIG.currency).toBe('INR');
      expect(typeof PRICING_CONFIG.currency).toBe('string');
    });

    it('should have currency symbol', () => {
      expect(PRICING_CONFIG.currencySymbol).toBeTruthy();
      expect(typeof PRICING_CONFIG.currencySymbol).toBe('string');
    });
  });

  describe('LOCATION_CONFIG', () => {
    it('should have all required properties', () => {
      expect(LOCATION_CONFIG).toHaveProperty('serviceRadius');
      expect(LOCATION_CONFIG).toHaveProperty('defaultCenter');
      expect(LOCATION_CONFIG).toHaveProperty('averageSpeed');
    });

    it('should have positive service radius', () => {
      expect(LOCATION_CONFIG.serviceRadius).toBeGreaterThan(0);
    });

    it('should have valid default center coordinates', () => {
      expect(LOCATION_CONFIG.defaultCenter).toHaveProperty('latitude');
      expect(LOCATION_CONFIG.defaultCenter).toHaveProperty('longitude');
      expect(LOCATION_CONFIG.defaultCenter.latitude).toBeGreaterThanOrEqual(-90);
      expect(LOCATION_CONFIG.defaultCenter.latitude).toBeLessThanOrEqual(90);
      expect(LOCATION_CONFIG.defaultCenter.longitude).toBeGreaterThanOrEqual(-180);
      expect(LOCATION_CONFIG.defaultCenter.longitude).toBeLessThanOrEqual(180);
    });

    it('should have positive average speed', () => {
      expect(LOCATION_CONFIG.averageSpeed).toBeGreaterThan(0);
    });
  });

  describe('UI_CONFIG', () => {
    it('should have all required properties', () => {
      expect(UI_CONFIG).toHaveProperty('fonts');
      expect(UI_CONFIG).toHaveProperty('colors');
      expect(UI_CONFIG).toHaveProperty('spacing');
      expect(UI_CONFIG).toHaveProperty('borderRadius');
      expect(UI_CONFIG).toHaveProperty('fontSize');
    });

    it('should have valid font configuration', () => {
      expect(UI_CONFIG.fonts).toHaveProperty('primary');
      expect(UI_CONFIG.fonts).toHaveProperty('bold');
      expect(UI_CONFIG.fonts).toHaveProperty('fallback');
      expect(Array.isArray(UI_CONFIG.fonts.fallback)).toBe(true);
    });

    it('should have all required color properties', () => {
      const colors = UI_CONFIG.colors;
      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('secondary');
      expect(colors).toHaveProperty('accent');
      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('surface');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('textSecondary');
      expect(colors).toHaveProperty('success');
      expect(colors).toHaveProperty('warning');
      expect(colors).toHaveProperty('error');
    });

    it('should have valid color format (hex codes)', () => {
      Object.entries(UI_CONFIG.colors).forEach(([key, value]) => {
        if (typeof value === 'string') {
          expect(value).toMatch(/^#[0-9A-Fa-f]{6}$|^[a-zA-Z]+$/);
        }
      });
    });

    it('should have valid spacing values', () => {
      const spacing = UI_CONFIG.spacing;
      expect(spacing).toHaveProperty('xs');
      expect(spacing).toHaveProperty('sm');
      expect(spacing).toHaveProperty('md');
      expect(spacing).toHaveProperty('lg');
      expect(spacing).toHaveProperty('xl');
      Object.values(spacing).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid borderRadius values', () => {
      const borderRadius = UI_CONFIG.borderRadius;
      expect(borderRadius).toHaveProperty('sm');
      expect(borderRadius).toHaveProperty('md');
      expect(borderRadius).toHaveProperty('lg');
      expect(borderRadius).toHaveProperty('xl');
      Object.values(borderRadius).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid fontSize values', () => {
      const fontSize = UI_CONFIG.fontSize;
      expect(fontSize).toHaveProperty('xs');
      expect(fontSize).toHaveProperty('sm');
      expect(fontSize).toHaveProperty('md');
      expect(fontSize).toHaveProperty('lg');
      expect(fontSize).toHaveProperty('xl');
      expect(fontSize).toHaveProperty('xxl');
      Object.values(fontSize).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('VALIDATION_CONFIG', () => {
    it('should have all required validation configs', () => {
      expect(VALIDATION_CONFIG).toHaveProperty('phone');
      expect(VALIDATION_CONFIG).toHaveProperty('password');
      expect(VALIDATION_CONFIG).toHaveProperty('name');
      expect(VALIDATION_CONFIG).toHaveProperty('email');
      expect(VALIDATION_CONFIG).toHaveProperty('vehicleNumber');
      expect(VALIDATION_CONFIG).toHaveProperty('pincode');
    });

    it('should have valid phone validation config', () => {
      expect(VALIDATION_CONFIG.phone).toHaveProperty('minLength');
      expect(VALIDATION_CONFIG.phone).toHaveProperty('maxLength');
      expect(VALIDATION_CONFIG.phone).toHaveProperty('pattern');
      expect(VALIDATION_CONFIG.phone.minLength).toBeGreaterThan(0);
      expect(VALIDATION_CONFIG.phone.maxLength).toBeGreaterThanOrEqual(VALIDATION_CONFIG.phone.minLength);
      expect(VALIDATION_CONFIG.phone.pattern).toBeInstanceOf(RegExp);
    });

    it('should have valid password validation config', () => {
      expect(VALIDATION_CONFIG.password).toHaveProperty('minLength');
      expect(VALIDATION_CONFIG.password).toHaveProperty('maxLength');
      expect(VALIDATION_CONFIG.password.minLength).toBeGreaterThan(0);
      expect(VALIDATION_CONFIG.password.maxLength).toBeGreaterThanOrEqual(VALIDATION_CONFIG.password.minLength);
    });

    it('should have valid name validation config', () => {
      expect(VALIDATION_CONFIG.name).toHaveProperty('minLength');
      expect(VALIDATION_CONFIG.name).toHaveProperty('maxLength');
      expect(VALIDATION_CONFIG.name).toHaveProperty('pattern');
      expect(VALIDATION_CONFIG.name.minLength).toBeGreaterThan(0);
      expect(VALIDATION_CONFIG.name.maxLength).toBeGreaterThanOrEqual(VALIDATION_CONFIG.name.minLength);
      expect(VALIDATION_CONFIG.name.pattern).toBeInstanceOf(RegExp);
    });

    it('should have valid email validation config', () => {
      expect(VALIDATION_CONFIG.email).toHaveProperty('pattern');
      expect(VALIDATION_CONFIG.email.pattern).toBeInstanceOf(RegExp);
    });

    it('should have valid vehicle number validation config', () => {
      expect(VALIDATION_CONFIG.vehicleNumber).toHaveProperty('pattern');
      expect(VALIDATION_CONFIG.vehicleNumber.pattern).toBeInstanceOf(RegExp);
    });

    it('should have valid pincode validation config', () => {
      expect(VALIDATION_CONFIG.pincode).toHaveProperty('pattern');
      expect(VALIDATION_CONFIG.pincode.pattern).toBeInstanceOf(RegExp);
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS).toHaveProperty('user');
      expect(STORAGE_KEYS).toHaveProperty('authToken');
      expect(STORAGE_KEYS).toHaveProperty('onboardingCompleted');
      expect(STORAGE_KEYS).toHaveProperty('lastLocation');
      expect(STORAGE_KEYS).toHaveProperty('savedAddresses');
      expect(STORAGE_KEYS).toHaveProperty('preferences');
    });

    it('should have non-empty string values', () => {
      Object.values(STORAGE_KEYS).forEach(value => {
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all required error message categories', () => {
      expect(ERROR_MESSAGES).toHaveProperty('network');
      expect(ERROR_MESSAGES).toHaveProperty('auth');
      expect(ERROR_MESSAGES).toHaveProperty('booking');
      expect(ERROR_MESSAGES).toHaveProperty('location');
      expect(ERROR_MESSAGES).toHaveProperty('payment');
      expect(ERROR_MESSAGES).toHaveProperty('general');
    });

    it('should have valid auth error messages', () => {
      const authErrors = ERROR_MESSAGES.auth;
      expect(authErrors).toHaveProperty('invalidCredentials');
      expect(authErrors).toHaveProperty('userNotFound');
      expect(authErrors).toHaveProperty('userExists');
      expect(authErrors).toHaveProperty('weakPassword');
      expect(authErrors).toHaveProperty('networkError');
      Object.values(authErrors).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have valid booking error messages', () => {
      const bookingErrors = ERROR_MESSAGES.booking;
      expect(bookingErrors).toHaveProperty('createFailed');
      expect(bookingErrors).toHaveProperty('updateFailed');
      expect(bookingErrors).toHaveProperty('cancelFailed');
      expect(bookingErrors).toHaveProperty('notFound');
      Object.values(bookingErrors).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have valid location error messages', () => {
      const locationErrors = ERROR_MESSAGES.location;
      expect(locationErrors).toHaveProperty('permissionDenied');
      expect(locationErrors).toHaveProperty('serviceDisabled');
      expect(locationErrors).toHaveProperty('timeout');
      expect(locationErrors).toHaveProperty('notSupported');
      Object.values(locationErrors).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have valid payment error messages', () => {
      const paymentErrors = ERROR_MESSAGES.payment;
      expect(paymentErrors).toHaveProperty('failed');
      expect(paymentErrors).toHaveProperty('cancelled');
      expect(paymentErrors).toHaveProperty('networkError');
      Object.values(paymentErrors).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have valid general error messages', () => {
      const generalErrors = ERROR_MESSAGES.general;
      expect(generalErrors).toHaveProperty('unexpected');
      expect(generalErrors).toHaveProperty('tryAgain');
      expect(generalErrors).toHaveProperty('invalidInput');
      expect(generalErrors).toHaveProperty('required');
      Object.values(generalErrors).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SUCCESS_MESSAGES', () => {
    it('should have all required success message categories', () => {
      expect(SUCCESS_MESSAGES).toHaveProperty('auth');
      expect(SUCCESS_MESSAGES).toHaveProperty('booking');
      expect(SUCCESS_MESSAGES).toHaveProperty('profile');
      expect(SUCCESS_MESSAGES).toHaveProperty('address');
    });

    it('should have valid auth success messages', () => {
      const authSuccess = SUCCESS_MESSAGES.auth;
      expect(authSuccess).toHaveProperty('loginSuccess');
      expect(authSuccess).toHaveProperty('registerSuccess');
      expect(authSuccess).toHaveProperty('logoutSuccess');
      Object.values(authSuccess).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have valid booking success messages', () => {
      const bookingSuccess = SUCCESS_MESSAGES.booking;
      expect(bookingSuccess).toHaveProperty('created');
      expect(bookingSuccess).toHaveProperty('updated');
      expect(bookingSuccess).toHaveProperty('cancelled');
      expect(bookingSuccess).toHaveProperty('accepted');
      expect(bookingSuccess).toHaveProperty('completed');
      Object.values(bookingSuccess).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('LOADING_MESSAGES', () => {
    it('should have all required loading message categories', () => {
      expect(LOADING_MESSAGES).toHaveProperty('auth');
      expect(LOADING_MESSAGES).toHaveProperty('booking');
      expect(LOADING_MESSAGES).toHaveProperty('location');
      expect(LOADING_MESSAGES).toHaveProperty('payment');
      expect(LOADING_MESSAGES).toHaveProperty('general');
    });

    it('should have non-empty loading messages', () => {
      Object.values(LOADING_MESSAGES).forEach(category => {
        Object.values(category).forEach(value => {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('DATE_CONFIG', () => {
    it('should have all required properties', () => {
      expect(DATE_CONFIG).toHaveProperty('formats');
      expect(DATE_CONFIG).toHaveProperty('timezone');
    });

    it('should have valid date formats', () => {
      const formats = DATE_CONFIG.formats;
      expect(formats).toHaveProperty('date');
      expect(formats).toHaveProperty('time');
      expect(formats).toHaveProperty('datetime');
      expect(formats).toHaveProperty('display');
      expect(formats).toHaveProperty('timeDisplay');
      Object.values(formats).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have valid timezone', () => {
      expect(DATE_CONFIG.timezone).toBeTruthy();
      expect(typeof DATE_CONFIG.timezone).toBe('string');
    });
  });

  describe('FEATURE_FLAGS', () => {
    it('should have all required feature flags', () => {
      expect(FEATURE_FLAGS).toHaveProperty('enableOnlinePayment');
      expect(FEATURE_FLAGS).toHaveProperty('enablePushNotifications');
      expect(FEATURE_FLAGS).toHaveProperty('enableRealTimeTracking');
      expect(FEATURE_FLAGS).toHaveProperty('enableDriverSelfRegistration');
      expect(FEATURE_FLAGS).toHaveProperty('enableRatingsAndReviews');
      expect(FEATURE_FLAGS).toHaveProperty('enableImmediateBookings');
    });

    it('should have boolean values for all feature flags', () => {
      Object.values(FEATURE_FLAGS).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('DEV_CONFIG', () => {
    it('should have all required properties', () => {
      expect(DEV_CONFIG).toHaveProperty('enableLogging');
      expect(DEV_CONFIG).toHaveProperty('enableDebugMode');
      expect(DEV_CONFIG).toHaveProperty('mockData');
    });

    it('should have boolean values', () => {
      expect(typeof DEV_CONFIG.enableLogging).toBe('boolean');
      expect(typeof DEV_CONFIG.enableDebugMode).toBe('boolean');
      expect(typeof DEV_CONFIG.mockData).toBe('boolean');
    });
  });
});

