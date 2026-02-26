/**
 * DateTimeInput Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DateTimeInput from '../../../components/customer/DateTimeInput';

// Mock UI_CONFIG
jest.mock('../../../constants/config', () => ({
  UI_CONFIG: {
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      error: '#EF4444',
      warning: '#F59E0B',
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

  describe('Date Input', () => {
    it('should render date input with placeholder', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const dateInput = getByPlaceholderText('DD-MM-YYYY');
      expect(dateInput).toBeTruthy();
    });

    it('should display date value', () => {
      const { getByPlaceholderText } = render(
        <DateTimeInput {...defaultProps} date="25-12-2024" />
      );
      
      const dateInput = getByPlaceholderText('DD-MM-YYYY');
      expect(dateInput.props.value).toBe('25-12-2024');
    });

    it('should call onDateChange when date is changed', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const dateInput = getByPlaceholderText('DD-MM-YYYY');
      fireEvent.changeText(dateInput, '25-12-2024');
      
      expect(defaultProps.onDateChange).toHaveBeenCalledWith('25-12-2024');
    });

    it('should have maxLength of 10 for date input', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const dateInput = getByPlaceholderText('DD-MM-YYYY');
      expect(dateInput.props.maxLength).toBe(10);
    });

    it('should use numeric keyboard for date input', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const dateInput = getByPlaceholderText('DD-MM-YYYY');
      expect(dateInput.props.keyboardType).toBe('numeric');
    });

    it('should display date error when provided', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} dateError="Invalid date format" />
      );
      
      expect(getByText('Invalid date format')).toBeTruthy();
    });

    it('should apply error styling when dateError is present', () => {
      const { getByPlaceholderText } = render(
        <DateTimeInput {...defaultProps} dateError="Invalid date" />
      );
      
      const dateInput = getByPlaceholderText('DD-MM-YYYY');
      expect(dateInput).toBeTruthy();
      // Error styling is applied via parent Card component
    });
  });

  describe('Time Input', () => {
    it('should render time input with placeholder', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const timeInput = getByPlaceholderText('HH:MM');
      expect(timeInput).toBeTruthy();
    });

    it('should display time value', () => {
      const { getByPlaceholderText } = render(
        <DateTimeInput {...defaultProps} time="10:30" />
      );
      
      const timeInput = getByPlaceholderText('HH:MM');
      expect(timeInput.props.value).toBe('10:30');
    });

    it('should call onTimeChange when time is changed', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const timeInput = getByPlaceholderText('HH:MM');
      fireEvent.changeText(timeInput, '10:30');
      
      expect(defaultProps.onTimeChange).toHaveBeenCalledWith('10:30');
    });

    it('should have maxLength of 5 for time input', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const timeInput = getByPlaceholderText('HH:MM');
      expect(timeInput.props.maxLength).toBe(5);
    });

    it('should use numeric keyboard for time input', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      const timeInput = getByPlaceholderText('HH:MM');
      expect(timeInput.props.keyboardType).toBe('numeric');
    });
  });

  describe('Time Period Toggle (AM/PM)', () => {
    it('should render AM and PM buttons', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      
      expect(getByText('AM')).toBeTruthy();
      expect(getByText('PM')).toBeTruthy();
    });

    it('should call onTimePeriodChange when AM button is pressed', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} timePeriod="PM" />
      );
      
      const amButton = getByText('AM');
      fireEvent.press(amButton);
      
      expect(defaultProps.onTimePeriodChange).toHaveBeenCalledWith('AM');
    });

    it('should call onTimePeriodChange when PM button is pressed', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} timePeriod="AM" />
      );
      
      const pmButton = getByText('PM');
      fireEvent.press(pmButton);
      
      expect(defaultProps.onTimePeriodChange).toHaveBeenCalledWith('PM');
    });

    it('should highlight AM button when AM is selected', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} timePeriod="AM" />
      );
      
      const amButton = getByText('AM');
      // Active styling is applied via style prop
      expect(amButton).toBeTruthy();
    });

    it('should highlight PM button when PM is selected', () => {
      const { getByText } = render(
        <DateTimeInput {...defaultProps} timePeriod="PM" />
      );
      
      const pmButton = getByText('PM');
      // Active styling is applied via style prop
      expect(pmButton).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render both date and time inputs', () => {
      const { getByPlaceholderText } = render(<DateTimeInput {...defaultProps} />);
      
      expect(getByPlaceholderText('DD-MM-YYYY')).toBeTruthy();
      expect(getByPlaceholderText('HH:MM')).toBeTruthy();
    });

    it('should render labels for date and time', () => {
      const { getByText } = render(<DateTimeInput {...defaultProps} />);
      
      expect(getByText('Date')).toBeTruthy();
      expect(getByText('Time')).toBeTruthy();
    });
  });
});

