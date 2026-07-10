import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Typography, CustomerMenuDrawer, ScreenLoading } from '../../components/common';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { SubscriptionService, computePlanSavingsFromMonthly } from '../../services/subscription.service';
import type { SubscriptionPlan } from '../../types/subscription.types';
import type { UserSubscription } from '../../types/subscription.types';
import { UI_CONFIG, FEATURE_FLAGS } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import { PricingUtils } from '../../utils/pricing';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';
import { navigateCustomerMenuRoute } from '../../navigation/customerMenuNavigation';
import type { AppStackParamList } from '../../navigation/rootNavigation';

type Nav = StackNavigationProp<AppStackParamList, 'SubscriptionPlans'>;

interface Props {
  navigation: Nav;
  route: RouteProp<AppStackParamList, 'SubscriptionPlans'>;
}

const SubscriptionPlansScreen: React.FC<Props> = ({ navigation, route }) => {
  const isRequired = route.params?.required === true;
  const colors = useThemeColors();
  const styles = useMemo(() => createSubscriptionPlansStyles(colors), [colors]);
  const { user, logout, customerAccountKind } = useAuthStore();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [monthlyBasePrice, setMonthlyBasePrice] = useState<number | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await SubscriptionService.getActivePlans();
      // Derive monthly price from the full list before duration filtering so savings
      // calculations survive future filter changes or the 1-month plan being filtered out.
      const monthly = list.find(
        (p) => (p.accountKind === customerAccountKind || !p.accountKind) && p.durationMonths === 1
      );
      setMonthlyBasePrice(monthly?.price ?? null);
      const filtered = SubscriptionService.filterPlansForAccountKind(list, customerAccountKind);
      setPlans(filtered.sort((a, b) => a.displayOrder - b.displayOrder));
      const subscription = await SubscriptionService.getUserSubscription(user.id);
      setUserSubscription(subscription);
    } catch (e) {
      errorLogger.medium('Failed to load subscription plans', e, { userId: user.id });
      Alert.alert('Error', 'Could not load plans. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, customerAccountKind]);

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

  useEffect(() => {
    if (!isRequired) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isRequired]);


  const activeTrial = useMemo(() => {
    if (!userSubscription?.isTrial || userSubscription.status !== 'active') return null;
    const end = userSubscription.trialEndDate ?? userSubscription.endDate;
    if (!end || end.getTime() <= Date.now()) return null;
    return end;
  }, [userSubscription]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user?.id) return;
    if (activeTrial) {
      Alert.alert(
        'Free trial active',
        `Your free trial is active until ${activeTrial.toLocaleDateString()}. Paid checkout opens after the trial ends.`
      );
      return;
    }
    if (!FEATURE_FLAGS.enableRazorpaySubscription) {
      Alert.alert(
        'Coming soon',
        'Online subscription payment via Razorpay will be available in a future update.'
      );
      return;
    }

    try {
      const subscription = await SubscriptionService.prepareSubscriptionCheckout(user.id, plan.id);
      navigation.navigate('PaySubscription', {
        subscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.name,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start checkout.';
      errorLogger.medium('prepare subscription checkout failed', e, { userId: user.id, planId: plan.id });
      Alert.alert('Unable to subscribe', message);
    }
  };

  const planSavings = (plan: SubscriptionPlan) => {
    if (!monthlyBasePrice) return null;
    return computePlanSavingsFromMonthly(monthlyBasePrice, plan.price, plan.durationMonths);
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
        {isRequired ? (
          <View style={styles.backBtn} />
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={28} color={colors.accent} />
          </TouchableOpacity>
        )}
        <Typography variant="h2" style={styles.headerTitle}>
          Subscription plans
        </Typography>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={26} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScreenLoading message="Loading plans..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {activeTrial ? (
            <Card padding="large" style={styles.trialBanner}>
              <Typography variant="h3" style={styles.trialTitle}>
                Free trial active
              </Typography>
              <Typography variant="body" style={{ color: colors.textSecondary }}>
                Your trial ends on {activeTrial.toLocaleDateString()}. You can subscribe with Razorpay after
                that date.
              </Typography>
            </Card>
          ) : null}

          {plans.map((plan) => {
            const savings = planSavings(plan);
            return (
              <Card key={plan.id} padding="large" style={styles.card}>
                <View style={styles.cardTop}>
                  <Typography variant="h3">{plan.name}</Typography>
                  {savings ? (
                    <View style={styles.badge}>
                      <Typography variant="caption" style={styles.badgeText}>
                        {savings.discountPercent}% off
                      </Typography>
                    </View>
                  ) : null}
                </View>
                {plan.description ? (
                  <Typography variant="body" style={[styles.desc, { color: colors.textSecondary }]}>
                    {plan.description}
                  </Typography>
                ) : null}
                <Typography variant="h2" style={styles.price}>
                  {PricingUtils.formatPrice(plan.price)}
                </Typography>
                {savings ? (
                  <>
                    <Typography variant="body" style={[styles.savingsAmount, { color: colors.accent }]}>
                      Save {PricingUtils.formatPrice(savings.savingsAmount)} vs paying monthly
                    </Typography>
                    <Typography
                      variant="body"
                      style={[styles.savingsCalc, { color: colors.textSecondary }]}
                    >
                      {PricingUtils.formatPrice(savings.fullPrice / plan.durationMonths)} × {plan.durationMonths} ={' '}
                      {PricingUtils.formatPrice(savings.fullPrice)}
                    </Typography>
                  </>
                ) : null}
                <Button
                  title={
                    activeTrial
                      ? 'Trial active'
                      : FEATURE_FLAGS.enableRazorpaySubscription
                        ? 'Subscribe with Razorpay'
                        : 'Subscribe now'
                  }
                  onPress={() => void handleSubscribe(plan)}
                  disabled={!!activeTrial}
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
        userName={user?.name}
      />
    </SafeAreaView>
  );
};

function createSubscriptionPlansStyles(colors: ThemeColors) {
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
  backBtn: { padding: UI_CONFIG.spacing.xs },
  menuBtn: { padding: UI_CONFIG.spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center' },
  scroll: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },
  trialBanner: { marginBottom: UI_CONFIG.spacing.md, borderColor: colors.accent, borderWidth: 1 },
  trialTitle: { marginBottom: UI_CONFIG.spacing.xs },
  intro: { marginBottom: UI_CONFIG.spacing.md, textAlign: 'center' },
  card: { marginBottom: UI_CONFIG.spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: colors.accent },
  desc: { marginTop: UI_CONFIG.spacing.xs, marginBottom: UI_CONFIG.spacing.sm },
  price: { marginVertical: UI_CONFIG.spacing.sm },
  savingsAmount: { marginBottom: UI_CONFIG.spacing.xs },
  savingsCalc: { marginBottom: UI_CONFIG.spacing.sm },
  });
}

export default SubscriptionPlansScreen;
