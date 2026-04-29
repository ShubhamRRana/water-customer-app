import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { Button, Card, Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { useAuthStore } from '../../store/authStore';
import { SocietyTripService } from '../../services/societyTrip.service';

type Nav = StackNavigationProp<AppStackParamList, 'SettlePaymentPlaceholder'>;

interface Props {
  navigation: Nav;
}

const SettlePaymentPlaceholderScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<AppStackParamList, 'SettlePaymentPlaceholder'>>();
  const { periodType, year, month } = route.params;
  const user = useAuthStore((s) => s.user);
  const [saving, setSaving] = useState(false);

  const onOk = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to continue.');
      return;
    }
    setSaving(true);
    try {
      await SocietyTripService.markPaymentPeriodComplete(user.id, { periodType, year, month });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save payment status. Try again.');
    } finally {
      setSaving(false);
    }
  }, [navigation, periodType, year, month, user?.id]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Card padding="large" style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={48} color={UI_CONFIG.colors.accent} />
          </View>
          <Typography variant="h2" style={styles.title}>
            Payment
          </Typography>
          <Typography variant="body" style={styles.message}>
            Payment feature will be available soon.
          </Typography>
          <Button
            title="OK"
            onPress={onOk}
            variant="primary"
            style={styles.button}
            disabled={saving}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    color: UI_CONFIG.colors.text,
    fontWeight: '700',
  },
  message: {
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    alignSelf: 'stretch',
  },
});

export default SettlePaymentPlaceholderScreen;
