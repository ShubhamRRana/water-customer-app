import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Typography from './Typography';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';

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

function createMenuDrawerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayDark,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    drawer: {
      width: 280,
      height: '100%',
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      shadowColor: colors.shadow,
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
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      fontFamily: 'PlayfairDisplay-Regular',
      color: colors.text,
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
      backgroundColor: colors.surfaceLight,
    },
    menuItemText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 16,
      fontWeight: '500',
    },
    menuItemTextActive: {
      color: colors.accent,
      fontWeight: '600',
    },
    activeIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.accent,
    },
    logoutSection: {
      marginTop: 'auto',
      paddingTop: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
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
      color: colors.error,
      marginLeft: 8,
      fontWeight: '500',
    },
  });
}

const MenuDrawer = <T extends string>({
  visible,
  onClose,
  onLogout,
  currentRoute,
  menuItems,
}: MenuDrawerProps<T>) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createMenuDrawerStyles(colors), [colors]);

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
                  <Typography variant="h3" style={styles.headerTitle}>
                    Menu
                  </Typography>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
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
                          name={
                            isActive
                              ? (item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap)
                              : item.icon
                          }
                          size={24}
                          color={isActive ? colors.accent : colors.text}
                        />
                        <Typography
                          variant="body"
                          style={[styles.menuItemText, isActive && styles.menuItemTextActive]}
                        >
                          {item.label}
                        </Typography>
                        {isActive && <View style={styles.activeIndicator} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.logoutSection}>
                  <View style={styles.divider} />
                  <TouchableOpacity
                    style={styles.logoutItem}
                    onPress={() => {
                      Alert.alert('Logout', 'Are you sure you want to logout?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Logout',
                          style: 'destructive',
                          onPress: () => {
                            onLogout();
                            onClose();
                          },
                        },
                      ]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
                    <Typography variant="body" style={styles.logoutText}>
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

export default MenuDrawer;
