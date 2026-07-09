import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
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
import AddTripScreen from '../screens/shared/AddTripScreen';
import TripDetailsScreen from '../screens/shared/TripDetailsScreen';
import AgencyTripBreakdownScreen from '../screens/shared/AgencyTripBreakdownScreen';
import SubscriptionComingSoonScreen from '../screens/society/SubscriptionComingSoonScreen';
import SettlePaymentPlaceholderScreen from '../screens/shared/SettlePaymentPlaceholderScreen';
import SubscriptionPlansScreen from '../screens/customer/SubscriptionPlansScreen';
import SubscriptionStatusScreen from '../screens/customer/SubscriptionStatusScreen';
import PaySubscriptionScreen from '../screens/customer/PaySubscriptionScreen';
import PayBookingScreen from '../screens/customer/PayBookingScreen';
import PaymentResultScreen from '../screens/shared/PaymentResultScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import ChangePasswordScreen from '../screens/customer/ChangePasswordScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ScreenLoading } from '../components/common';
import { useAuthStore } from '../store/authStore';
import { isCustomerUser } from '../types/index';
import { resolveSubscriptionAccess } from '../utils/postLoginSubscriptionGate';
import type { AppStackParamList } from './rootNavigation';

export type { AppStackParamList } from './rootNavigation';

const Stack = createStackNavigator<AppStackParamList>();

type MainStackNavigation = StackNavigationProp<AppStackParamList>;

const MainNavigator: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<MainStackNavigation>();
  const [gateState, setGateState] = useState<'checking' | 'ready'>('checking');
  const gateRunIdRef = useRef(0);

  const runSubscriptionGate = useCallback(async () => {
    if (!user?.id || !isCustomerUser(user)) {
      setGateState('ready');
      return;
    }

    const runId = ++gateRunIdRef.current;
    setGateState('checking');

    const access = await resolveSubscriptionAccess(user.id);
    if (runId !== gateRunIdRef.current) return;

    if (access === 'required') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'SubscriptionPlans', params: { required: true } }],
      });
    }

    setGateState('ready');
  }, [navigation, user?.id]);

  useEffect(() => {
    void runSubscriptionGate();
  }, [runSubscriptionGate]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void runSubscriptionGate();
      }
    });
    return () => sub.remove();
  }, [runSubscriptionGate]);

  return (
    <ErrorBoundary resetKeys={['Main']}>
      <View style={styles.container}>
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
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
          <Stack.Screen name="AddTrip" component={AddTripScreen} />
          <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
          <Stack.Screen name="AgencyTripBreakdown" component={AgencyTripBreakdownScreen} />
          <Stack.Screen name="SettlePaymentPlaceholder" component={SettlePaymentPlaceholderScreen} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
          <Stack.Screen name="PastOrders" component={PastOrdersScreen} />
          <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
          <Stack.Screen name="SubscriptionStatus" component={SubscriptionStatusScreen} />
          <Stack.Screen name="PaySubscription" component={PaySubscriptionScreen} />
          <Stack.Screen name="PayBooking" component={PayBookingScreen} />
          <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
          <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        </Stack.Navigator>
        {gateState === 'checking' ? (
          <View style={styles.gateOverlay}>
            <ScreenLoading message="Checking subscription..." />
          </View>
        ) : null}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gateOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

export default MainNavigator;
