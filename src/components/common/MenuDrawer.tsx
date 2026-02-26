import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Typography from './Typography';
import { UI_CONFIG } from '../../constants/config';

export interface MenuItem<T extends string> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: T;
  onPress: () => void;
}

export interface MenuDrawerProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: T) => void;
  onLogout: () => void;
  currentRoute?: T;
  menuItems: MenuItem<T>[];
}

const MenuDrawer = <T extends string>({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
  menuItems,
}: MenuDrawerProps<T>) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.drawer}>
              <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
                <View style={styles.header}>
                  <Typography variant="h3" style={styles.headerTitle}>Menu</Typography>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.menuItems}>
                  {menuItems.map((item) => {
                    const isActive = currentRoute === item.route;
                    return (
                      <TouchableOpacity
                        key={String(item.route)}
                        style={[styles.menuItem, isActive && styles.menuItemActive]}
                        onPress={item.onPress}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isActive ? (item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : item.icon}
                          size={24}
                          color={isActive ? UI_CONFIG.colors.primary : UI_CONFIG.colors.text}
                        />
                        <Typography
                          variant="body"
                          style={[
                            styles.menuItemText,
                            isActive && styles.menuItemTextActive,
                          ]}
                        >
                          {item.label}
                        </Typography>
                        {isActive && (
                          <View style={styles.activeIndicator} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Logout Button */}
                <View style={styles.logoutSection}>
                  <View style={styles.divider} />
                  <TouchableOpacity
                    style={styles.logoutItem}
                    onPress={() => {
                      Alert.alert(
                        'Logout',
                        'Are you sure you want to logout?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Logout', 
                            style: 'destructive', 
                            onPress: () => {
                              onLogout();
                              onClose();
                            }
                          },
                        ]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={24}
                      color={UI_CONFIG.colors.error}
                    />
                    <Typography
                      variant="body"
                      style={styles.logoutText}
                    >
                      Logout
                    </Typography>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawer: {
    width: 280,
    height: '100%',
    backgroundColor: UI_CONFIG.colors.surface,
    borderRightWidth: 1,
    borderRightColor: UI_CONFIG.colors.border,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  menuItemText: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    marginLeft: 16,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: UI_CONFIG.colors.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: UI_CONFIG.colors.primary,
  },
  logoutSection: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: UI_CONFIG.colors.border,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: UI_CONFIG.colors.error,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default MenuDrawer;

