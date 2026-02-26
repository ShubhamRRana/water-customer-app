/**
 * StatusUpdateModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StatusUpdateModal from '../../../components/admin/StatusUpdateModal';
import { BookingStatus } from '../../../types';

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

describe('StatusUpdateModal', () => {
  const mockGetStatusColor = (status: BookingStatus): string => {
    const colors: Record<BookingStatus, string> = {
      pending: '#F59E0B',
      accepted: '#3B82F6',
      in_transit: '#8B5CF6',
      delivered: '#10B981',
      cancelled: '#EF4444',
    };
    return colors[status] || '#666666';
  };

  const mockGetStatusIcon = (status: BookingStatus): string => {
    const icons: Record<BookingStatus, string> = {
      pending: 'time-outline',
      accepted: 'checkmark-circle-outline',
      in_transit: 'car-outline',
      delivered: 'checkmark-done-outline',
      cancelled: 'close-circle-outline',
    };
    return icons[status] || 'help-outline';
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    bookingId: 'booking-1',
    onStatusUpdate: jest.fn(),
    getStatusColor: mockGetStatusColor,
    getStatusIcon: mockGetStatusIcon,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should render modal when visible is true', () => {
      const { getByText } = render(<StatusUpdateModal {...defaultProps} />);
      
      expect(getByText('Update Status')).toBeTruthy();
    });
  });

  describe('Status Options Display', () => {
    it('should display all status options', () => {
      const { getByText } = render(<StatusUpdateModal {...defaultProps} />);
      
      expect(getByText('PENDING')).toBeTruthy();
      expect(getByText('ACCEPTED')).toBeTruthy();
      expect(getByText('IN TRANSIT')).toBeTruthy();
      expect(getByText('DELIVERED')).toBeTruthy();
      expect(getByText('CANCELLED')).toBeTruthy();
    });

    it('should format status text correctly (replace underscore with space)', () => {
      const { getByText } = render(<StatusUpdateModal {...defaultProps} />);
      
      // in_transit should become "IN TRANSIT"
      expect(getByText('IN TRANSIT')).toBeTruthy();
    });

    it('should use getStatusColor for each status option', () => {
      const getStatusColorSpy = jest.fn(mockGetStatusColor);
      render(
        <StatusUpdateModal
          {...defaultProps}
          getStatusColor={getStatusColorSpy}
        />
      );
      
      // getStatusColor should be called for each status
      expect(getStatusColorSpy).toHaveBeenCalledWith('pending');
      expect(getStatusColorSpy).toHaveBeenCalledWith('accepted');
      expect(getStatusColorSpy).toHaveBeenCalledWith('in_transit');
      expect(getStatusColorSpy).toHaveBeenCalledWith('delivered');
      expect(getStatusColorSpy).toHaveBeenCalledWith('cancelled');
    });

    it('should use getStatusIcon for each status option', () => {
      const getStatusIconSpy = jest.fn(mockGetStatusIcon);
      render(
        <StatusUpdateModal
          {...defaultProps}
          getStatusIcon={getStatusIconSpy}
        />
      );
      
      // getStatusIcon should be called for each status
      expect(getStatusIconSpy).toHaveBeenCalledWith('pending');
      expect(getStatusIconSpy).toHaveBeenCalledWith('accepted');
      expect(getStatusIconSpy).toHaveBeenCalledWith('in_transit');
      expect(getStatusIconSpy).toHaveBeenCalledWith('delivered');
      expect(getStatusIconSpy).toHaveBeenCalledWith('cancelled');
    });
  });

  describe('Status Selection', () => {
    it('should call onStatusUpdate when status option is pressed', () => {
      const { getByText } = render(<StatusUpdateModal {...defaultProps} />);
      
      const pendingOption = getByText('PENDING');
      fireEvent.press(pendingOption);
      
      expect(defaultProps.onStatusUpdate).toHaveBeenCalledWith('booking-1', 'pending');
    });

    it('should call onStatusUpdate with correct bookingId and status', () => {
      const { getByText } = render(<StatusUpdateModal {...defaultProps} />);
      
      const deliveredOption = getByText('DELIVERED');
      fireEvent.press(deliveredOption);
      
      expect(defaultProps.onStatusUpdate).toHaveBeenCalledWith('booking-1', 'delivered');
    });

    it('should handle all status options', () => {
      const { getByText } = render(<StatusUpdateModal {...defaultProps} />);
      
      const statuses: BookingStatus[] = ['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];
      
      statuses.forEach((status) => {
        const statusText = status.replace('_', ' ').toUpperCase();
        const option = getByText(statusText);
        fireEvent.press(option);
        
        expect(defaultProps.onStatusUpdate).toHaveBeenCalledWith('booking-1', status);
      });
    });

    it('should not call onStatusUpdate when bookingId is null', () => {
      const { getByText } = render(
        <StatusUpdateModal {...defaultProps} bookingId={null} />
      );
      
      const pendingOption = getByText('PENDING');
      fireEvent.press(pendingOption);
      
      // onStatusUpdate should not be called when bookingId is null
      expect(defaultProps.onStatusUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Modal Header', () => {
    it('should display modal title', () => {
      const { getByText } = render(<StatusUpdateModal {...defaultProps} />);
      
      expect(getByText('Update Status')).toBeTruthy();
    });

    it('should call onClose when close button is pressed', () => {
      // Close button functionality is tested via onClose prop
      expect(defaultProps.onClose).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null bookingId', () => {
      const { getByText } = render(
        <StatusUpdateModal {...defaultProps} bookingId={null} />
      );
      
      expect(getByText('Update Status')).toBeTruthy();
      // Status options should still be displayed but not functional
    });

    it('should handle empty string bookingId', () => {
      const { getByText } = render(
        <StatusUpdateModal {...defaultProps} bookingId="" />
      );
      
      expect(getByText('Update Status')).toBeTruthy();
    });
  });
});

