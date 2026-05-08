import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types/index';
import { AuthScreenLayout } from '../../components/layouts';
import { Typography, Button, Card } from '../../components/common';
import { SUCCESS_MESSAGES, UI_CONFIG } from '../../constants/config';
import { AuthService } from '../../services/auth.service';

type VerifyEmailNav = StackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
type VerifyEmailRoute = RouteProp<AuthStackParamList, 'VerifyEmail'>;

interface Props {
  navigation: VerifyEmailNav;
  route: VerifyEmailRoute;
}

const VerifyEmailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email, accountKind } = route.params;
  const [resendLoading, setResendLoading] = useState(false);

  const goSignIn = () => {
    if (accountKind === 'society') {
      navigation.navigate('SocietyLogin');
    } else {
      navigation.navigate('Login', { accountType: 'individual' });
    }
  };

  const openMail = () => {
    void Linking.openURL('mailto:');
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const result = await AuthService.resendSignupConfirmation(email);
      if (result.success) {
        Alert.alert('Email sent', SUCCESS_MESSAGES.auth.verifyEmailResent);
      } else {
        Alert.alert('Could not resend', result.error ?? 'Please try again later.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      watermarkIcon="mail-outline"
      title={SUCCESS_MESSAGES.auth.verifyEmailTitle}
      subtitle={SUCCESS_MESSAGES.auth.verifyEmailSubtitle}
      backLabel="Back"
      onBack={() => navigation.navigate('Register', { accountKind })}
    >
      <Card padding="large" style={styles.card}>
        <Typography variant="caption" style={styles.emailHint}>
          {email}
        </Typography>
        <Typography variant="body" style={styles.step}>
          {`1. ${SUCCESS_MESSAGES.auth.verifyEmailStepCheckInbox}`}
        </Typography>
        <Typography variant="body" style={styles.step}>
          {`2. ${SUCCESS_MESSAGES.auth.verifyEmailStepClickLink}`}
        </Typography>
        <Typography variant="body" style={styles.step}>
          {`3. ${SUCCESS_MESSAGES.auth.verifyEmailStepSignIn}`}
        </Typography>

        <Button
          title={SUCCESS_MESSAGES.auth.verifyEmailContinueSignIn}
          onPress={goSignIn}
          variant="primary"
          style={styles.primaryCta}
        />

        <Button
          title={resendLoading ? 'Sending…' : SUCCESS_MESSAGES.auth.verifyEmailResendCta}
          onPress={handleResend}
          variant="outline"
          disabled={resendLoading}
          loading={resendLoading}
          style={styles.secondaryCta}
        />

        <TouchableOpacity onPress={openMail} style={styles.linkRow} activeOpacity={0.7}>
          <Typography variant="body" style={styles.linkText}>
            {SUCCESS_MESSAGES.auth.verifyEmailOpenMail}
          </Typography>
        </TouchableOpacity>
      </Card>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
  },
  emailHint: {
    color: UI_CONFIG.colors.accent,
    marginBottom: 16,
    fontWeight: '600',
  },
  step: {
    color: UI_CONFIG.colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  primaryCta: {
    marginTop: 8,
    marginBottom: 12,
  },
  secondaryCta: {
    marginBottom: 8,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default VerifyEmailScreen;
