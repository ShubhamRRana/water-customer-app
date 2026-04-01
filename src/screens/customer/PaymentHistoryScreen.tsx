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
import { useAuthStore } from '../../store/authStore';
import { SubscriptionService } from '../../services/subscription.service';
import type { PaymentTransaction, PaymentTransactionStatus } from '../../types/subscription.types';
import { navigateCustomerMenuRoute } from '../../navigation/customerMenuNavigation';
import type { CustomerStackParamList } from '../../navigation/rootNavigation';
import { UI_CONFIG, PRICING_CONFIG } from '../../constants/config';
import { errorLogger } from '../../utils/errorLogger';
import type { CustomerMenuRoute } from '../../components/common/CustomerMenuDrawer';

type Nav = StackNavigationProp<CustomerStackParamList, 'PaymentHistory'>;

interface Props {
  navigation: Nav;
}

type FilterKey = 'all' | PaymentTransactionStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'failed', label: 'Failed' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
];

const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, customerAccountKind } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<PaymentTransaction[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [menuVisible, setMenuVisible] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await SubscriptionService.getPaymentTransactionsByUser(user.id);
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
    if (filter === 'all') return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleMenuNavigate = (route: CustomerMenuRoute) => {
    if (route === 'PaymentHistory') return;
    navigateCustomerMenuRoute(navigation, route);
  };

  const showDetails = (tx: PaymentTransaction) => {
    const lines = [
      `Amount: ${PRICING_CONFIG.currencySymbol}${tx.amount.toFixed(2)}`,
      `Status: ${tx.status}`,
      `Gateway: ${tx.paymentGateway}`,
      tx.gatewayOrderId ? `Order ID: ${tx.gatewayOrderId}` : '',
      tx.gatewayTransactionId ? `Txn ID: ${tx.gatewayTransactionId}` : '',
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
          <Ionicons name="chevron-back" size={28} color={UI_CONFIG.colors.accent} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.headerTitle}>
          Payment history
        </Typography>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconBtn} accessibilityLabel="Open menu">
          <Ionicons name="menu" size={26} color={UI_CONFIG.colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsInner}
      >
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setFilter(f.key)}
            >
              <Typography variant="caption" style={on ? styles.chipTextOn : styles.chipText}>
                {f.label}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI_CONFIG.colors.accent} />
          }
        >
          {filtered.length === 0 ? (
            <Typography variant="body" style={{ color: UI_CONFIG.colors.textSecondary, textAlign: 'center' }}>
              No transactions match this filter.
            </Typography>
          ) : (
            filtered.map((tx) => (
              <Card key={tx.id} padding="medium" style={styles.card} onPress={() => showDetails(tx)}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="h4">
                      {PRICING_CONFIG.currencySymbol}
                      {tx.amount.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" style={{ color: UI_CONFIG.colors.textSecondary }}>
                      {tx.initiatedAt.toLocaleString()}
                    </Typography>
                  </View>
                  <View style={[styles.pill, statusStyle(tx.status)]}>
                    <Typography variant="caption" style={styles.pillText}>
                      {tx.status}
                    </Typography>
                  </View>
                </View>
                {tx.gatewayOrderId ? (
                  <Typography variant="caption" style={{ marginTop: 8, color: UI_CONFIG.colors.textSecondary }}>
                    Order: {tx.gatewayOrderId}
                  </Typography>
                ) : null}
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

function statusStyle(s: PaymentTransactionStatus) {
  switch (s) {
    case 'success':
      return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
    case 'failed':
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)' };
    case 'pending':
    case 'processing':
      return { backgroundColor: 'rgba(250, 204, 21, 0.15)' };
    default:
      return { backgroundColor: UI_CONFIG.colors.surfaceLight };
  }
}

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
  chips: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: UI_CONFIG.colors.border },
  chipsInner: { paddingHorizontal: UI_CONFIG.spacing.md, paddingVertical: UI_CONFIG.spacing.sm, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.surface,
    marginRight: 8,
  },
  chipOn: { backgroundColor: UI_CONFIG.colors.accent },
  chipText: { color: UI_CONFIG.colors.textSecondary },
  chipTextOn: { color: UI_CONFIG.colors.primary, fontWeight: '600' },
  scroll: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },
  card: { marginBottom: UI_CONFIG.spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { textTransform: 'capitalize' },
});

export default PaymentHistoryScreen;
