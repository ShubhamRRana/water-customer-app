import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { StackNavigationProp } from '@react-navigation/stack';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import OrderTrackingScreen from '../screens/customer/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/customer/OrderHistoryScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SavedAddressesScreen from '../screens/customer/SavedAddressesScreen';
import PastOrdersScreen from '../screens/customer/PastOrdersScreen';
import AddTripScreen from '../screens/society/AddTripScreen';
import TripDetailsScreen from '../screens/society/TripDetailsScreen';
import SubscriptionComingSoonScreen from '../screens/society/SubscriptionComingSoonScreen';
import SettlePaymentPlaceholderScreen from '../screens/society/SettlePaymentPlaceholderScreen';
import SubscriptionPlansScreen from '../screens/customer/SubscriptionPlansScreen';
import SubscriptionStatusScreen from '../screens/customer/SubscriptionStatusScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useAuthStore } from '../store/authStore';
import type { CustomerStackParamList, RootStackParamList } from './rootNavigation';

export type { CustomerStackParamList } from './rootNavigation';

const Stack = createStackNavigator<CustomerStackParamList>();

const CustomerNavigator: React.FC = () => {
  const showSocietySubscriptionIntro = useAuthStore(s => s.showSocietySubscriptionIntro);
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!showSocietySubscriptionIntro) return;
    rootNavigation.navigate('Customer', { screen: 'SubscriptionComingSoon' });
  }, [showSocietySubscriptionIntro]);

  return (
    <ErrorBoundary resetKeys={['Customer']}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="SubscriptionComingSoon" component={SubscriptionComingSoonScreen} />
        <Stack.Screen name="Home" component={CustomerHomeScreen} />
        <Stack.Screen name="Orders" component={OrderHistoryScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="AddTrip" component={AddTripScreen} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="SettlePaymentPlaceholder" component={SettlePaymentPlaceholderScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
        <Stack.Screen name="PastOrders" component={PastOrdersScreen} />
        <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
        <Stack.Screen name="SubscriptionStatus" component={SubscriptionStatusScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
};

export default CustomerNavigator;
