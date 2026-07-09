import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { Button, Card, Typography } from '../../components/common';
import type { ThemeColors } from '../../constants/config';
import { FEATURE_FLAGS } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SubscriptionService } from '../../services/subscription.service';

type SubscriptionComingSoonNavigationProp = StackNavigationProp<
  AppStackParamList,
  'SubscriptionComingSoon'
>;

interface Props {
  navigation: SubscriptionComingSoonNavigationProp;
}

function createSubscriptionComingSoonStyles(colors: ThemeColors) {
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
      fontFamily: 'PlayfairDisplay-Regular',
      textAlign: 'center',
      marginBottom: 12,
      color: colors.text,
    },
    message: {
      textAlign: 'center',
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
    },
    button: {
      alignSelf: 'stretch',
      width: '100%',
      marginBottom: 12,
    },
  });
}

const SubscriptionComingSoonScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createSubscriptionComingSoonStyles(colors), [colors]);
  const [checkingPlans, setCheckingPlans] = useState(FEATURE_FLAGS.enableRazorpaySubscription);

  const goHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [navigation]);

  const goToPlans = useCallback(() => {
    navigation.replace('SubscriptionPlans');
  }, [navigation]);

  useEffect(() => {
    if (!FEATURE_FLAGS.enableRazorpaySubscription) {
      setCheckingPlans(false);
      return;
    }

    let cancelled = false;

    const checkSocietyPlans = async () => {
      try {
        const plans = await SubscriptionService.getActivePlans();
        const societyPlans = SubscriptionService.filterPlansForAccountKind(plans, 'society');
        if (!cancelled && societyPlans.length > 0) {
          goToPlans();
          return;
        }
      } catch {
        // Keep coming-soon UI on load failure
      }
      if (!cancelled) {
        setCheckingPlans(false);
      }
    };

    void checkSocietyPlans();

    return () => {
      cancelled = true;
    };
  }, [goToPlans]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [goHome]);

  if (checkingPlans) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Card padding="large" style={styles.card}>
            <Typography variant="body" style={styles.message}>
              Loading subscription plans…
            </Typography>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const razorpayEnabled = FEATURE_FLAGS.enableRazorpaySubscription;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Card padding="large" style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles-outline" size={48} color={colors.accent} />
          </View>
          <Typography variant="h2" style={styles.title}>
            Subscription
          </Typography>
          <Typography variant="body" style={styles.message}>
            {razorpayEnabled
              ? 'Society subscription plans are not available yet. Check back soon or browse plans when they are published.'
              : 'This feature is coming soon. We\'re working on subscription plans tailored for societies.'}
          </Typography>
          {razorpayEnabled ? (
            <Button
              title="View subscription plans"
              onPress={goToPlans}
              variant="primary"
              style={styles.button}
            />
          ) : null}
          <Button
            title="OK"
            onPress={goHome}
            variant={razorpayEnabled ? 'secondary' : 'primary'}
            style={styles.button}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
};

export default SubscriptionComingSoonScreen;
