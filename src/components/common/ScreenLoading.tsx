import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, ActivityIndicatorProps } from 'react-native';
import { UI_CONFIG, LOADING_MESSAGES } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import Typography from './Typography';

interface ScreenLoadingProps {
  message?: string;
  size?: ActivityIndicatorProps['size'];
  fill?: boolean;
}

const ScreenLoading: React.FC<ScreenLoadingProps> = ({
  message = LOADING_MESSAGES.general.loading,
  size = 'large',
  fill = true,
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
        wrapInline: {
          flex: 0,
          flexGrow: 0,
          padding: UI_CONFIG.spacing.lg,
        },
        message: {
          marginTop: UI_CONFIG.spacing.md,
          fontSize: UI_CONFIG.fontSize.md,
          color: colors.textSecondary,
          textAlign: 'center',
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.wrap, !fill && styles.wrapInline]}>
      <ActivityIndicator size={size} color={colors.accent} />
      {message ? (
        <Typography variant="body" style={styles.message}>
          {message}
        </Typography>
      ) : null}
    </View>
  );
};

export default ScreenLoading;
