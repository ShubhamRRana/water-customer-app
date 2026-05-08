import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import Typography from './Typography';
import Button from './Button';

interface ScreenErrorProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

const ScreenError: React.FC<ScreenErrorProps> = ({
  message,
  title,
  onRetry,
  retryLabel = 'Try again',
}) => {
  const colors = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
          padding: UI_CONFIG.spacing.lg,
        },
        title: {
          color: colors.text,
          textAlign: 'center',
          marginBottom: UI_CONFIG.spacing.sm,
        },
        message: {
          color: colors.textSecondary,
          textAlign: 'center',
        },
        retry: {
          marginTop: UI_CONFIG.spacing.md,
          minWidth: 160,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.wrap}>
      {title ? (
        <Typography variant="h3" style={styles.title}>
          {title}
        </Typography>
      ) : null}
      <Typography variant="body" style={styles.message}>
        {message}
      </Typography>
      {onRetry ? (
        <Button title={retryLabel} onPress={onRetry} variant="outline" style={styles.retry} />
      ) : null}
    </View>
  );
};

export default ScreenError;
