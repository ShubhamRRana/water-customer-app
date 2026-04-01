import React, { useCallback, useMemo, useState } from 'react';
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
import type { SubscriptionPlan } from '../../types/subscription.types';
import { UI_CONFIG, PRICING_CONFIG } from '../../constants/config';
import { errorLogger } from '../../utils/errorLogger';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';
import { navigateCustomerMenuRoute } from '../../navigation/customerMenuNavigation';
import type { CustomerStackParamList } from '../../navigation/rootNavigation';

type Nav = StackNavigationProp<CustomerStackParamList, 'SubscriptionPlans'>;

interface Props {
  navigation: Nav;
}

function buildOrderId(userId: string): string {
  const compact = userId.replace(/-/g, '').slice(0, 12);
  return `WC${compact}${Date.now().toString(36)}`.toUpperCase().slice(0, 64);
}

const SubscriptionPlansScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, customerAccountKind } = useAuthStore();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await SubscriptionService.getActivePlans();
      setPlans(list.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (e) {
      errorLogger.medium('Failed to load subscription plans', e, { userId: user.id });
      Alert.alert('Error', 'Could not load plans. Pull to refresh.');
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

  const monthlyEquivalent = useMemo(() => {
    const m = plans.find((p) => p.durationMonths === 1);
    return m?.price ?? null;
  }, [plans]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user?.id) return;
    setCheckoutPlanId(plan.id);
    try {
      const orderId = buildOrderId(user.id);
      const sub = await SubscriptionService.createSubscription({
        userId: user.id,
        planId: plan.id,
        status: 'pending',
      });
      await SubscriptionService.createPaymentTransaction({
        userId: user.id,
        subscriptionId: sub.id,
        amount: plan.price,
        currency: plan.currency || 'INR',
        gatewayOrderId: orderId,
        status: 'pending',
      });
      navigation.navigate('Payment', {
        orderId,
        planName: plan.name,
        amount: plan.price,
        subscriptionId: sub.id,
      });
    } catch (e) {
      errorLogger.high('Start subscription checkout failed', e, { userId: user.id, planId: plan.id });
      Alert.alert('Error', 'Could not start checkout. Please try again.');
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const savingsLabel = (plan: SubscriptionPlan): string | null => {
    if (!monthlyEquivalent || plan.durationMonths <= 1) return null;
    const full = monthlyEquivalent * plan.durationMonths;
    if (full <= plan.price) return null;
    const pct = Math.round((1 - plan.price / full) * 100);
    if (pct <= 0) return null;
    return `Save ~${pct}% vs paying monthly`;
  };

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'SubscriptionPlans') return;
    navigateCustomerMenuRoute(navigation, route);
  };

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color={UI_CONFIG.colors.accent} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.headerTitle}>
          Subscription plans
        </Typography>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={26} color={UI_CONFIG.colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI_CONFIG.colors.accent} />}
        >
          <Typography variant="body" style={[styles.intro, { color: UI_CONFIG.colors.textSecondary }]}>
            Choose a plan to keep booking water deliveries. Secure payment via Paytm.
          </Typography>

          {plans.map((plan) => {
            const saving = savingsLabel(plan);
            const busy = checkoutPlanId === plan.id;
            return (
              <Card key={plan.id} padding="large" style={styles.card}>
                <View style={styles.cardTop}>
                  <Typography variant="h3">{plan.name}</Typography>
                  {saving ? (
                    <View style={styles.badge}>
                      <Typography variant="caption" style={styles.badgeText}>
                        {saving}
                      </Typography>
                    </View>
                  ) : null}
                </View>
                {plan.description ? (
                  <Typography variant="body" style={[styles.desc, { color: UI_CONFIG.colors.textSecondary }]}>
                    {plan.description}
                  </Typography>
                ) : null}
                <Typography variant="h2" style={styles.price}>
                  {`${PRICING_CONFIG.currencySymbol}${plan.price.toFixed(0)} / ${plan.durationMonths} mo`}
                </Typography>
                <View style={styles.features}>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={UI_CONFIG.colors.accent} />
                      <Typography variant="body" style={styles.featureText}>
                        {f}
                      </Typography>
                    </View>
                  ))}
                </View>
                <Button
                  title={busy ? 'Starting…' : 'Subscribe now'}
                  onPress={() => handleSubscribe(plan)}
                  loading={busy}
                  disabled={busy}
                />
              </Card>
            );
          })}
        </ScrollView>
      )}

      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={logout}
        currentRoute="SubscriptionPlans"
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
  backBtn: { padding: UI_CONFIG.spacing.xs },
  menuBtn: { padding: UI_CONFIG.spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center' },
  scroll: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },
  intro: { marginBottom: UI_CONFIG.spacing.md, textAlign: 'center' },
  card: { marginBottom: UI_CONFIG.spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: UI_CONFIG.colors.accent },
  desc: { marginTop: UI_CONFIG.spacing.xs, marginBottom: UI_CONFIG.spacing.sm },
  price: { marginVertical: UI_CONFIG.spacing.sm },
  features: { marginBottom: UI_CONFIG.spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { flex: 1 },
});

export default SubscriptionPlansScreen;
