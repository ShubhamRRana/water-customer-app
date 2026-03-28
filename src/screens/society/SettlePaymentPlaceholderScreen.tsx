import React, { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { Button, Card, Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type Nav = StackNavigationProp<CustomerStackParamList, 'SettlePaymentPlaceholder'>;

interface Props {
  navigation: Nav;
}

const SettlePaymentPlaceholderScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<CustomerStackParamList, 'SettlePaymentPlaceholder'>>();
  const { periodType, year, month } = route.params;

  const onOk = useCallback(() => {
    navigation.navigate('TripDetails', {
      paymentMarkedComplete: true,
      paymentCompletePeriod: { periodType, year, month },
    });
  }, [navigation, periodType, year, month]);

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
          <Button title="OK" onPress={onOk} variant="primary" style={styles.button} />
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
