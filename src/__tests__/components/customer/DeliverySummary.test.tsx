/**
 * DeliverySummary Component Tests
 * Tests date/time formatting and conditional display logic
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import DeliverySummary from '../../../components/customer/DeliverySummary';
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

describe('DeliverySummary', () => {
  const defaultProps = {
    quantity: 1,
    amount: 600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Date and Time Formatting', () => {
    it('should format date and time correctly', () => {
      const props = {
        ...defaultProps,
        date: '01-01-2024',
        time: '10:30',
        timePeriod: 'AM',
      };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('01-01-2024 at 10:30 AM')).toBeTruthy();
    });

    it('should use PM as default time period when not provided', () => {
      const props = {
        ...defaultProps,
        date: '01-01-2024',
        time: '10:30',
      };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('01-01-2024 at 10:30 PM')).toBeTruthy();
    });

    it('should display "Not set" when date or time is missing', () => {
      const props = {
        ...defaultProps,
        date: '01-01-2024',
        // time is missing
      };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('Not set')).toBeTruthy();
    });

    it('should display "Not set" when date is missing', () => {
      const props = {
        ...defaultProps,
        time: '10:30',
        // date is missing
      };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('Not set')).toBeTruthy();
    });
  });

  describe('Quantity Display', () => {
    it('should display singular form for quantity 1', () => {
      const props = { ...defaultProps, quantity: 1 };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('1 tanker')).toBeTruthy();
    });

    it('should display plural form for quantity greater than 1', () => {
      const props = { ...defaultProps, quantity: 2 };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('2 tankers')).toBeTruthy();
    });

    it('should display quantity correctly for large numbers', () => {
      const props = { ...defaultProps, quantity: 10 };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('10 tankers')).toBeTruthy();
    });
  });

  describe('Optional Fields Display', () => {
    it('should display agency name when provided', () => {
      const props = { ...defaultProps, agencyName: 'ABC Agency' };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('ABC Agency')).toBeTruthy();
    });

    it('should not display agency name when not provided', () => {
      const { queryByText } = render(<DeliverySummary {...defaultProps} />);
      
      expect(queryByText(/Agency/i)).toBeNull();
    });

    it('should display vehicle capacity when provided and greater than 0', () => {
      const props = { ...defaultProps, vehicleCapacity: 1000 };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('1000L')).toBeTruthy();
      expect(getByText(/Tanker Capacity/i)).toBeTruthy();
    });

    it('should not display vehicle capacity when 0', () => {
      const props = { ...defaultProps, vehicleCapacity: 0 };
      const { queryByText } = render(<DeliverySummary {...props} />);
      
      expect(queryByText(/Tanker Capacity/i)).toBeNull();
    });

    it('should not display vehicle capacity when null', () => {
      const props = { ...defaultProps, vehicleCapacity: null };
      const { queryByText } = render(<DeliverySummary {...props} />);
      
      expect(queryByText(/Tanker Capacity/i)).toBeNull();
    });

    it('should display vehicle number when provided', () => {
      const props = { ...defaultProps, vehicleNumber: 'DL01AB1234' };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('DL01AB1234')).toBeTruthy();
      expect(getByText(/Vehicle Number/i)).toBeTruthy();
    });

    it('should display address when provided', () => {
      const props = { ...defaultProps, address: '123 Main St, Mumbai' };
      const { getByText } = render(<DeliverySummary {...props} />);
      
      expect(getByText('123 Main St, Mumbai')).toBeTruthy();
      expect(getByText(/Delivery Address/i)).toBeTruthy();
    });

    it('should not display address when not provided', () => {
      const { queryByText } = render(<DeliverySummary {...defaultProps} />);
      
      expect(queryByText(/Delivery Address/i)).toBeNull();
    });
  });

  describe('Amount Display', () => {
    it('should format and display amount correctly', () => {
      render(<DeliverySummary {...defaultProps} />);
      
      expect(PricingUtils.formatPrice).toHaveBeenCalledWith(600);
    });

    it('should always display total amount', () => {
      const { getByText } = render(<DeliverySummary {...defaultProps} />);
      
      expect(getByText(/Total Amount/i)).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render section title', () => {
      const { getByText } = render(<DeliverySummary {...defaultProps} />);
      
      expect(getByText('Delivery Information')).toBeTruthy();
    });

    it('should always display quantity and total amount', () => {
      const { getByText } = render(<DeliverySummary {...defaultProps} />);
      
      expect(getByText(/Quantity/i)).toBeTruthy();
      expect(getByText(/Total Amount/i)).toBeTruthy();
    });
  });
});

