import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import MenuDrawer, { MenuItem } from './MenuDrawer';

export type CustomerRoute = 'Home' | 'Orders' | 'Profile' | 'PastOrders';

interface CustomerMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: CustomerRoute) => void;
  onLogout: () => void;
  currentRoute?: CustomerRoute;
}

const CustomerMenuDrawer: React.FC<CustomerMenuDrawerProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
}) => {
  const menuItems: MenuItem<CustomerRoute>[] = [
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
    {
      label: 'Profile',
      icon: 'person-circle-outline',
      route: 'Profile',
      onPress: () => {
        onNavigate('Profile');
        onClose();
      },
    },
  ];

  return (
    <MenuDrawer
      visible={visible}
      onClose={onClose}
      onNavigate={onNavigate}
      onLogout={onLogout}
      currentRoute={currentRoute}
      menuItems={menuItems}
    />
  );
};

export default CustomerMenuDrawer;

