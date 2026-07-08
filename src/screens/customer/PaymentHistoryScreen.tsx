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
import { Typography, CustomerMenuDrawer, ScreenLoading } from '../../components/common';
import Card from '../../components/common/Card';
import { useAuthStore } from '../../store/authStore';
import { PaymentService, type PaymentHistoryItem } from '../../services/payment.service';
import type { PaymentTransactionStatus } from '../../types/subscription.types';
import type { PaymentFlow } from '../../types/razorpay.types';
import { navigateCustomerMenuRoute } from '../../navigation/customerMenuNavigation';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { UI_CONFIG, PRICING_CONFIG } from '../../constants/config';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { errorLogger } from '../../utils/errorLogger';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';

type Nav = StackNavigationProp<AppStackParamList, 'PaymentHistory'>;

interface Props {
  navigation: Nav;
}

type FlowFilterKey = 'all' | PaymentFlow;
type StatusFilterKey = 'all' | PaymentTransactionStatus;

const FLOW_FILTERS: { key: FlowFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'customer_subscription', label: 'Subscription' },
  { key: 'customer_booking', label: 'Delivery' },
];

const STATUS_FILTERS: { key: StatusFilterKey; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'success', label: 'Success' },
  { key: 'failed', label: 'Failed' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
];

const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createPaymentHistoryStyles(colors), [colors]);
  const { user, logout, customerAccountKind } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<PaymentHistoryItem[]>([]);
  const [flowFilter, setFlowFilter] = useState<FlowFilterKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [menuVisible, setMenuVisible] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await PaymentService.getPaymentHistory(user.id);
      setRows(list);
    } catch (e) {
      errorLogger.medium('Failed to load payment history', e, { userId: user.id });
      Alert.alert('Error', 'Could not load payments.');
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

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (flowFilter !== 'all' && row.flow !== flowFilter) {
        return false;
      }
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [rows, flowFilter, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'PaymentHistory') return;
    navigateCustomerMenuRoute(navigation, route);
  };

  const showDetails = (tx: PaymentHistoryItem) => {
    const lines = [
      `Type: ${tx.flowLabel}`,
      `Amount: ${PRICING_CONFIG.currencySymbol}${tx.amount.toFixed(2)}`,
      `Status: ${tx.status}`,
      `Gateway: ${tx.paymentGateway}`,
      tx.gatewayOrderId ? `Order ID: ${tx.gatewayOrderId}` : '',
      tx.gatewayTransactionId ? `Payment ID: ${tx.gatewayTransactionId}` : '',
      tx.gatewayResponseMessage ? `Message: ${tx.gatewayResponseMessage}` : '',
      `Initiated: ${tx.initiatedAt.toLocaleString()}`,
      tx.completedAt ? `Completed: ${tx.completedAt.toLocaleString()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    Alert.alert('Transaction', lines);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.headerTitle}>
          Payment history
        </Typography>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={26} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsInner}
        >
          {FLOW_FILTERS.map((f) => {
            const on = flowFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setFlowFilter(f.key)}
              >
                <Typography variant="body" style={on ? styles.chipTextOn : styles.chipText}>
                  {f.label}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsInnerSecondary}
        >
          {STATUS_FILTERS.map((f) => {
            const on = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Typography variant="body" style={on ? styles.chipTextOn : styles.chipText}>
                  {f.label}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ScreenLoading message="Loading payments..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {filtered.length === 0 ? (
            <Typography variant="body" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              No transactions match this filter.
            </Typography>
          ) : (
            filtered.map((tx) => (
              <Card key={tx.id} padding="medium" style={styles.card} onPress={() => showDetails(tx)}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.flowRow}>
                      <View style={[styles.flowPill, flowPillStyle(tx.flow, colors)]}>
                        <Typography variant="caption" style={styles.flowPillText}>
                          {tx.flowLabel}
                        </Typography>
                      </View>
                      <View style={[styles.pill, statusStyle(tx.status, colors)]}>
                        <Typography variant="caption" style={styles.pillText}>
                          {tx.status}
                        </Typography>
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={logout}
        currentRoute="PaymentHistory"
        customerAccountKind={customerAccountKind}
      />
    </SafeAreaView>
  );
};

function flowPillStyle(flow: PaymentFlow | null, colors: ThemeColors) {
  switch (flow) {
    case 'customer_subscription':
      return { backgroundColor: 'rgba(99, 102, 241, 0.2)' };
    case 'customer_booking':
      return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
    default:
      return { backgroundColor: colors.surfaceLight };
  }
}

function statusStyle(s: PaymentTransactionStatus, colors: ThemeColors) {
  switch (s) {
    case 'success':
      return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
    case 'failed':
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)' };
    case 'pending':
    case 'processing':
      return { backgroundColor: 'rgba(250, 204, 21, 0.15)' };
    default:
      return { backgroundColor: colors.surfaceLight };
  }
}

function createPaymentHistoryStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: UI_CONFIG.spacing.md,
      paddingVertical: UI_CONFIG.spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconBtn: { padding: UI_CONFIG.spacing.xs },
    headerTitle: { flex: 1, textAlign: 'center' },
    filterSection: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chipsInner: {
      paddingHorizontal: UI_CONFIG.spacing.md,
      paddingTop: UI_CONFIG.spacing.sm,
      paddingBottom: 6,
      gap: 8,
      alignItems: 'center',
    },
    chipsInnerSecondary: {
      paddingHorizontal: UI_CONFIG.spacing.md,
      paddingTop: 4,
      paddingBottom: UI_CONFIG.spacing.sm,
      gap: 8,
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    chipOn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    chipTextOn: {
      color: '#1a1d24',
      fontSize: 14,
      fontWeight: '600',
    },
    scroll: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },
    card: { marginBottom: UI_CONFIG.spacing.sm },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    flowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    flowPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    flowPillText: { fontWeight: '600', textTransform: 'capitalize', color: colors.text },
    pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    pillText: { textTransform: 'capitalize' },
  });
}

export default PaymentHistoryScreen;
