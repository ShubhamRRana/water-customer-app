import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ActivityIndicatorProps,
} from 'react-native';
import { UI_CONFIG, LOADING_MESSAGES } from '../../constants/config';
import Typography from './Typography';

interface ScreenLoadingProps {
  message?: string;
  size?: ActivityIndicatorProps['size'];
  /** When false, only the indicator + text row is shown (parent handles layout). */
  fill?: boolean;
}

/**
 * Centered spinner + message for full-screen or flex-fill loading states.
 * Prefer with {@link LOADING_MESSAGES} or query `isPending` / `isFetching` on list screens.
 */
const ScreenLoading: React.FC<ScreenLoadingProps> = ({
  message = LOADING_MESSAGES.general.loading,
  size = 'large',
  fill = true,
}) => {
  return (
    <View style={[styles.wrap, !fill && styles.wrapInline]}>
      <ActivityIndicator size={size} color={UI_CONFIG.colors.accent} />
      {message ? (
        <Typography variant="body" style={styles.message}>
          {message}
        </Typography>
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
  wrapInline: {
    flex: 0,
    flexGrow: 0,
    padding: UI_CONFIG.spacing.lg,
  },
  message: {
    marginTop: UI_CONFIG.spacing.md,
    fontSize: UI_CONFIG.fontSize.md,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
});

export default ScreenLoading;
