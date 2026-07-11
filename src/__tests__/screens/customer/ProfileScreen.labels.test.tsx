/// <reference types="jest" />

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ProfileScreen from '../../../screens/customer/ProfileScreen';

const mockNavigate = jest.fn();
const mockRefetchProfile = jest.fn();
const mockUpdateUser = jest.fn();
const mockLogout = jest.fn();
const mockSetPreference = jest.fn();
const mockThemeColors = {
  primary: '#1a1d24',
  background: '#1a1d24',
  surface: '#252a33',
  surfaceLight: '#2f3540',
  secondary: '#3d4552',
  accent: '#ffc300',
  accentMuted: '#a08b4a',
  accentAqua: '#5EC9C0',
  text: '#f0f2f5',
  textSecondary: '#9ca3af',
  textLight: '#ffffff',
  border: '#3d4552',
  borderLight: '#4a5568',
  success: '#34d399',
  warning: '#f59e0b',
  error: '#ef4444',
  disabled: '#6b7280',
  shadow: '#000000',
  overlaySubtle: 'rgba(255, 255, 255, 0.06)',
  overlayLight: 'rgba(255, 255, 255, 0.2)',
  overlayMedium: 'rgba(255, 255, 255, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
};

let mockCustomerAccountKind: 'individual' | 'society' = 'individual';

const mockUser = {
  id: 'user-1',
  name: 'River Resident',
  email: 'river@example.com',
  phone: '9876543210',
  role: 'customer',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => {
      cb();
    }, [cb]);
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('../../../components/layouts/AppScreenHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => React.createElement(Text, null, 'Profile');
});

jest.mock('../../../components/common', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const Typography = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, null, children);
  return {
    __esModule: true,
    Typography,
    CustomerMenuDrawer: () => null,
    ScreenLoading: ({ message }: { message: string }) => React.createElement(Text, null, message),
    ScreenError: ({ title }: { title: string }) => React.createElement(View, null, title),
  };
});

jest.mock('../../../components/customer/ProfileSubscriptionPanel', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'SubscriptionPanelStub'),
  };
});

jest.mock('../../../components/customer/SubscriptionExpiryBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'Subscription expires soon'),
  };
});

jest.mock('../../../hooks/useThemeColors', () => ({
  useThemeColors: () => mockThemeColors,
}));

jest.mock('../../../utils', () => ({
  ValidationUtils: {
    validateName: jest.fn(() => ({ isValid: true })),
    validateEmail: jest.fn(() => ({ isValid: true })),
    validatePhone: jest.fn(() => ({ isValid: true })),
  },
  SanitizationUtils: {
    sanitizeName: jest.fn((value: string) => value),
    sanitizeEmail: jest.fn((value: string) => value),
    sanitizePhone: jest.fn((value: string) => value),
    sanitizeNameWhileEditing: jest.fn((value: string) => value),
  },
}));

jest.mock('../../../utils/dateUtils', () => ({
  formatDateOnly: jest.fn(() => 'Jan 1, 2024'),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
}));

jest.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    updateUser: mockUpdateUser,
    logout: mockLogout,
    isLoading: false,
    customerAccountKind: mockCustomerAccountKind,
  }),
}));

jest.mock('../../../store/themeStore', () => ({
  useThemeStore: (selector: (state: { preference: string; setPreference: jest.Mock }) => unknown) =>
    selector({ preference: 'dark', setPreference: mockSetPreference }),
}));

jest.mock('../../../hooks/queries', () => ({
  invalidateAuthProfileQueries: jest.fn(),
  useAuthProfileQuery: () => ({
    data: mockUser,
    refetch: mockRefetchProfile,
  }),
}));

jest.mock('../../../services/auth.service', () => ({
  AuthService: {
    deleteCustomerAccount: jest.fn(),
  },
}));

describe('ProfileScreen account labels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomerAccountKind = 'individual';
  });

  it('shows individual account labels without the removed member or old banner content', () => {
    const { getByText, queryByText } = render(<ProfileScreen navigation={{ navigate: mockNavigate } as never} />);

    expect(getByText('Individual account')).toBeTruthy();
    expect(getByText('Name')).toBeTruthy();
    expect(queryByText('Member Since')).toBeNull();
    expect(queryByText(/Subscription expires/i)).toBeNull();
    expect(getByText('SubscriptionPanelStub')).toBeTruthy();
  });

  it('shows society account labels in the identity strip and inline edit form', () => {
    mockCustomerAccountKind = 'society';
    const { getByText, getAllByText } = render(
      <ProfileScreen navigation={{ navigate: mockNavigate } as never} />
    );

    expect(getByText('Society account')).toBeTruthy();
    expect(getByText('Society name')).toBeTruthy();

    fireEvent.press(getByText('Edit Profile'));

    expect(getAllByText('Society name').length).toBeGreaterThanOrEqual(2);
  });
});
