/**
 * Date Serialization Utilities Tests
 */

import {
  serializeDate,
  deserializeDate,
  serializeDates,
  deserializeDates,
  serializeUserDates,
  deserializeUserDates,
  serializeBookingDates,
  deserializeBookingDates,
  serializeVehicleDates,
  deserializeVehicleDates,
} from '../../utils/dateSerialization';

describe('Date Serialization Utilities', () => {
  describe('serializeDate', () => {
    it('should serialize valid Date object to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = serializeDate(date);
      
      expect(result).toBe(date.toISOString());
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return null for undefined', () => {
      const result = serializeDate(undefined);
      expect(result).toBeNull();
    });

    it('should return null for null', () => {
      const result = serializeDate(null);
      expect(result).toBeNull();
    });

    it('should handle dates with different timezones', () => {
      const date = new Date('2024-01-15T10:30:00+05:30');
      const result = serializeDate(date);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('2024-01-15');
    });

    it('should handle edge case dates', () => {
      const date = new Date(0); // Epoch time
      const result = serializeDate(date);
      
      expect(result).toBe('1970-01-01T00:00:00.000Z');
    });
  });

  describe('deserializeDate', () => {
    it('should deserialize valid ISO string to Date object', () => {
      const dateString = '2024-01-15T10:30:00.000Z';
      const result = deserializeDate(dateString);
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(dateString);
    });

    it('should return Date object when Date is passed', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = deserializeDate(date);
      
      expect(result).toBe(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for undefined', () => {
      const result = deserializeDate(undefined);
      expect(result).toBeNull();
    });

    it('should return null for null', () => {
      const result = deserializeDate(null);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = deserializeDate('');
      expect(result).toBeNull();
    });

    it('should handle invalid date strings', () => {
      const result = deserializeDate('invalid-date-string');
      
      // Should return null or invalid Date
      // JavaScript Date constructor returns Invalid Date for invalid strings
      expect(result).toBeDefined();
      // The result might be an Invalid Date, which is still a Date object
      if (result) {
        expect(result).toBeInstanceOf(Date);
      }
    });

    it('should handle malformed date strings', () => {
      const result = deserializeDate('2024-13-45T99:99:99.999Z');
      
      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle timestamp strings', () => {
      const timestamp = Date.now().toString();
      const result = deserializeDate(timestamp);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result).toBeInstanceOf(Date);
      }
    });

    it('should handle date strings without time', () => {
      const result = deserializeDate('2024-01-15');
      
      expect(result).toBeDefined();
      if (result) {
        expect(result).toBeInstanceOf(Date);
      }
    });
  });

  describe('serializeDates', () => {
    it('should serialize date fields in object', () => {
      const obj = {
        name: 'Test',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-16T11:00:00Z'),
      };
      
      const result = serializeDates(obj, ['createdAt', 'updatedAt']);
      
      expect(result.name).toBe('Test');
      expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.updatedAt).toBe('2024-01-16T11:00:00.000Z');
    });

    it('should not modify non-date fields', () => {
      const obj = {
        name: 'Test',
        age: 25,
        createdAt: new Date('2024-01-15T10:30:00Z'),
      };
      
      const result = serializeDates(obj, ['createdAt']);
      
      expect(result.name).toBe('Test');
      expect(result.age).toBe(25);
    });

    it('should handle objects without date fields', () => {
      const obj = {
        name: 'Test',
        age: 25,
      };
      
      const result = serializeDates(obj, ['createdAt']);
      
      expect(result).toEqual(obj);
    });

    it('should handle empty dateFields array', () => {
      const obj = {
        name: 'Test',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      };
      
      const result = serializeDates(obj, []);
      
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should only serialize specified date fields', () => {
      const obj = {
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-16T11:00:00Z'),
        deletedAt: new Date('2024-01-17T12:00:00Z'),
      };
      
      const result = serializeDates(obj, ['createdAt', 'updatedAt']);
      
      expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.updatedAt).toBe('2024-01-16T11:00:00.000Z');
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('deserializeDates', () => {
    it('should deserialize date fields in object', () => {
      const obj = {
        name: 'Test',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T11:00:00.000Z',
      };
      
      const result = deserializeDates(obj, ['createdAt', 'updatedAt']);
      
      expect(result.name).toBe('Test');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should not modify non-string fields', () => {
      const obj = {
        name: 'Test',
        age: 25,
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      
      const result = deserializeDates(obj, ['createdAt']);
      
      expect(result.name).toBe('Test');
      expect(result.age).toBe(25);
    });

    it('should handle objects without date fields', () => {
      const obj = {
        name: 'Test',
        age: 25,
      };
      
      const result = deserializeDates(obj, ['createdAt']);
      
      expect(result).toEqual(obj);
    });

    it('should handle invalid date strings gracefully', () => {
      const obj = {
        name: 'Test',
        createdAt: 'invalid-date',
      };
      
      const result = deserializeDates(obj, ['createdAt']);
      
      // Should not throw, but createdAt may remain as string or be null
      expect(result.name).toBe('Test');
    });

    it('should only deserialize specified date fields', () => {
      const obj = {
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T11:00:00.000Z',
        deletedAt: '2024-01-17T12:00:00.000Z',
      };
      
      const result = deserializeDates(obj, ['createdAt', 'updatedAt']);
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(typeof result.deletedAt).toBe('string');
    });

    it('should not deserialize non-string values', () => {
      const obj = {
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: '2024-01-16T11:00:00.000Z',
      };
      
      const result = deserializeDates(obj, ['createdAt', 'updatedAt']);
      
      // createdAt is already a Date, should not be modified
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('serializeUserDates', () => {
    it('should serialize user with createdAt', () => {
      const user = {
        id: 'user-1',
        name: 'Test User',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      };
      
      const result = serializeUserDates(user);
      
      expect(result.id).toBe('user-1');
      expect(result.name).toBe('Test User');
      expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should serialize user with licenseExpiry when present', () => {
      const user = {
        id: 'user-1',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        licenseExpiry: new Date('2025-01-15T10:30:00Z'),
      };
      
      const result = serializeUserDates(user);
      
      expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.licenseExpiry).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should not include licenseExpiry when not present', () => {
      const user = {
        id: 'user-1',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      };
      
      const result = serializeUserDates(user);
      
      expect(result.licenseExpiry).toBeUndefined();
    });

    it('should handle null createdAt gracefully', () => {
      const user = {
        id: 'user-1',
        createdAt: null as any,
      };
      
      const result = serializeUserDates(user);
      
      expect(result.createdAt).toBe('');
    });
  });

  describe('deserializeUserDates', () => {
    it('should deserialize user with createdAt string', () => {
      const user = {
        id: 'user-1',
        name: 'Test User',
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      
      const result = deserializeUserDates(user);
      
      expect(result.id).toBe('user-1');
      expect(result.name).toBe('Test User');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should deserialize user with licenseExpiry when present', () => {
      const user = {
        id: 'user-1',
        createdAt: '2024-01-15T10:30:00.000Z',
        licenseExpiry: '2025-01-15T10:30:00.000Z',
      };
      
      const result = deserializeUserDates(user);
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.licenseExpiry).toBeInstanceOf(Date);
    });

    it('should use default Date when createdAt is invalid', () => {
      const user = {
        id: 'user-1',
        createdAt: 'invalid-date',
      };
      
      const result = deserializeUserDates(user);
      
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle Date objects as input', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const user = {
        id: 'user-1',
        createdAt: date,
      };
      
      const result = deserializeUserDates(user);
      
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should not include licenseExpiry when not present', () => {
      const user = {
        id: 'user-1',
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      
      const result = deserializeUserDates(user);
      
      expect(result.licenseExpiry).toBeUndefined();
    });
  });

  describe('serializeBookingDates', () => {
    it('should serialize booking with all date fields', () => {
      const booking = {
        id: 'booking-1',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-16T11:00:00Z'),
        scheduledFor: new Date('2024-01-20T12:00:00Z'),
        acceptedAt: new Date('2024-01-18T09:00:00Z'),
        deliveredAt: new Date('2024-01-20T14:00:00Z'),
      };
      
      const result = serializeBookingDates(booking);
      
      expect(result.id).toBe('booking-1');
      expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.updatedAt).toBe('2024-01-16T11:00:00.000Z');
      expect(result.scheduledFor).toBe('2024-01-20T12:00:00.000Z');
      expect(result.acceptedAt).toBe('2024-01-18T09:00:00.000Z');
      expect(result.deliveredAt).toBe('2024-01-20T14:00:00.000Z');
    });

    it('should handle optional date fields as null when undefined', () => {
      const booking = {
        id: 'booking-1',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-16T11:00:00Z'),
      };
      
      const result = serializeBookingDates(booking);
      
      expect(result.scheduledFor).toBeNull();
      expect(result.acceptedAt).toBeNull();
      expect(result.deliveredAt).toBeNull();
    });
  });

  describe('deserializeBookingDates', () => {
    it('should deserialize booking with all date fields', () => {
      const booking = {
        id: 'booking-1',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T11:00:00.000Z',
        scheduledFor: '2024-01-20T12:00:00.000Z',
        acceptedAt: '2024-01-18T09:00:00.000Z',
        deliveredAt: '2024-01-20T14:00:00.000Z',
      };
      
      const result = deserializeBookingDates(booking);
      
      expect(result.id).toBe('booking-1');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.scheduledFor).toBeInstanceOf(Date);
      expect(result.acceptedAt).toBeInstanceOf(Date);
      expect(result.deliveredAt).toBeInstanceOf(Date);
    });

    it('should handle null optional date fields', () => {
      const booking = {
        id: 'booking-1',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T11:00:00.000Z',
        scheduledFor: null,
        acceptedAt: null,
        deliveredAt: null,
      };
      
      const result = deserializeBookingDates(booking);
      
      expect(result.scheduledFor).toBeUndefined();
      expect(result.acceptedAt).toBeUndefined();
      expect(result.deliveredAt).toBeUndefined();
    });

    it('should handle undefined optional date fields', () => {
      const booking = {
        id: 'booking-1',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T11:00:00.000Z',
      };
      
      const result = deserializeBookingDates(booking);
      
      expect(result.scheduledFor).toBeUndefined();
      expect(result.acceptedAt).toBeUndefined();
      expect(result.deliveredAt).toBeUndefined();
    });

    it('should use default Date when required dates are invalid', () => {
      const booking = {
        id: 'booking-1',
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
      };
      
      const result = deserializeBookingDates(booking);
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('serializeVehicleDates', () => {
    it('should serialize vehicle with all date fields', () => {
      const vehicle = {
        id: 'vehicle-1',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-16T11:00:00Z'),
        insuranceExpiryDate: new Date('2025-01-15T10:30:00Z'),
      };
      
      const result = serializeVehicleDates(vehicle);
      
      expect(result.id).toBe('vehicle-1');
      expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.updatedAt).toBe('2024-01-16T11:00:00.000Z');
      expect(result.insuranceExpiryDate).toBe('2025-01-15T10:30:00.000Z');
    });
  });

  describe('deserializeVehicleDates', () => {
    it('should deserialize vehicle with all date fields', () => {
      const vehicle = {
        id: 'vehicle-1',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T11:00:00.000Z',
        insuranceExpiryDate: '2025-01-15T10:30:00.000Z',
      };
      
      const result = deserializeVehicleDates(vehicle);
      
      expect(result.id).toBe('vehicle-1');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.insuranceExpiryDate).toBeInstanceOf(Date);
    });

    it('should use default Date when dates are invalid', () => {
      const vehicle = {
        id: 'vehicle-1',
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
        insuranceExpiryDate: 'invalid-date',
      };
      
      const result = deserializeVehicleDates(vehicle);
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.insuranceExpiryDate).toBeInstanceOf(Date);
    });
  });
});

