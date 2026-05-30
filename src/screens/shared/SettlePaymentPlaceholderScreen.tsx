import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { Button, Card, Typography } from '../../components/common';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../store/authStore';
import { SocietyTripService } from '../../services/societyTrip.service';

type Nav = StackNavigationProp<AppStackParamList, 'SettlePaymentPlaceholder'>;

interface Props {
  navigation: Nav;
}

function createSettleStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text,
      fontWeight: '700',
    },
    context: {
      textAlign: 'center',
      color: colors.text,
      fontWeight: '600',
      marginBottom: 12,
      lineHeight: 22,
    },
    message: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
    },
    button: {
      alignSelf: 'stretch',
    },
  });
}

const SettlePaymentPlaceholderScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<AppStackParamList, 'SettlePaymentPlaceholder'>>();
  const { periodType, year, month, agencyName } = route.params;
  const user = useAuthStore((s) => s.user);
  const [saving, setSaving] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createSettleStyles(colors), [colors]);

  const contextLabel = useMemo(() => {
    if (agencyName == null) return null;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const periodLabel = periodType === 'year' ? `${year}` : `${monthNames[month]} ${year}`;
    return `${agencyName} for ${periodLabel}`;
  }, [agencyName, periodType, year, month]);

  const onOk = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to continue.');
      return;
    }
    setSaving(true);
    try {
      await SocietyTripService.markPaymentPeriodComplete(user.id, {
        periodType,
        year,
        month,
        ...(agencyName != null ? { agencyName } : {}),
      });
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
            <Ionicons name="wallet-outline" size={48} color={colors.accent} />
          </View>
          <Typography variant="h2" style={styles.title}>
            Payment
          </Typography>
          {contextLabel ? (
            <Typography variant="body" style={styles.context}>
              {contextLabel}
            </Typography>
          ) : null}
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

export default SettlePaymentPlaceholderScreen;
