import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Typography from './Typography';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';

const DRAWER_WIDTH = 300;

export interface MenuItem<T extends string> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: T;
  onPress: () => void;
  /** Optional group heading; consecutive items sharing a section render under one label. */
  section?: string;
}

export interface MenuDrawerProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: T) => void;
  onLogout: () => void;
  currentRoute?: T;
  menuItems: MenuItem<T>[];
  /** Name shown in the profile header (Playfair display). */
  headerTitle?: string;
  /** Caption under the name, e.g. account type. */
  headerSubtitle?: string;
  /** 1–2 letters shown inside the avatar circle. */
  headerInitials?: string;
}

function createMenuDrawerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlayDark,
    },
    drawer: {
      width: DRAWER_WIDTH,
      height: '100%',
      backgroundColor: colors.surface,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 20,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 4,
        height: 0,
      },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 12,
      overflow: 'hidden',
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 18,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceLight,
      borderWidth: 2,
      borderColor: colors.accentAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.accent,
    },
    headerText: {
      flex: 1,
      marginLeft: 14,
    },
    headerName: {
      fontSize: 20,
      fontFamily: 'PlayfairDisplay-Regular',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      padding: 4,
      alignSelf: 'flex-start',
    },
    ripple: {
      marginTop: -4,
      marginBottom: 4,
    },
    menuItems: {
      paddingTop: 12,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: colors.accentAqua,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 6,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
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

/** Thin water-ripple divider — the drawer's signature flourish. */
const RippleDivider: React.FC<{ color: string; style?: object }> = ({ color, style }) => (
  <View style={style}>
    <Svg width="100%" height={12} viewBox="0 0 300 12" preserveAspectRatio="none">
      <Path
        d="M0 6 C 25 0, 50 12, 75 6 S 125 0, 150 6 S 200 12, 225 6 S 275 0, 300 6"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  </View>
);

const MenuDrawer = <T extends string>({
  visible,
  onClose,
  onLogout,
  currentRoute,
  menuItems,
  headerTitle,
  headerSubtitle,
  headerInitials,
}: MenuDrawerProps<T>) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createMenuDrawerStyles(colors), [colors]);

  // Keep the Modal mounted through the exit animation.
  const [rendered, setRendered] = useState(visible);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setRendered(false);
        }
      });
    }
  }, [visible, rendered, translateX, backdropOpacity]);

  if (!rendered) {
    return null;
  }

  const initials = (headerInitials || '').slice(0, 2).toUpperCase();

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
            <LinearGradient
              colors={[colors.surfaceLight, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.header}>
                {initials ? (
                  <View style={styles.avatar}>
                    <Typography variant="body" style={styles.avatarInitials}>
                      {initials}
                    </Typography>
                  </View>
                ) : null}
                <View style={styles.headerText}>
                  <Typography variant="h3" style={styles.headerName} numberOfLines={1}>
                    {headerTitle || 'Menu'}
                  </Typography>
                  {headerSubtitle ? (
                    <Typography variant="caption" style={styles.headerSubtitle} numberOfLines={1}>
                      {headerSubtitle}
                    </Typography>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <RippleDivider color={colors.accentAqua} style={styles.ripple} />

            <View style={styles.menuItems}>
              {menuItems.map((item, index) => {
                const isActive = currentRoute === item.route;
                const prevSection = index > 0 ? menuItems[index - 1]?.section : undefined;
                const showSectionLabel = !!item.section && item.section !== prevSection;
                return (
                  <React.Fragment key={String(item.route)}>
                    {showSectionLabel && (
                      <Typography variant="caption" style={styles.sectionLabel}>
                        {item.section!.toUpperCase()}
                      </Typography>
                    )}
                    <TouchableOpacity
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
                  </React.Fragment>
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
        </Animated.View>
      </View>
    </Modal>
  );
};

export default MenuDrawer;
