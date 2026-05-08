import React, { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { Button, Card, Typography } from '../../components/common';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../store/authStore';

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
    },
  });
}

const SubscriptionComingSoonScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createSubscriptionComingSoonStyles(colors), [colors]);

  const goHome = useCallback(() => {
    useAuthStore.getState().dismissSocietySubscriptionIntro();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [navigation]);

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
            <Ionicons name="sparkles-outline" size={48} color={colors.accent} />
          </View>
          <Typography variant="h2" style={styles.title}>
            Subscription
          </Typography>
          <Typography variant="body" style={styles.message}>
            This feature is coming soon. We're working on subscription plans tailored for societies.
          </Typography>
          <Button title="OK" onPress={goHome} variant="primary" style={styles.button} />
        </Card>
      </View>
    </SafeAreaView>
  );
};

export default SubscriptionComingSoonScreen;
