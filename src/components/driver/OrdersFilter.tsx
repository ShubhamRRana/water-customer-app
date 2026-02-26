import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, InteractionManager } from 'react-native';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';

export type OrderTab = 'available' | 'active' | 'completed';

interface Tab {
  key: OrderTab;
  label: string;
}

interface OrdersFilterProps {
  activeTab: OrderTab;
  onTabChange: (tab: OrderTab) => void;
}

const OrdersFilter: React.FC<OrdersFilterProps> = memo(({ activeTab, onTabChange }) => {
  const tabs: Tab[] = React.useMemo(() => [
    { key: 'available', label: 'Available' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
  ], []);

  const handleTabPress = useCallback((tab: OrderTab) => {
    onTabChange(tab);
  }, [onTabChange]);

  // Animation values for glass glider
  const tabGliderAnim = useRef(new Animated.Value(0)).current;
  const [tabOptionWidth, setTabOptionWidth] = useState(0);
  const isInitialRender = useRef(true);

  // Animate glider when activeTab changes
  useEffect(() => {
    if (tabOptionWidth > 0) {
      let tabIndex = 0;
      if (activeTab === 'available') tabIndex = 0;
      else if (activeTab === 'active') tabIndex = 1;
      else if (activeTab === 'completed') tabIndex = 2;
      
      const targetValue = tabIndex * tabOptionWidth;
      
      if (isInitialRender.current) {
        // Initial render, set position immediately without animation
        tabGliderAnim.setValue(targetValue);
        isInitialRender.current = false;
      } else {
        // Defer animation to next frame to avoid blocking UI
        InteractionManager.runAfterInteractions(() => {
          Animated.spring(tabGliderAnim, {
            toValue: targetValue,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }).start();
        });
      }
    }
  }, [activeTab, tabOptionWidth]);

  return (
    <View style={styles.tabContainer}>
      <View style={styles.glassRadioGroup}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.glassRadioOption}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.8}
            onLayout={(e) => {
              if (index === 0 && tabOptionWidth === 0) {
                const width = e.nativeEvent.layout.width;
                setTabOptionWidth(width);
              }
            }}
          >
            <Typography 
              variant="body" 
              style={[
                styles.glassRadioLabel,
                activeTab === tab.key && styles.glassRadioLabelActive
              ]}
            >
              {tab.label}
            </Typography>
          </TouchableOpacity>
        ))}
        {tabOptionWidth > 0 && (
          <Animated.View
            style={[
              styles.glassGlider,
              {
                width: tabOptionWidth,
                transform: [{
                  translateX: tabGliderAnim,
                }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
});

OrdersFilter.displayName = 'OrdersFilter';

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
    alignItems: 'center',
  },
  glassRadioGroup: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  glassRadioOption: {
    flex: 1,
    minWidth: 80,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: 12.8,
    paddingHorizontal: 25.6,
    zIndex: 2,
  },
  glassRadioLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    alignSelf: 'center',
  },
  glassRadioLabelActive: {
    color: UI_CONFIG.colors.text,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: UI_CONFIG.colors.accent,
    shadowColor: UI_CONFIG.colors.accent,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    height: '80%',
  },
});

export default OrdersFilter;

