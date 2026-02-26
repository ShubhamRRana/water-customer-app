/**
 * PriceBreakdown Component Tests
 * Tests price formatting and display logic
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import PriceBreakdown from '../../../components/customer/PriceBreakdown';
import { PricingUtils } from '../../../utils/pricing';

// Mock PricingUtils
jest.mock('../../../utils/pricing', () => ({
  PricingUtils: {
    formatPrice: jest.fn((amount) => `₹${amount.toLocaleString('en-IN')}`),
  },
}));

// Mock UI_CONFIG
jest.mock('../../../constants/config', () => ({
  UI_CONFIG: {
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      border: '#E5E7EB',
      primary: '#3B82F6',
      surface: '#FFFFFF',
      shadow: '#000000',
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
  },
}));

describe('PriceBreakdown', () => {
  const defaultProps = {
    basePrice: 500,
    totalPrice: 600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Price Display', () => {
    it('should display base price formatted correctly', () => {
      const { getByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(PricingUtils.formatPrice).toHaveBeenCalledWith(500);
      expect(getByText(/Unit Price/i)).toBeTruthy();
    });

    it('should display total price formatted correctly', () => {
      const { getByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(PricingUtils.formatPrice).toHaveBeenCalledWith(600);
      expect(getByText(/Total Amount/i)).toBeTruthy();
    });

    it('should display both base and total prices', () => {
      const { getByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(getByText(/Unit Price/i)).toBeTruthy();
      expect(getByText(/Total Amount/i)).toBeTruthy();
    });
  });

  describe('Optional Fields Display', () => {
    it('should display agency name when provided', () => {
      const props = { ...defaultProps, agencyName: 'ABC Agency' };
      const { getByText } = render(<PriceBreakdown {...props} />);
      
      expect(getByText('ABC Agency')).toBeTruthy();
    });

    it('should not display agency name when not provided', () => {
      const { queryByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(queryByText(/Agency/i)).toBeNull();
    });

    it('should display vehicle capacity when provided', () => {
      const props = { ...defaultProps, vehicleCapacity: 1000 };
      const { getByText } = render(<PriceBreakdown {...props} />);
      
      expect(getByText('1000L')).toBeTruthy();
      expect(getByText(/Vehicle Capacity/i)).toBeTruthy();
    });

    it('should not display vehicle capacity when not provided', () => {
      const { queryByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(queryByText(/Vehicle Capacity/i)).toBeNull();
    });

    it('should display vehicle number when provided', () => {
      const props = { ...defaultProps, vehicleNumber: 'DL01AB1234' };
      const { getByText } = render(<PriceBreakdown {...props} />);
      
      expect(getByText('DL01AB1234')).toBeTruthy();
      expect(getByText(/Vehicle Number/i)).toBeTruthy();
    });

    it('should not display vehicle number when not provided', () => {
      const { queryByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(queryByText(/Vehicle Number/i)).toBeNull();
    });
  });

  describe('Price Formatting', () => {
    it('should format large amounts correctly', () => {
      const props = { basePrice: 5000, totalPrice: 6000 };
      render(<PriceBreakdown {...props} />);
      
      expect(PricingUtils.formatPrice).toHaveBeenCalledWith(5000);
      expect(PricingUtils.formatPrice).toHaveBeenCalledWith(6000);
    });

    it('should format small amounts correctly', () => {
      const props = { basePrice: 50, totalPrice: 100 };
      render(<PriceBreakdown {...props} />);
      
      expect(PricingUtils.formatPrice).toHaveBeenCalledWith(50);
      expect(PricingUtils.formatPrice).toHaveBeenCalledWith(100);
    });
  });

  describe('Component Structure', () => {
    it('should render section title', () => {
      const { getByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(getByText('Price Breakdown')).toBeTruthy();
    });

    it('should always display unit price and total amount', () => {
      const { getByText } = render(<PriceBreakdown {...defaultProps} />);
      
      expect(getByText(/Unit Price/i)).toBeTruthy();
      expect(getByText(/Total Amount/i)).toBeTruthy();
    });
  });
});

