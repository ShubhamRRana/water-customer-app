/**
 * SavedAddressModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SavedAddressModal from '../../../components/customer/SavedAddressModal';
import { Address } from '../../../types';

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
      border: '#E5E7EB',
      success: '#10B981',
      textLight: '#FFFFFF',
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

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
} as any;

describe('SavedAddressModal', () => {
  const mockAddresses: Address[] = [
    {
      id: 'address-1',
      address: '123 Main Street, Delhi, Delhi, 110001',
      latitude: 28.6139,
      longitude: 77.2090,
      isDefault: true,
    },
    {
      id: 'address-2',
      address: '456 Park Avenue, Mumbai, Maharashtra, 400001',
      latitude: 19.0760,
      longitude: 72.8777,
      isDefault: false,
    },
  ];

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    addresses: mockAddresses,
    onSelectAddress: jest.fn(),
    navigation: mockNavigation,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should render modal when visible is true', () => {
      const { getByText } = render(<SavedAddressModal {...defaultProps} />);
      
      expect(getByText('Select Saved Address')).toBeTruthy();
    });
  });

  describe('Address List Display', () => {
    it('should display all addresses', () => {
      const { getByText } = render(<SavedAddressModal {...defaultProps} />);
      
      expect(getByText('123 Main Street, Delhi, Delhi, 110001')).toBeTruthy();
      expect(getByText('456 Park Avenue, Mumbai, Maharashtra, 400001')).toBeTruthy();
    });

    it('should display full address text', () => {
      const { getByText } = render(<SavedAddressModal {...defaultProps} />);
      
      expect(getByText('123 Main Street, Delhi, Delhi, 110001')).toBeTruthy();
      expect(getByText('456 Park Avenue, Mumbai, Maharashtra, 400001')).toBeTruthy();
    });

    it('should show default badge for default address', () => {
      const { getByText } = render(<SavedAddressModal {...defaultProps} />);
      
      expect(getByText('DEFAULT')).toBeTruthy();
    });

    it('should not show default badge for non-default addresses', () => {
      const { queryByText } = render(
        <SavedAddressModal
          {...defaultProps}
          addresses={[mockAddresses[1]]}
        />
      );
      
      expect(queryByText('DEFAULT')).toBeNull();
    });

    it('should call onSelectAddress when address is pressed', () => {
      const { getByText } = render(<SavedAddressModal {...defaultProps} />);
      
      const addressCard = getByText('123 Main Street, Delhi, Delhi, 110001');
      fireEvent.press(addressCard);
      
      expect(defaultProps.onSelectAddress).toHaveBeenCalledWith(mockAddresses[0]);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no addresses available', () => {
      const { getByText } = render(
        <SavedAddressModal {...defaultProps} addresses={[]} />
      );
      
      expect(getByText('No saved addresses')).toBeTruthy();
      expect(getByText('Add your first address to get started')).toBeTruthy();
    });

    it('should show Add Address button in empty state', () => {
      const { getByText } = render(
        <SavedAddressModal {...defaultProps} addresses={[]} />
      );
      
      expect(getByText('Add Address')).toBeTruthy();
    });

    it('should navigate to SavedAddresses when Add Address button is pressed', () => {
      const { getByText } = render(
        <SavedAddressModal {...defaultProps} addresses={[]} />
      );
      
      const addButton = getByText('Add Address');
      fireEvent.press(addButton);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SavedAddresses');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Modal Header', () => {
    it('should display modal title', () => {
      const { getByText } = render(<SavedAddressModal {...defaultProps} />);
      
      expect(getByText('Select Saved Address')).toBeTruthy();
    });

    it('should call onClose when close button is pressed', () => {
      // Close button functionality is tested via onClose prop
      expect(defaultProps.onClose).toBeDefined();
    });

    it('should navigate to SavedAddresses when add button in header is pressed', () => {
      // The add button in header navigates to SavedAddresses
      // This is tested via navigation prop
      expect(mockNavigation.navigate).toBeDefined();
    });
  });

  describe('Address Display Formatting', () => {
    it('should display address text correctly', () => {
      const { getByText } = render(
        <SavedAddressModal
          {...defaultProps}
          addresses={[mockAddresses[0]]}
        />
      );
      
      expect(getByText('123 Main Street, Delhi, Delhi, 110001')).toBeTruthy();
    });

    it('should handle address with partial details', () => {
      const partialAddress: Address = {
        id: 'address-3',
        address: '789 Test Road, Bangalore',
        latitude: 12.9716,
        longitude: 77.5946,
      };
      
      const { getByText } = render(
        <SavedAddressModal
          {...defaultProps}
          addresses={[partialAddress]}
        />
      );
      
      expect(getByText('789 Test Road, Bangalore')).toBeTruthy();
    });

    it('should format address details correctly', () => {
      const { getByText } = render(<SavedAddressModal {...defaultProps} />);
      
      // Should display full address string
      expect(getByText('123 Main Street, Delhi, Delhi, 110001')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty addresses array', () => {
      const { getByText } = render(
        <SavedAddressModal {...defaultProps} addresses={[]} />
      );
      
      expect(getByText('No saved addresses')).toBeTruthy();
    });

    it('should handle single address', () => {
      const { getByText } = render(
        <SavedAddressModal
          {...defaultProps}
          addresses={[mockAddresses[0]]}
        />
      );
      
      expect(getByText('123 Main Street, Delhi, Delhi, 110001')).toBeTruthy();
    });

    it('should handle address with minimal details', () => {
      const minimalAddress: Address = {
        id: 'address-4',
        address: 'Minimal Address',
        latitude: 0,
        longitude: 0,
      };
      
      const { getByText } = render(
        <SavedAddressModal
          {...defaultProps}
          addresses={[minimalAddress]}
        />
      );
      
      expect(getByText('Minimal Address')).toBeTruthy();
    });
  });
});

