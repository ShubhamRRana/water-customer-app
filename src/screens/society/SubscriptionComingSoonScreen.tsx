import React, { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { Button, Card, Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { useAuthStore } from '../../store/authStore';

type SubscriptionComingSoonNavigationProp = StackNavigationProp<
  CustomerStackParamList,
  'SubscriptionComingSoon'
>;

interface Props {
  navigation: SubscriptionComingSoonNavigationProp;
}

const SubscriptionComingSoonScreen: React.FC<Props> = ({ navigation }) => {
  const dismissSocietySubscriptionIntro = useAuthStore(s => s.dismissSocietySubscriptionIntro);

  const goHome = useCallback(() => {
    dismissSocietySubscriptionIntro();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [dismissSocietySubscriptionIntro, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [goHome]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Card padding="large" style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles-outline" size={48} color={UI_CONFIG.colors.accent} />
          </View>
          <Typography variant="h2" style={styles.title}>
            Subscription
          </Typography>
          <Typography variant="body" style={styles.message}>
            This feature is coming soon. We’re working on subscription plans tailored for societies.
          </Typography>
          <Button title="OK" onPress={goHome} variant="primary" style={styles.button} />
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
    fontFamily: 'PlayfairDisplay-Regular',
    textAlign: 'center',
    marginBottom: 12,
    color: UI_CONFIG.colors.text,
  },
  message: {
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    alignSelf: 'stretch',
    width: '100%',
  },
});

export default SubscriptionComingSoonScreen;
