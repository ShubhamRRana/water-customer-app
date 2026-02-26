import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import OrderTrackingScreen from '../screens/customer/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/customer/OrderHistoryScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SavedAddressesScreen from '../screens/customer/SavedAddressesScreen';
import PastOrdersScreen from '../screens/customer/PastOrdersScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';

export type CustomerStackParamList = {
  Home: undefined;
  Orders: undefined;
  Profile: undefined;
  Booking: undefined;
  OrderTracking: { orderId: string };
  SavedAddresses: undefined;
  PastOrders: undefined;
};

const Stack = createStackNavigator<CustomerStackParamList>();

const CustomerNavigator: React.FC = () => {
  return (
    <ErrorBoundary resetKeys={['Customer']}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={CustomerHomeScreen} />
        <Stack.Screen name="Orders" component={OrderHistoryScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
        <Stack.Screen name="PastOrders" component={PastOrdersScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
};

export default CustomerNavigator;
