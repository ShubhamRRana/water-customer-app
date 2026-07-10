import React, { useMemo } from 'react';
import MenuDrawer, { MenuItem } from './MenuDrawer';
import { CustomerAccountKind } from '../../types';

/** Routes reachable from the customer menu drawer (stack screens without params). */
export type CustomerMenuRoute =
  | 'Home'
  | 'Orders'
  | 'Profile'
  | 'PastOrders'
  | 'TripDetails'
  | 'SavedAddresses'
  | 'SubscriptionPlans'
  | 'SubscriptionStatus'
  | 'PaymentHistory';

/** @deprecated Use CustomerMenuRoute */
export type CustomerRoute = CustomerMenuRoute;

interface CustomerMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: CustomerMenuRoute) => void;
  onLogout: () => void;
  currentRoute?: CustomerMenuRoute;
  /** When `society`, shows Trip details and Saved Addresses (society-only stack screens). */
  customerAccountKind?: CustomerAccountKind | null;
  /** Signed-in user's name; shown in the drawer's profile header. */
  userName?: string | null | undefined;
}

/** First letters of the first two words, uppercase (e.g. "Ravi Kumar" -> "RK"). */
function getInitials(name?: string | null): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? words[words.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase();
}

const CustomerMenuDrawer: React.FC<CustomerMenuDrawerProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
  customerAccountKind,
  userName,
}) => {
  const menuItems: MenuItem<CustomerMenuRoute>[] = useMemo(() => {
    const items: MenuItem<CustomerMenuRoute>[] = [
      {
        label: 'Home',
        icon: 'home-outline',
        route: 'Home',
        onPress: () => {
          onNavigate('Home');
          onClose();
        },
      },
      {
        label: 'Orders',
        icon: 'list-outline',
        route: 'Orders',
        section: 'Orders',
        onPress: () => {
          onNavigate('Orders');
          onClose();
        },
      },
      {
        label: 'Past Orders',
        icon: 'time-outline',
        route: 'PastOrders',
        section: 'Orders',
        onPress: () => {
          onNavigate('PastOrders');
          onClose();
        },
      },
    ];
    if (customerAccountKind === 'society') {
      items.push({
        label: 'Trip details',
        icon: 'document-text-outline',
        route: 'TripDetails',
        section: 'Orders',
        onPress: () => {
          onNavigate('TripDetails');
          onClose();
        },
      });
      items.push({
        label: 'Saved Addresses',
        icon: 'location-outline',
        route: 'SavedAddresses',
        section: 'Account',
        onPress: () => {
          onNavigate('SavedAddresses');
          onClose();
        },
      });
    }
    // My Subscription screen links to plans + payment history — single drawer row for all customer kinds.
    items.push({
      label: 'My subscription',
      icon: 'shield-checkmark-outline',
      route: 'SubscriptionStatus',
      section: 'Account',
      onPress: () => {
        onNavigate('SubscriptionStatus');
        onClose();
      },
    });
    items.push({
      label: 'Profile',
      icon: 'person-circle-outline',
      route: 'Profile',
      section: 'Account',
      onPress: () => {
        onNavigate('Profile');
        onClose();
      },
    });
    return items;
  }, [customerAccountKind, onClose, onNavigate]);

  const accountLabel =
    customerAccountKind === 'society' ? 'Society account' : 'Individual account';

  return (
    <MenuDrawer
      visible={visible}
      onClose={onClose}
      onNavigate={onNavigate}
      onLogout={onLogout}
      menuItems={menuItems}
      headerTitle={userName || 'Menu'}
      headerSubtitle={accountLabel}
      headerInitials={getInitials(userName)}
      {...(currentRoute !== undefined ? { currentRoute } : {})}
    />
  );
};

export default CustomerMenuDrawer;
