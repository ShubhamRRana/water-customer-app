import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { Typography, LoadingSpinner } from '../../components/common';
import Button from '../../components/common/Button';
import {
  PaytmService,
  parseInitiatePaymentResponse,
} from '../../services/paytm.service';
import { CustomerStackParamList } from '../../navigation/rootNavigation';
import { UI_CONFIG, PRICING_CONFIG } from '../../constants/config';
import { getPaytmProcessTransactionUrl } from '../../constants/paytmCheckout';
import { errorLogger } from '../../utils/errorLogger';
import Constants from 'expo-constants';

type Nav = StackNavigationProp<CustomerStackParamList, 'Payment'>;
type R = RouteProp<CustomerStackParamList, 'Payment'>;

interface Props {
  navigation: Nav;
  route: R;
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildCheckoutHtml(params: {
  actionUrl: string;
  mid: string;
  orderId: string;
  txnToken: string;
  amount: string;
}): string {
  const { actionUrl, mid, orderId, txnToken, amount } = params;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui;background:#1a1d24;color:#f0f2f5;padding:16px;">
<p>Redirecting to Paytm…</p>
<form id="f" method="post" action="${escapeHtmlAttr(actionUrl)}">
<input type="hidden" name="mid" value="${escapeHtmlAttr(mid)}"/>
<input type="hidden" name="orderId" value="${escapeHtmlAttr(orderId)}"/>
<input type="hidden" name="txnToken" value="${escapeHtmlAttr(txnToken)}"/>
<input type="hidden" name="amount" value="${escapeHtmlAttr(amount)}"/>
</form>
<script>document.getElementById("f").submit();</script>
</body></html>`;
}

const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId, planName, amount } = route.params;
  const [phase, setPhase] = useState<'init' | 'ready' | 'done'>('init');
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const supabaseHostFragment = useMemo(() => {
    const url =
      Constants.expoConfig?.extra?.supabaseUrl ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      '';
    try {
      return new URL(url).hostname;
    } catch {
      return 'supabase.co';
    }
  }, []);

  const runVerify = useCallback(async () => {
    setVerifyBusy(true);
    setError(null);
    try {
      const res = await PaytmService.verifyTransaction(orderId);
      const applied = res.applied === true;
      if (applied) {
        setPhase('done');
        navigation.replace('SubscriptionStatus');
        return;
      }
      Alert.alert(
        'Could not confirm',
        res.reason
          ? String(res.reason)
          : 'Complete payment on Paytm, then tap verify again. If money was debited, check Subscription in a few minutes.'
      );
    } catch (e) {
      errorLogger.medium('verify-payment failed', e, { orderId });
      setError(getErrMsg(e));
    } finally {
      setVerifyBusy(false);
    }
  }, [navigation, orderId]);

  const startCheckout = useCallback(async () => {
    setError(null);
    setPhase('init');
    try {
      const raw = await PaytmService.initiateTransaction(orderId);
      const parsed = parseInitiatePaymentResponse(raw);
      if (!parsed.initiateOk || !parsed.mid || !parsed.txnToken) {
        throw new Error('Paytm did not return a valid session. Try again.');
      }
      const amt = parsed.amount ?? amount.toFixed(2);
      const page = buildCheckoutHtml({
        actionUrl: getPaytmProcessTransactionUrl(),
        mid: parsed.mid,
        orderId: parsed.orderId ?? orderId,
        txnToken: parsed.txnToken,
        amount: amt,
      });
      setHtml(page);
      setPhase('ready');
    } catch (e) {
      errorLogger.medium('initiate-payment failed', e, { orderId });
      setError(getErrMsg(e));
      setPhase('done');
    }
  }, [amount, orderId]);

  React.useEffect(() => {
    void startCheckout();
  }, [startCheckout]);

  const onNavChange = useCallback(
    (navState: { url?: string }) => {
      const url = navState.url ?? '';
      if (!url) return;
      if (url.includes('payment-callback') || url.includes(supabaseHostFragment)) {
        void runVerify();
      }
    },
    [runVerify, supabaseHostFragment]
  );

  if (phase === 'init' && !error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} title="Pay with Paytm" />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error && phase === 'done' && !html) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} title="Pay with Paytm" />
        <View style={styles.center}>
          <Typography variant="body" style={{ color: UI_CONFIG.colors.textSecondary, textAlign: 'center' }}>
            {error}
          </Typography>
          <Button title="Try again" onPress={() => void startCheckout()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onBack={() => navigation.goBack()} title="Pay with Paytm" />
      <View style={styles.summary}>
        <Typography variant="h3">{planName}</Typography>
        <Typography variant="h2" style={styles.summaryAmt}>
          {PRICING_CONFIG.currencySymbol}
          {amount.toFixed(2)}
        </Typography>
        <Typography variant="caption" style={{ color: UI_CONFIG.colors.textSecondary }}>
          Order ID: {orderId}
        </Typography>
      </View>
      {html && phase === 'ready' ? (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          onNavigationStateChange={onNavChange}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url.includes('payment-callback')) {
              void runVerify();
              return false;
            }
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled={Platform.OS === 'android'}
          setSupportMultipleWindows={false}
          style={styles.webview}
        />
      ) : null}
      <View style={styles.footer}>
        <Button
          title={verifyBusy ? 'Verifying…' : 'I completed payment — verify'}
          onPress={() => void runVerify()}
          loading={verifyBusy}
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
};

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={28} color={UI_CONFIG.colors.accent} />
      </TouchableOpacity>
      <Typography variant="h2" style={styles.headerTitle}>
        {title}
      </Typography>
      <View style={{ width: 40 }} />
    </View>
  );
}

function getErrMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
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
  backBtn: { padding: UI_CONFIG.spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  summary: {
    padding: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  summaryAmt: { marginVertical: 8 },
  webview: { flex: 1, backgroundColor: UI_CONFIG.colors.primary },
  footer: { padding: UI_CONFIG.spacing.md, borderTopWidth: 1, borderTopColor: UI_CONFIG.colors.border },
});

export default PaymentScreen;
