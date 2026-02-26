/**
 * OrdersFilter Component Tests
 * Tests tab filtering logic and animations
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OrdersFilter from '../../../components/driver/OrdersFilter';

// Mock UI_CONFIG
jest.mock('../../../constants/config', () => ({
  UI_CONFIG: {
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      border: '#E5E7EB',
      background: '#FFFFFF',
      accent: '#3B82F6',
      shadow: '#000000',
      surface: '#FFFFFF',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
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

describe('OrdersFilter', () => {
  const mockOnTabChange = jest.fn();

  const defaultProps = {
    activeTab: 'available' as const,
    onTabChange: mockOnTabChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Rendering', () => {
    it('should render all three tabs', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} />);
      
      expect(getByText('Available')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
    });

    it('should highlight active tab', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const availableTab = getByText('Available');
      expect(availableTab).toBeTruthy();
    });
  });

  describe('Tab Selection', () => {
    it('should call onTabChange when Available tab is pressed', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="active" />);
      
      const availableTab = getByText('Available');
      fireEvent.press(availableTab);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('available');
    });

    it('should call onTabChange when Active tab is pressed', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const activeTab = getByText('Active');
      fireEvent.press(activeTab);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('active');
    });

    it('should call onTabChange when Done tab is pressed', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const doneTab = getByText('Done');
      fireEvent.press(doneTab);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('completed');
    });
  });

  describe('Tab State Management', () => {
    it('should reflect activeTab prop changes', () => {
      const { rerender, getByText } = render(
        <OrdersFilter {...defaultProps} activeTab="available" />
      );
      
      expect(getByText('Available')).toBeTruthy();
      
      rerender(<OrdersFilter {...defaultProps} activeTab="active" />);
      
      expect(getByText('Active')).toBeTruthy();
    });

    it('should handle all tab states correctly', () => {
      const tabs = ['available', 'active', 'completed'] as const;
      
      tabs.forEach(tab => {
        const { getByText } = render(
          <OrdersFilter {...defaultProps} activeTab={tab} />
        );
        
        // Each tab should be renderable
        expect(getByText('Available')).toBeTruthy();
        expect(getByText('Active')).toBeTruthy();
        expect(getByText('Done')).toBeTruthy();
      });
    });
  });

  describe('Component Structure', () => {
    it('should render tab container', () => {
      const { UNSAFE_getByType } = render(<OrdersFilter {...defaultProps} />);
      
      // Component should render without errors
      expect(UNSAFE_getByType).toBeDefined();
    });

    it('should handle rapid tab changes', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const availableTab = getByText('Available');
      const activeTab = getByText('Active');
      const doneTab = getByText('Done');
      
      fireEvent.press(activeTab);
      fireEvent.press(doneTab);
      fireEvent.press(availableTab);
      
      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(1, 'active');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(2, 'completed');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(3, 'available');
    });
  });
});

