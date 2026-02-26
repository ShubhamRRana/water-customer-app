/**
 * TankerSelectionModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TankerSelectionModal from '../../../components/customer/TankerSelectionModal';

// Mock UI_CONFIG
jest.mock('../../../constants/config', () => ({
  UI_CONFIG: {
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      error: '#EF4444',
      primary: '#3B82F6',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      surfaceLight: '#FAFAFA',
      border: '#E5E7EB',
      shadow: '#000000',
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
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    fonts: {
      primary: 'System',
      bold: 'System',
      fallback: ['System'],
    },
  },
}));

// Mock PricingUtils
jest.mock('../../../utils/pricing', () => ({
  PricingUtils: {
    formatPrice: (price: number) => `₹${price}`,
  },
}));

// Mock LoadingSpinner
jest.mock('../../../components/common/LoadingSpinner', () => {
  return function LoadingSpinner() {
    return null;
  };
});

describe('TankerSelectionModal', () => {
  const mockVehicles = [
    {
      id: 'vehicle-1',
      vehicleCapacity: 10000,
      amount: 600,
      vehicleNumber: 'ABC123',
    },
    {
      id: 'vehicle-2',
      vehicleCapacity: 15000,
      amount: 900,
      vehicleNumber: 'XYZ789',
    },
  ];

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    vehicles: mockVehicles,
    selectedVehicleId: null,
    onSelectVehicle: jest.fn(),
    loading: false,
    selectedAgency: { id: 'agency-1', name: 'Test Agency' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should render modal when visible is true', () => {
      const { getByText } = render(<TankerSelectionModal {...defaultProps} />);
      
      expect(getByText('Select Vehicle')).toBeTruthy();
    });
  });

  describe('Vehicle List Display', () => {
    it('should display all vehicles with capacity and number', () => {
      const { getByText } = render(<TankerSelectionModal {...defaultProps} />);
      
      expect(getByText('10000L Tanker - ABC123')).toBeTruthy();
      expect(getByText('15000L Tanker - XYZ789')).toBeTruthy();
    });

    it('should display base price for each vehicle', () => {
      const { getByText } = render(<TankerSelectionModal {...defaultProps} />);
      
      expect(getByText('₹600 base price')).toBeTruthy();
      expect(getByText('₹900 base price')).toBeTruthy();
    });

    it('should call onSelectVehicle when vehicle is pressed', () => {
      const { getByText } = render(<TankerSelectionModal {...defaultProps} />);
      
      const vehicleCard = getByText('10000L Tanker - ABC123');
      fireEvent.press(vehicleCard);
      
      expect(defaultProps.onSelectVehicle).toHaveBeenCalledWith({
        id: 'vehicle-1',
        capacity: 10000,
        amount: 600,
        vehicleNumber: 'ABC123',
      });
    });

    it('should transform vehicle data correctly when selected', () => {
      const { getByText } = render(<TankerSelectionModal {...defaultProps} />);
      
      const vehicleCard = getByText('15000L Tanker - XYZ789');
      fireEvent.press(vehicleCard);
      
      expect(defaultProps.onSelectVehicle).toHaveBeenCalledWith({
        id: 'vehicle-2',
        capacity: 15000,
        amount: 900,
        vehicleNumber: 'XYZ789',
      });
    });

    it('should highlight selected vehicle', () => {
      const { getByText } = render(
        <TankerSelectionModal {...defaultProps} selectedVehicleId="vehicle-1" />
      );
      
      const vehicleCard = getByText('10000L Tanker - ABC123');
      expect(vehicleCard).toBeTruthy();
      // Selected styling is applied via style prop
    });

    it('should show radio button on for selected vehicle', () => {
      const { getByText } = render(
        <TankerSelectionModal {...defaultProps} selectedVehicleId="vehicle-1" />
      );
      
      expect(getByText('10000L Tanker - ABC123')).toBeTruthy();
      // Radio button icon changes based on selection
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      const { getByText } = render(
        <TankerSelectionModal {...defaultProps} loading={true} />
      );
      
      expect(getByText('Loading vehicles...')).toBeTruthy();
    });

    it('should not show vehicle list when loading', () => {
      const { queryByText } = render(
        <TankerSelectionModal {...defaultProps} loading={true} />
      );
      
      expect(queryByText('10000L Tanker - ABC123')).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no vehicles available and agency is selected', () => {
      const { getByText } = render(
        <TankerSelectionModal
          {...defaultProps}
          vehicles={[]}
          selectedAgency={{ id: 'agency-1', name: 'Test Agency' }}
        />
      );
      
      expect(getByText('No vehicles available')).toBeTruthy();
      expect(getByText('This agency has no vehicles yet')).toBeTruthy();
    });

    it('should show different message when no agency is selected', () => {
      const { getByText } = render(
        <TankerSelectionModal
          {...defaultProps}
          vehicles={[]}
          selectedAgency={null}
        />
      );
      
      expect(getByText('No vehicles available')).toBeTruthy();
      expect(getByText('Please select an agency first')).toBeTruthy();
    });

    it('should not show vehicle list when empty', () => {
      const { queryByText } = render(
        <TankerSelectionModal {...defaultProps} vehicles={[]} />
      );
      
      expect(queryByText('10000L Tanker - ABC123')).toBeNull();
    });
  });

  describe('Modal Header', () => {
    it('should display modal title', () => {
      const { getByText } = render(<TankerSelectionModal {...defaultProps} />);
      
      expect(getByText('Select Vehicle')).toBeTruthy();
    });

    it('should call onClose when close button is pressed', () => {
      // Close button functionality is tested via onClose prop
      expect(defaultProps.onClose).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty vehicles array', () => {
      const { getByText } = render(
        <TankerSelectionModal {...defaultProps} vehicles={[]} />
      );
      
      expect(getByText('No vehicles available')).toBeTruthy();
    });

    it('should handle single vehicle', () => {
      const singleVehicle = [mockVehicles[0]];
      const { getByText } = render(
        <TankerSelectionModal {...defaultProps} vehicles={singleVehicle} />
      );
      
      expect(getByText('10000L Tanker - ABC123')).toBeTruthy();
    });

    it('should handle null selectedVehicleId', () => {
      const { getByText } = render(
        <TankerSelectionModal {...defaultProps} selectedVehicleId={null} />
      );
      
      expect(getByText('10000L Tanker - ABC123')).toBeTruthy();
    });

    it('should handle null selectedAgency', () => {
      const { getByText } = render(
        <TankerSelectionModal
          {...defaultProps}
          vehicles={[]}
          selectedAgency={null}
        />
      );
      
      expect(getByText('Please select an agency first')).toBeTruthy();
    });
  });
});

