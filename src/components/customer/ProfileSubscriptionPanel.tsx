import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Typography from '../common/Typography';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { AppStackParamList } from '../../navigation/rootNavigation';
import { SubscriptionService } from '../../services/subscription.service';
import type { SubscriptionPlan, UserSubscription } from '../../types/subscription.types';
import {
  getProfileSubscriptionPanelModel,
  type ProfileSubscriptionPanelModel,
} from '../../utils/profileSubscriptionPanel';
import { isSubscriptionGatingEnabled } from '../../utils/subscriptionGating';

interface ProfileSubscriptionPanelProps {
  userId?: string | undefined;
}

type ProfileSubscriptionPanelNavigation = StackNavigationProp<AppStackParamList>;

function createPanelStyles(colors: ThemeColors) {
  return StyleSheet.create({
    panel: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 12,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
    },
    attentionPanel: {
      borderLeftColor: colors.warning,
    },
    nonePanel: {
      borderLeftColor: colors.error,
    },
    loadingPanel: {
      minHeight: 80,
      justifyContent: 'center',
    },
    loadingBar: {
      width: '48%',
      height: 12,
      borderRadius: 8,
      backgroundColor: colors.surfaceLight,
      marginBottom: 10,
    },
    loadingBarShort: {
      width: '32%',
      marginBottom: 0,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    eyebrow: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surfaceLight,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    planName: {
      color: colors.text,
      fontFamily: 'PlayfairDisplay-Regular',
      fontSize: 24,
      lineHeight: 30,
      marginBottom: 10,
    },
    daysRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 8,
    },
    daysNumber: {
      color: colors.accent,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '700',
    },
    daysLabel: {
      color: colors.text,
      paddingBottom: 5,
    },
    body: {
      color: colors.textSecondary,
      lineHeight: 21,
      marginBottom: 14,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    primaryButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    secondaryButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    primaryButtonText: {
      color: '#101820',
      fontWeight: '700',
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '700',
    },
  });
}

function formatEndDate(endDate: Date | null): string | null {
  if (!endDate) return null;
  return endDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPanelCopy(model: ProfileSubscriptionPanelModel): {
  eyebrow: string;
  badge: string;
  badgeColor: string;
  title: string;
  body: string;
  primaryLabel: string | null;
  secondaryLabel: string | null;
} {
  if (model.visualState === 'active') {
    const end = formatEndDate(model.endDate);
    return {
      eyebrow: 'Your plan',
      badge: 'Active',
      badgeColor: 'success',
      title: model.planName ?? 'Active plan',
      body: end ? `Renews or ends on ${end}.` : 'Your subscription is active.',
      primaryLabel: 'Renew',
      secondaryLabel: 'Details',
    };
  }

  if (model.visualState === 'expiring_soon') {
    return {
      eyebrow: 'Needs attention',
      badge: 'Expiring soon',
      badgeColor: 'warning',
      title: model.planName ?? 'Current plan',
      body: 'Renew to keep booking tankers and logging trips.',
      primaryLabel: 'Renew now',
      secondaryLabel: null,
    };
  }

  return {
    eyebrow: 'Needs attention',
    badge: 'No active plan',
    badgeColor: 'error',
    title: 'Choose a plan',
    body: 'Choose a subscription plan to keep booking tankers and logging trips.',
    primaryLabel: 'View plans',
    secondaryLabel: null,
  };
}

const ProfileSubscriptionPanelContent: React.FC<ProfileSubscriptionPanelProps> = ({ userId }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createPanelStyles(colors), [colors]);
  const navigation = useNavigation<ProfileSubscriptionPanelNavigation>();
  const [model, setModel] = useState<ProfileSubscriptionPanelModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setHasError(false);
    setIsLoading(true);

    try {
      let subscription: UserSubscription | null = null;
      let plan: SubscriptionPlan | null = null;

      if (userId) {
        subscription = await SubscriptionService.getUserSubscription(userId);
        if (subscription?.planId) {
          plan = await SubscriptionService.getPlanById(subscription.planId);
        }
      }

      setModel(getProfileSubscriptionPanelModel({ gatingEnabled: true, subscription, plan }));
    } catch {
      setModel(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const navigateToPlans = () => {
    navigation.navigate('SubscriptionPlans');
  };

  if (isLoading && !model && !hasError) {
    return (
      <View style={[styles.panel, styles.loadingPanel]}>
        <View style={styles.loadingBar} />
        <View style={[styles.loadingBar, styles.loadingBarShort]} />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.panel, styles.nonePanel]}>
        <View style={styles.headerRow}>
          <Typography variant="caption" style={styles.eyebrow}>
            Needs attention
          </Typography>
          <View style={styles.badge}>
            <Typography variant="caption" style={[styles.badgeText, { color: colors.error }]}>
              Error
            </Typography>
          </View>
        </View>
        <Typography variant="h4" style={styles.planName}>
          Couldn't load plan
        </Typography>
        <Typography variant="body" style={styles.body}>
          Check your connection and try again.
        </Typography>
        <TouchableOpacity onPress={load} style={styles.primaryButton}>
          <Typography variant="body" style={styles.primaryButtonText}>
            Retry
          </Typography>
        </TouchableOpacity>
      </View>
    );
  }

  if (!model || model.visualState === 'hidden') {
    return null;
  }

  const copy = getPanelCopy(model);
  const badgeColor =
    copy.badgeColor === 'success'
      ? colors.success
      : copy.badgeColor === 'warning'
        ? colors.warning
        : colors.error;
  const isAttention = model.visualState === 'expiring_soon';
  const isNone = model.visualState === 'none';

  return (
    <View style={[styles.panel, isAttention && styles.attentionPanel, isNone && styles.nonePanel]}>
      <View style={styles.headerRow}>
        <Typography variant="caption" style={styles.eyebrow}>
          {copy.eyebrow}
        </Typography>
        <View style={styles.badge}>
          <Typography variant="caption" style={[styles.badgeText, { color: badgeColor }]}>
            {copy.badge}
          </Typography>
        </View>
      </View>

      <Typography variant="h4" style={styles.planName}>
        {copy.title}
      </Typography>

      {(model.visualState === 'active' || model.visualState === 'expiring_soon') &&
      model.daysLeft !== null ? (
        <View style={styles.daysRow}>
          <Typography variant="h2" style={styles.daysNumber}>
            {model.daysLeft}
          </Typography>
          <Typography variant="body" style={styles.daysLabel}>
            days left
          </Typography>
        </View>
      ) : null}

      <Typography variant="body" style={styles.body}>
        {copy.body}
      </Typography>

      <View style={styles.buttonRow}>
        {copy.primaryLabel ? (
          <TouchableOpacity onPress={navigateToPlans} style={styles.primaryButton}>
            <Typography variant="body" style={styles.primaryButtonText}>
              {copy.primaryLabel}
            </Typography>
          </TouchableOpacity>
        ) : null}
        {copy.secondaryLabel ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('SubscriptionStatus')}
            style={styles.secondaryButton}
          >
            <Typography variant="body" style={styles.secondaryButtonText}>
              {copy.secondaryLabel}
            </Typography>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const ProfileSubscriptionPanel: React.FC<ProfileSubscriptionPanelProps> = ({ userId }) => {
  if (!isSubscriptionGatingEnabled()) {
    return null;
  }

  return <ProfileSubscriptionPanelContent userId={userId} />;
};

export default ProfileSubscriptionPanel;
