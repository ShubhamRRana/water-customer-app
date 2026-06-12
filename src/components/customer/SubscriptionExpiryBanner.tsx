import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Typography } from '../common';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SubscriptionService } from '../../services/subscription.service';
import type { UserSubscription } from '../../types/subscription.types';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { isSubscriptionGatingEnabled } from '../../utils/subscriptionGating';

interface SubscriptionExpiryBannerProps {
  userId?: string | undefined;
  navigation?: StackNavigationProp<AppStackParamList>;
}

function createBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    },
    text: {
      flex: 1,
      color: colors.text,
      lineHeight: 22,
      paddingRight: 8,
    },
    cta: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    ctaText: {
      color: colors.accent,
      fontWeight: '600',
    },
  });
}

const SubscriptionExpiryBanner: React.FC<SubscriptionExpiryBannerProps> = ({
  userId,
  navigation: navigationProp,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createBannerStyles(colors), [colors]);
  const navigationFromHook = useNavigation<StackNavigationProp<AppStackParamList>>();
  const navigation = navigationProp ?? navigationFromHook;

  const [visible, setVisible] = useState(false);
  const [sub, setSub] = useState<UserSubscription | null>(null);

  const load = useCallback(async () => {
    if (!isSubscriptionGatingEnabled() || !userId) {
      setVisible(false);
      setSub(null);
      return;
    }
    try {
      const active = await SubscriptionService.hasActiveSubscription(userId);
      if (active) {
        setVisible(false);
        setSub(null);
        return;
      }
      const subscription = await SubscriptionService.getUserSubscription(userId);
      setSub(subscription);
      setVisible(true);
    } catch {
      setVisible(false);
      setSub(null);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!visible) {
    return null;
  }

  const hadSubscription = sub?.status === 'expired' || sub?.status === 'cancelled';
  const ctaLabel = hadSubscription ? 'Renew' : 'Subscribe';
  const message = sub?.endDate && hadSubscription
    ? `Your subscription expired on ${sub.endDate.toLocaleDateString()}. Renew to book tankers and log trips.`
    : 'An active subscription is required to book tankers and log trips.';

  const handlePress = () => {
    navigation.navigate('SubscriptionPlans');
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="shield-outline" size={22} color={colors.warning} style={{ marginRight: 8 }} />
      <Typography variant="body" style={styles.text}>
        {message}
      </Typography>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.cta}
        accessibilityLabel={ctaLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Typography variant="body" style={styles.ctaText}>{ctaLabel}</Typography>
      </TouchableOpacity>
    </View>
  );
};

export default SubscriptionExpiryBanner;
