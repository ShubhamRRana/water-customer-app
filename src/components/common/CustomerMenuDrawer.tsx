import React, { useMemo } from 'react';
import MenuDrawer, { MenuItem } from './MenuDrawer';
import { CustomerAccountKind } from '../../types';

export type CustomerRoute = 'Home' | 'Orders' | 'Profile' | 'PastOrders' | 'TripDetails';

interface CustomerMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: CustomerRoute) => void;
  onLogout: () => void;
  currentRoute?: CustomerRoute;
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
  const menuItems: MenuItem<CustomerRoute>[] = useMemo(() => {
    const base: MenuItem<CustomerRoute>[] = [
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

