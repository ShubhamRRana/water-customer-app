import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../constants/config';
import OrdersScreen from '../screens/driver/OrdersScreen';
import DriverEarningsScreen from '../screens/driver/DriverEarningsScreen';
import CollectPaymentScreen from '../screens/driver/CollectPaymentScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';

export type DriverTabParamList = {
  Orders: undefined;
  Earnings: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
  CollectPayment: { orderId: string };
};

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createStackNavigator<DriverStackParamList>();

const DriverTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: UI_CONFIG.colors.accent,
        tabBarInactiveTintColor: UI_CONFIG.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: UI_CONFIG.colors.surface,
          borderTopWidth: 1,
          borderTopColor: UI_CONFIG.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ 
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={DriverEarningsScreen}
        options={{ 
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const DriverNavigator: React.FC = () => {
  return (
    <ErrorBoundary resetKeys={['Driver']}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="DriverTabs" component={DriverTabs} />
        <Stack.Screen name="CollectPayment" component={CollectPaymentScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
};

export default DriverNavigator;
