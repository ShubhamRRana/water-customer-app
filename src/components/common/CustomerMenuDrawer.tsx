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
  /** When `society`, shows Trip details (society-logged tanker trips). */
  customerAccountKind?: CustomerAccountKind | null;
}

const CustomerMenuDrawer: React.FC<CustomerMenuDrawerProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
  customerAccountKind,
}) => {
  const menuItems: MenuItem<CustomerMenuRoute>[] = useMemo(() => {
    const base: MenuItem<CustomerMenuRoute>[] = [
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
        onPress: () => {
          onNavigate('Orders');
          onClose();
        },
      },
      {
        label: 'Past Orders',
        icon: 'time-outline',
        route: 'PastOrders',
        onPress: () => {
          onNavigate('PastOrders');
          onClose();
        },
      },
    ];
    if (customerAccountKind === 'society') {
      base.push({
        label: 'Trip details',
        icon: 'document-text-outline',
        route: 'TripDetails',
        onPress: () => {
          onNavigate('TripDetails');
          onClose();
        },
      });
    }
    // My Subscription screen links to plans + payment history — single drawer row for all customer kinds.
    base.push({
      label: 'My subscription',
      icon: 'shield-checkmark-outline',
      route: 'SubscriptionStatus',
      onPress: () => {
        onNavigate('SubscriptionStatus');
        onClose();
      },
    });
    base.push({
      label: 'Profile',
      icon: 'person-circle-outline',
      route: 'Profile',
      onPress: () => {
        onNavigate('Profile');
        onClose();
      },
    });
    return base;
  }, [customerAccountKind, onClose, onNavigate]);

  return (
    <MenuDrawer
      visible={visible}
      onClose={onClose}
      onNavigate={onNavigate}
      onLogout={onLogout}
      menuItems={menuItems}
      {...(currentRoute !== undefined ? { currentRoute } : {})}
    />
  );
};

export default CustomerMenuDrawer;

