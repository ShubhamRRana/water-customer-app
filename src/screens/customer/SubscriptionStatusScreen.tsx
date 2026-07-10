import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Typography, CustomerMenuDrawer, ScreenLoading } from '../../components/common';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { SubscriptionService } from '../../services/subscription.service';
import type { UserSubscription, SubscriptionPlan } from '../../types/subscription.types';
import { navigateCustomerMenuRoute } from '../../navigation/customerMenuNavigation';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { FEATURE_FLAGS, UI_CONFIG } from '../../constants/config';
import type { PaymentTransaction } from '../../types/subscription.types';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';

type Nav = StackNavigationProp<AppStackParamList, 'SubscriptionStatus'>;

interface Props {
  navigation: Nav;
}

function daysRemaining(end: Date | null): number | null {
  if (!end) return null;
  const ms = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (86400000)));
}

const SubscriptionStatusScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createSubscriptionStatusStyles(colors), [colors]);
  const { user, logout, customerAccountKind } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [latestPayment, setLatestPayment] = useState<PaymentTransaction | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const s = await SubscriptionService.getUserSubscription(user.id);
      setSub(s);
      if (s?.planId) {
        const p = await SubscriptionService.getPlanById(s.planId);
        setPlan(p);
      } else {
        setPlan(null);
      }
      const payment = await SubscriptionService.getLatestSubscriptionPayment(user.id, s?.id);
      setLatestPayment(payment);
    } catch (e) {
      errorLogger.medium('Failed to load subscription', e, { userId: user.id });
      Alert.alert('Error', 'Could not load subscription details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      void load().finally(() => {
        hasLoadedOnceRef.current = true;
      });
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleCancel = () => {
    if (!sub?.id) return;
    Alert.alert('Cancel subscription', 'You can subscribe again later from Plans.', [
      { text: 'Keep plan', style: 'cancel' },
      {
        text: 'Cancel subscription',
        style: 'destructive',
        onPress: async () => {
          try {
            await SubscriptionService.cancelSubscription(sub.id, 'user_cancelled');
            await load();
            Alert.alert('Cancelled', 'Your subscription has been cancelled.');
          } catch (e) {
            errorLogger.medium('cancel subscription failed', e, { subscriptionId: sub.id });
            Alert.alert('Error', 'Could not cancel. Try again later.');
          }
        },
      },
    ]);
  };

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'SubscriptionStatus') return;
    navigateCustomerMenuRoute(navigation, route);
  };

  const remain = sub?.endDate ? daysRemaining(sub.endDate) : null;
  const trialEnd = sub?.trialEndDate ?? (sub?.isTrial ? sub.endDate : null);
  const trialRemain = trialEnd ? daysRemaining(trialEnd) : null;
  const isActive = Boolean(
    sub?.status === 'active' && sub.endDate && sub.endDate.getTime() > Date.now()
  );
  const isTrialActive = Boolean(sub?.isTrial && isActive);
  const canRenew =
    FEATURE_FLAGS.enableRazorpaySubscription &&
    sub &&
    plan &&
    !isTrialActive &&
    (sub.status === 'expired' || sub.status === 'pending' || !isActive);

  const handleRenew = () => {
    if (!sub || !plan) return;
    navigation.navigate('PaySubscription', {
      subscriptionId: sub.id,
      planId: plan.id,
      planName: plan.name,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.headerTitle}>
          My subscription
        </Typography>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={26} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScreenLoading message="Loading subscription..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          <Card padding="large" style={styles.card}>
            <Typography variant="caption" style={styles.label}>
              Status
            </Typography>
            <Typography variant="h3">{sub ? sub.status.toUpperCase() : 'NONE'}</Typography>
            {isTrialActive ? (
              <View style={styles.trialBadge}>
                <Typography variant="caption" style={styles.trialBadgeText}>
                  Free trial
                </Typography>
              </View>
            ) : null}
            {plan ? (
              <Typography variant="body" style={styles.planName}>
                {plan.name}
              </Typography>
            ) : null}
            {isTrialActive && trialRemain !== null ? (
              <View style={styles.row}>
                <Ionicons name="gift-outline" size={22} color={colors.accent} />
                <Typography variant="body" style={styles.rowText}>
                  Trial: {trialRemain} day{trialRemain === 1 ? '' : 's'} remaining
                </Typography>
              </View>
            ) : null}
            {isActive && remain !== null && !isTrialActive ? (
              <View style={styles.row}>
                <Ionicons name="time-outline" size={22} color={colors.accent} />
                <Typography variant="body" style={styles.rowText}>
                  {remain} day{remain === 1 ? '' : 's'} remaining
                </Typography>
              </View>
            ) : null}
            {sub?.startDate && sub?.endDate ? (
              <Typography variant="caption" style={{ color: colors.textSecondary, marginTop: 8 }}>
                {sub.startDate.toLocaleDateString()} — {sub.endDate.toLocaleDateString()}
              </Typography>
            ) : null}
            {trialEnd && isTrialActive ? (
              <Typography variant="caption" style={{ color: colors.textSecondary, marginTop: 8 }}>
                Trial ends on {trialEnd.toLocaleDateString()}
              </Typography>
            ) : null}
            {sub?.endDate && isActive && !isTrialActive ? (
              <Typography variant="caption" style={{ color: colors.textSecondary, marginTop: 8 }}>
                Renews / ends on {sub.endDate.toLocaleDateString()}
              </Typography>
            ) : null}
            {latestPayment?.gatewayTransactionId ? (
              <Typography variant="caption" style={{ color: colors.textSecondary, marginTop: 8 }}>
                Razorpay payment ID: {latestPayment.gatewayTransactionId}
              </Typography>
            ) : null}
          </Card>

          {canRenew ? (
            <Button title="Renew with Razorpay" onPress={handleRenew} style={styles.btn} />
          ) : null}

          <Button
            title="Plans & upgrade"
            onPress={() => navigation.navigate('SubscriptionPlans')}
            style={styles.btn}
          />
          <Button
            title="Payment history"
            variant="secondary"
            onPress={() => navigation.navigate('PaymentHistory')}
            style={styles.btn}
          />

          {sub?.status === 'active' ? (
            <Button title="Cancel subscription" variant="outline" onPress={handleCancel} style={styles.btn} />
          ) : null}

          {!sub ? (
            <Typography variant="body" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              You do not have a subscription yet. Browse plans to get started.
            </Typography>
          ) : null}
        </ScrollView>
      )}

      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={logout}
        currentRoute="SubscriptionStatus"
        customerAccountKind={customerAccountKind}
        userName={user?.name}
      />
    </SafeAreaView>
  );
};

function createSubscriptionStatusStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: { padding: UI_CONFIG.spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center' },
  scroll: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },
  card: { marginBottom: UI_CONFIG.spacing.md },
  label: { color: colors.textSecondary, marginBottom: 4 },
  planName: { marginTop: 8, color: colors.textSecondary },
  trialBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  trialBadgeText: { color: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  rowText: { flex: 1 },
  btn: { marginBottom: UI_CONFIG.spacing.sm },
  });
}

export default SubscriptionStatusScreen;
