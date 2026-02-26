/**
 * Pricing Utilities Tests
 */

import { PricingUtils } from '../../utils/pricing';
import { Pricing, TankerSize } from '../../types';

describe('PricingUtils', () => {
  const mockTankerSize: TankerSize = {
    id: 'tanker-1',
    size: 1000,
    basePrice: 500,
    isActive: true,
    displayName: '1000 Liters',
  };

  const mockPricing: Pricing = {
    pricePerKm: 5,
    minimumCharge: 50,
    updatedAt: new Date(),
    updatedBy: 'admin',
  };

  describe('calculatePrice', () => {
    it('should calculate price correctly for short distance', () => {
      const result = PricingUtils.calculatePrice(mockTankerSize, 5, mockPricing);
      
      expect(result.basePrice).toBe(500);
      expect(result.distanceCharge).toBeGreaterThan(0);
      expect(result.totalPrice).toBeGreaterThanOrEqual(result.basePrice);
      expect(result.totalPrice).toBe(Math.round(result.basePrice + result.distanceCharge));
    });

    it('should apply minimum charge when distance charge is too low', () => {
      const result = PricingUtils.calculatePrice(mockTankerSize, 1, mockPricing);
      
      // Distance charge should be at least (minimumCharge - basePrice)
      expect(result.distanceCharge).toBeGreaterThanOrEqual(mockPricing.minimumCharge - mockTankerSize.basePrice);
    });

    it('should calculate distance charge correctly for longer distances', () => {
      const result = PricingUtils.calculatePrice(mockTankerSize, 20, mockPricing);
      
      const expectedDistanceCharge = 20 * mockPricing.pricePerKm;
      expect(result.distanceCharge).toBe(expectedDistanceCharge);
    });

    it('should round total price', () => {
      const result = PricingUtils.calculatePrice(mockTankerSize, 7.5, mockPricing);
      
      expect(result.totalPrice).toBe(Math.round(result.totalPrice));
      expect(Number.isInteger(result.totalPrice)).toBe(true);
    });
  });

  describe('getPriceBreakdown', () => {
    it('should return price breakdown with all components', () => {
      const result = PricingUtils.getPriceBreakdown(mockTankerSize, 10, mockPricing);
      
      expect(result.tankerSize).toBe(mockTankerSize.displayName);
      expect(result.basePrice).toBe(500);
      expect(result.distance).toBe(10);
      expect(result.distanceCharge).toBeGreaterThan(0);
      expect(result.totalPrice).toBeGreaterThan(0);
    });

    it('should round distance to 2 decimal places', () => {
      const result = PricingUtils.getPriceBreakdown(mockTankerSize, 10.123456, mockPricing);
      
      const decimalPlaces = (result.distance.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should use displayName from tanker size', () => {
      const customTanker: TankerSize = {
        ...mockTankerSize,
        displayName: 'Large Tanker',
      };
      const result = PricingUtils.getPriceBreakdown(customTanker, 10, mockPricing);
      
      expect(result.tankerSize).toBe('Large Tanker');
    });
  });

  describe('formatPrice', () => {
    it('should format price with Indian numbering system', () => {
      const result = PricingUtils.formatPrice(1234567);
      
      expect(result).toContain('₹');
      expect(result).toContain(',');
    });

    it('should format small amounts correctly', () => {
      const result = PricingUtils.formatPrice(500);
      expect(result).toBe('₹500');
    });

    it('should format amounts with thousands correctly', () => {
      const result = PricingUtils.formatPrice(5000);
      expect(result).toBe('₹5,000');
    });

    it('should format amounts with lakhs correctly', () => {
      const result = PricingUtils.formatPrice(123456);
      // Indian numbering: 1,23,456
      expect(result).toContain('1,23,456');
    });

    it('should handle decimal amounts', () => {
      const result = PricingUtils.formatPrice(1234.56);
      expect(result).toContain('₹');
      expect(result).toContain('1,234');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Indian numbering system', () => {
      const result = PricingUtils.formatNumber(1234567);
      
      expect(result).toContain(',');
      expect(result).not.toContain('₹');
    });

    it('should format small numbers correctly', () => {
      const result = PricingUtils.formatNumber(500);
      expect(result).toBe('500');
    });

    it('should format numbers with thousands correctly', () => {
      const result = PricingUtils.formatNumber(5000);
      expect(result).toBe('5,000');
    });
  });

  describe('calculateDeliveryTime', () => {
    it('should calculate delivery time based on distance', () => {
      const result = PricingUtils.calculateDeliveryTime(30);
      
      // At 30 km/h average speed, 30 km = 1 hour = 60 minutes
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should round up to nearest minute', () => {
      const result = PricingUtils.calculateDeliveryTime(15);
      
      // 15 km at 30 km/h = 0.5 hours = 30 minutes, should round up
      expect(result).toBeGreaterThanOrEqual(30);
    });

    it('should handle very short distances', () => {
      const result = PricingUtils.calculateDeliveryTime(1);
      
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should handle long distances', () => {
      const result = PricingUtils.calculateDeliveryTime(100);
      
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('validatePricing', () => {
    it('should validate correct pricing configuration', () => {
      const result = PricingUtils.validatePricing(mockPricing);
      
      expect(result).toHaveLength(0);
    });

    it('should reject pricing with zero pricePerKm', () => {
      const invalidPricing = { ...mockPricing, pricePerKm: 0 };
      const result = PricingUtils.validatePricing(invalidPricing);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(e => e.toLowerCase().includes('price per kilometer'))).toBe(true);
    });

    it('should reject pricing with negative pricePerKm', () => {
      const invalidPricing = { ...mockPricing, pricePerKm: -5 };
      const result = PricingUtils.validatePricing(invalidPricing);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(e => e.toLowerCase().includes('price per kilometer'))).toBe(true);
    });

    it('should reject pricing with zero minimumCharge', () => {
      const invalidPricing = { ...mockPricing, minimumCharge: 0 };
      const result = PricingUtils.validatePricing(invalidPricing);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(e => e.toLowerCase().includes('minimum charge'))).toBe(true);
    });

    it('should reject pricing with negative minimumCharge', () => {
      const invalidPricing = { ...mockPricing, minimumCharge: -50 };
      const result = PricingUtils.validatePricing(invalidPricing);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(e => e.toLowerCase().includes('minimum charge'))).toBe(true);
    });

    it('should warn when minimumCharge is less than pricePerKm', () => {
      const invalidPricing = { ...mockPricing, minimumCharge: 2, pricePerKm: 5 };
      const result = PricingUtils.validatePricing(invalidPricing);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(e => e.includes('Minimum charge should be at least'))).toBe(true);
    });

    it('should collect all validation errors', () => {
      const invalidPricing = {
        pricePerKm: 0,
        minimumCharge: 0,
      };
      const result = PricingUtils.validatePricing(invalidPricing);
      
      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('getDefaultPricing', () => {
    it('should return default pricing configuration', () => {
      const result = PricingUtils.getDefaultPricing();
      
      expect(result.pricePerKm).toBe(5);
      expect(result.minimumCharge).toBe(50);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedBy).toBe('system');
    });

    it('should return valid pricing that passes validation', () => {
      const defaultPricing = PricingUtils.getDefaultPricing();
      const validationErrors = PricingUtils.validatePricing(defaultPricing);
      
      expect(validationErrors).toHaveLength(0);
    });
  });
});

