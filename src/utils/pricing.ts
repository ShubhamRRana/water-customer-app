// Pricing utility functions

import { Pricing, TankerSize } from '../types';

export class PricingUtils {
  // Calculate total price based on tanker size, distance, and pricing rules
  static calculatePrice(
    tankerSize: TankerSize,
    distance: number,
    pricing: Pricing
  ): { basePrice: number; distanceCharge: number; totalPrice: number } {
    const basePrice = tankerSize.basePrice;
    const distanceCharge = Math.max(
      distance * pricing.pricePerKm,
      pricing.minimumCharge - basePrice
    );
    const totalPrice = basePrice + distanceCharge;

    return {
      basePrice,
      distanceCharge,
      totalPrice: Math.round(totalPrice),
    };
  }

  // Get price breakdown for display
  static getPriceBreakdown(
    tankerSize: TankerSize,
    distance: number,
    pricing: Pricing
  ): {
    tankerSize: string;
    basePrice: number;
    distance: number;
    distanceCharge: number;
    totalPrice: number;
  } {
    const price = this.calculatePrice(tankerSize, distance, pricing);
    
    return {
      tankerSize: tankerSize.displayName,
      basePrice: price.basePrice,
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      distanceCharge: price.distanceCharge,
      totalPrice: price.totalPrice,
    };
  }

  // Format number according to Indian numbering system (groups: last 3 digits, then groups of 2)
  // Example: 1234567 -> 12,34,567
  private static formatIndianNumber(num: number): string {
    const numStr = num.toString();
    const parts = numStr.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] || '';

    // Indian numbering: first 3 digits from right, then groups of 2
    if (integerPart.length <= 3) {
      return integerPart + (decimalPart ? '.' + decimalPart : '');
    }

    // Get last 3 digits
    let result = integerPart.slice(-3);
    integerPart = integerPart.slice(0, -3);

    // Process remaining digits in groups of 2
    while (integerPart.length > 0) {
      const group = integerPart.slice(-2);
      result = group + ',' + result;
      integerPart = integerPart.slice(0, -2);
    }

    return result + (decimalPart ? '.' + decimalPart : '');
  }

  // Format price for display (Indian numbering system)
  static formatPrice(amount: number): string {
    const formatted = this.formatIndianNumber(amount);
    return `₹${formatted}`;
  }

  // Format number according to Indian numbering system (for quantities)
  static formatNumber(num: number): string {
    return this.formatIndianNumber(num);
  }

  // Calculate estimated delivery time based on distance
  static calculateDeliveryTime(distance: number): number {
    // Assuming average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const timeInHours = distance / averageSpeed;
    return Math.ceil(timeInHours * 60); // Convert to minutes and round up
  }

  // Validate pricing configuration
  static validatePricing(pricing: Partial<Pricing>): string[] {
    const errors: string[] = [];

    if (!pricing.pricePerKm || pricing.pricePerKm <= 0) {
      errors.push('Price per kilometer must be greater than 0');
    }

    if (!pricing.minimumCharge || pricing.minimumCharge <= 0) {
      errors.push('Minimum charge must be greater than 0');
    }

    if (pricing.minimumCharge && pricing.pricePerKm && pricing.minimumCharge < pricing.pricePerKm) {
      errors.push('Minimum charge should be at least equal to price per kilometer');
    }

    return errors;
  }

  // Get default pricing configuration
  static getDefaultPricing(): Pricing {
    return {
      pricePerKm: 5, // ₹5 per km
      minimumCharge: 50, // ₹50 minimum charge
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }
}
