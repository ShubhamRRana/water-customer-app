import type { StackNavigationProp } from '@react-navigation/stack';
import type { CustomerMenuRoute } from '../components/common/CustomerMenuDrawer';
import type { AppStackParamList } from './rootNavigation';

/**
 * Navigate to a drawer-listed customer stack screen (no route params).
 */
export function navigateCustomerMenuRoute(
  navigation: StackNavigationProp<AppStackParamList>,
  route: CustomerMenuRoute
): void {
  switch (route) {
    case 'Home':
      navigation.navigate('Home');
      break;
    case 'Orders':
      navigation.navigate('Orders');
      break;
    case 'Profile':
      navigation.navigate('Profile');
      break;
    case 'PastOrders':
      navigation.navigate('PastOrders');
      break;
    case 'TripDetails':
      navigation.navigate('TripDetails');
      break;
    case 'SavedAddresses':
      navigation.navigate('SavedAddresses');
      break;
    case 'SubscriptionPlans':
      navigation.navigate('SubscriptionPlans');
      break;
    case 'SubscriptionStatus':
      navigation.navigate('SubscriptionStatus');
      break;
    case 'PaymentHistory':
      navigation.navigate('PaymentHistory');
      break;
  }
}
