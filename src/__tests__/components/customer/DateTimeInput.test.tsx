/**
 * DateTimeInput Component Tests
 * Uses calendar picker for date and time scroller for time
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DateTimeInput from '../../../components/customer/DateTimeInput';

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return function MockDateTimePicker({
    onChange,
    value,
  }: {
    onChange: (e: { type: string }, d?: Date) => void;
    value: Date;
  }) {
    return React.createElement('Button', {
      testID: 'date-time-picker',
      title: 'Pick',
      onPress: () => onChange({ type: 'set' }, value),
    });
  };
});

// Mock UI_CONFIG
jest.mock('../../../constants/config', () => ({
  UI_CONFIG: {
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      error: '#EF4444',
      accent: '#3B82F6',
      border: '#E5E7EB',
      surface: '#FFFFFF',
      textLight: '#FFFFFF',
      primary: '#3B82F6',
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

describe('DateTimeInput', () => {
  const defaultProps = {
    date: '',
    time: '',
    timePeriod: 'AM' as 'AM' | 'PM',
    onDateChange: jest.fn(),
    onTimeChange: jest.fn(),
    onTimePeriodChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Date Picker', () => {
    it('should render date picker trigger with placeholder text when empty', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      expect(getByText('Tap to select date')).toBeTruthy();
    });

    it('should display selected date value', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} date="25-12-2024" />
      );
      expect(getByText('25-12-2024')).toBeTruthy();
    });

    it('should display date label', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      expect(getByText('Date')).toBeTruthy();
    });

    it('should display date error when provided', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} dateError="Invalid date format" />
      );
      expect(getByText('Invalid date format')).toBeTruthy();
    });
  });

  describe('Time Picker', () => {
    it('should render time picker trigger with placeholder text when empty', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      expect(getByText('Tap to select time')).toBeTruthy();
    });

    it('should display selected time value with period', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} time="10:30" timePeriod="AM" />
      );
      expect(getByText('10:30 AM')).toBeTruthy();
    });

    it('should display time label', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      expect(getByText('Time')).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render both date and time picker triggers', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      expect(getByText('Tap to select date')).toBeTruthy();
      expect(getByText('Tap to select time')).toBeTruthy();
    });

    it('should render labels for date and time', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      expect(getByText('Date')).toBeTruthy();
      expect(getByText('Time')).toBeTruthy();
    });
  });
});
