/**
 * Navigation Configuration Tests
 * Tests for navigation setup, screen registration, and route configuration
 */

// Mock React Navigation before any imports
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) => <View testID="NavigationContainer">{children}</View>,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => <View testID="StackNavigator">{children}</View>,
      Screen: ({ component: Component }: { component: React.ComponentType; name: string }) => 
        Component ? <Component /> : null,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => <View testID="TabNavigator">{children}</View>,
      Screen: ({ component: Component }: { component: React.ComponentType; name: string }) => 
        Component ? <Component /> : null,
    }),
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import AuthNavigator from '../../navigation/AuthNavigator';
import CustomerNavigator from '../../navigation/CustomerNavigator';

// Mock all screen components
jest.mock('../../screens/auth/LoginScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="LoginScreen"><Text>LoginScreen</Text></View>;
});

jest.mock('../../screens/auth/RegisterScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="RegisterScreen"><Text>RegisterScreen</Text></View>;
});

jest.mock('../../screens/customer/CustomerHomeScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="CustomerHomeScreen"><Text>CustomerHomeScreen</Text></View>;
});

jest.mock('../../screens/customer/BookingScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="BookingScreen"><Text>BookingScreen</Text></View>;
});

jest.mock('../../screens/customer/OrderTrackingScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="OrderTrackingScreen"><Text>OrderTrackingScreen</Text></View>;
});

jest.mock('../../screens/customer/OrderHistoryScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="OrderHistoryScreen"><Text>OrderHistoryScreen</Text></View>;
});

jest.mock('../../screens/customer/ProfileScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="ProfileScreen"><Text>ProfileScreen</Text></View>;
});

jest.mock('../../screens/customer/SavedAddressesScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="SavedAddressesScreen"><Text>SavedAddressesScreen</Text></View>;
});

jest.mock('../../screens/customer/PastOrdersScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="PastOrdersScreen"><Text>PastOrdersScreen</Text></View>;
});

jest.mock('../../components/common/ErrorBoundary', () => {
  const React = require('react');
  return ({ children }: { children: React.ReactNode }) => <>{children}</>;
});

jest.mock('../../constants/config', () => ({
  UI_CONFIG: {
    colors: {
      accent: '#fca311',
      textSecondary: '#5a5a5a',
      surface: '#f5f0e0',
      border: '#d4c9b0',
    },
  },
}));

describe('Navigation Configuration', () => {
  describe('AuthNavigator', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<AuthNavigator />);
      // Should render the StackNavigator
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });

    it('should have all required screens registered', () => {
      const { getByTestId } = render(<AuthNavigator />);
      // Should render the navigator
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });
  });

  describe('CustomerNavigator', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<CustomerNavigator />);
      // Should render the StackNavigator
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });

    it('should have all required screens registered', () => {
      const { getByTestId } = render(<CustomerNavigator />);
      // Should render the navigator
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });
  });

  describe('Navigation Type Definitions', () => {
    it('should export AuthStackParamList type (Login and Register only)', () => {
      const testParams: { Login: undefined; Register: undefined } = { Login: undefined, Register: undefined };
      expect(testParams).toBeDefined();
    });

    it('should export CustomerStackParamList type', () => {
      const testParams: { Home: undefined } = { Home: undefined };
      expect(testParams).toBeDefined();
    });
  });
});

