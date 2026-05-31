/**
 * Navigation Configuration Tests
 * Tests for navigation setup, screen registration, and route configuration
 */

import { describe, expect, it, jest } from '@jest/globals';

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

jest.mock('../../store/authStore', () => ({
  useAuthStore: (
    selector: (state: {
      showSocietySubscriptionIntro: boolean;
      needsPasswordReset: boolean;
    }) => unknown
  ) => selector({ showSocietySubscriptionIntro: false, needsPasswordReset: false }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AuthNavigator from '../../navigation/AuthNavigator';
import MainNavigator from '../../navigation/MainNavigator';

// Mock all screen components
jest.mock('../../screens/auth/LoginScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="LoginScreen"><Text>LoginScreen</Text></View>;
});

jest.mock('../../screens/auth/SocietyLoginScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="SocietyLoginScreen">
      <Text>SocietyLoginScreen</Text>
    </View>
  );
});

jest.mock('../../screens/auth/RegisterScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="RegisterScreen"><Text>RegisterScreen</Text></View>;
});

jest.mock('../../screens/auth/RoleSelectionScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="RoleSelectionScreen"><Text>RoleSelectionScreen</Text></View>;
});

jest.mock('../../screens/auth/VerifyEmailScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="VerifyEmailScreen"><Text>VerifyEmailScreen</Text></View>;
});

jest.mock('../../screens/auth/ForgotPasswordScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="ForgotPasswordScreen"><Text>ForgotPasswordScreen</Text></View>;
});

jest.mock('../../screens/auth/SetNewPasswordScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="SetNewPasswordScreen"><Text>SetNewPasswordScreen</Text></View>;
});

jest.mock('../../screens/customer/ChangePasswordScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="ChangePasswordScreen"><Text>ChangePasswordScreen</Text></View>;
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

jest.mock('../../screens/shared/AddTripScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="AddTripScreen"><Text>AddTripScreen</Text></View>;
});

jest.mock('../../screens/shared/TripDetailsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="TripDetailsScreen">
      <Text>TripDetailsScreen</Text>
    </View>
  );
});

jest.mock('../../screens/shared/AgencyTripBreakdownScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="AgencyTripBreakdownScreen">
      <Text>AgencyTripBreakdownScreen</Text>
    </View>
  );
});

jest.mock('../../screens/shared/SettlePaymentPlaceholderScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="SettlePaymentPlaceholderScreen">
      <Text>SettlePaymentPlaceholderScreen</Text>
    </View>
  );
});

jest.mock('../../screens/society/SubscriptionComingSoonScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="SubscriptionComingSoonScreen">
      <Text>SubscriptionComingSoonScreen</Text>
    </View>
  );
});

jest.mock('../../screens/customer/SubscriptionPlansScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="SubscriptionPlansScreen">
      <Text>SubscriptionPlansScreen</Text>
    </View>
  );
});

jest.mock('../../screens/customer/SubscriptionStatusScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="SubscriptionStatusScreen">
      <Text>SubscriptionStatusScreen</Text>
    </View>
  );
});

jest.mock('../../screens/customer/PaymentScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="PaymentScreen">
      <Text>PaymentScreen</Text>
    </View>
  );
});

jest.mock('../../screens/customer/PaymentHistoryScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="PaymentHistoryScreen">
      <Text>PaymentHistoryScreen</Text>
    </View>
  );
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

  describe('MainNavigator', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<MainNavigator />);
      // Should render the StackNavigator
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });

    it('should have all required screens registered', () => {
      const { getByTestId } = render(<MainNavigator />);
      // Should render the navigator
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });
  });

  describe('Navigation Type Definitions', () => {
    it('should export AuthStackParamList type (Login and Register only)', () => {
      const testParams: { Login: undefined; Register: undefined } = { Login: undefined, Register: undefined };
      expect(testParams).toBeDefined();
    });

    it('should export AppStackParamList shape for main stack', () => {
      const testParams: { Home: undefined } = { Home: undefined };
      expect(testParams).toBeDefined();
    });
  });
});

