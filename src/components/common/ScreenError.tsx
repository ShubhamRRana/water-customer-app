import React from 'react';
import { View, StyleSheet } from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import Typography from './Typography';
import Button from './Button';

interface ScreenErrorProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Full-screen friendly error state with optional retry (e.g. `refetch` from React Query).
 */
const ScreenError: React.FC<ScreenErrorProps> = ({
  message,
  title,
  onRetry,
  retryLabel = 'Try again',
}) => {
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
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="outline"
          style={styles.retry}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.background,
    padding: UI_CONFIG.spacing.lg,
  },
  title: {
    color: UI_CONFIG.colors.text,
    textAlign: 'center',
    marginBottom: UI_CONFIG.spacing.sm,
  },
  message: {
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  retry: {
    marginTop: UI_CONFIG.spacing.md,
    minWidth: 160,
  },
});

export default ScreenError;
