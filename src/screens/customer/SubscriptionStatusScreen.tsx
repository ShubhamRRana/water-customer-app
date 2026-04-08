import React, { useCallback, useState } from 'react';
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
import { Typography, CustomerMenuDrawer, LoadingSpinner } from '../../components/common';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { SubscriptionService } from '../../services/subscription.service';
import type { UserSubscription, SubscriptionPlan } from '../../types/subscription.types';
import { navigateCustomerMenuRoute } from '../../navigation/customerMenuNavigation';
import type { CustomerStackParamList } from '../../navigation/rootNavigation';
import { UI_CONFIG } from '../../constants/config';
import { errorLogger } from '../../utils/errorLogger';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';

type Nav = StackNavigationProp<CustomerStackParamList, 'SubscriptionStatus'>;

interface Props {
  navigation: Nav;
}

function daysRemaining(end: Date | null): number | null {
  if (!end) return null;
  const ms = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (86400000)));
}

const SubscriptionStatusScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, customerAccountKind } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

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
      setLoading(true);
      void load();
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
  const isActive =
    sub?.status === 'active' && sub.endDate && sub.endDate.getTime() > Date.now();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color={UI_CONFIG.colors.accent} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.headerTitle}>
          My subscription
        </Typography>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={26} color={UI_CONFIG.colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI_CONFIG.colors.accent} />
          }
        >
          <Card padding="large" style={styles.card}>
            <Typography variant="caption" style={styles.label}>
              Status
            </Typography>
            <Typography variant="h3">{sub ? sub.status.toUpperCase() : 'NONE'}</Typography>
            {plan ? (
              <Typography variant="body" style={styles.planName}>
                {plan.name}
              </Typography>
            ) : null}
            {isActive && remain !== null ? (
              <View style={styles.row}>
                <Ionicons name="time-outline" size={22} color={UI_CONFIG.colors.accent} />
                <Typography variant="body" style={styles.rowText}>
                  {remain} day{remain === 1 ? '' : 's'} remaining
                </Typography>
              </View>
            ) : null}
            {sub?.startDate && sub?.endDate ? (
              <Typography variant="caption" style={{ color: UI_CONFIG.colors.textSecondary, marginTop: 8 }}>
                {sub.startDate.toLocaleDateString()} — {sub.endDate.toLocaleDateString()}
              </Typography>
            ) : null}
          </Card>

          <Button title="Plans & upgrade" onPress={() => navigation.navigate('SubscriptionPlans')} style={styles.btn} />
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
            <Typography variant="body" style={{ color: UI_CONFIG.colors.textSecondary, textAlign: 'center' }}>
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
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI_CONFIG.colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  iconBtn: { padding: UI_CONFIG.spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center' },
  scroll: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },
  card: { marginBottom: UI_CONFIG.spacing.md },
  label: { color: UI_CONFIG.colors.textSecondary, marginBottom: 4 },
  planName: { marginTop: 8, color: UI_CONFIG.colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  rowText: { flex: 1 },
  btn: { marginBottom: UI_CONFIG.spacing.sm },
});

export default SubscriptionStatusScreen;
