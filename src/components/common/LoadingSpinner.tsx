import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';
import Typography from './Typography';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'large', color, text }) => {
  const colors = useThemeColors();
  const resolvedColor = color ?? colors.accent;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        },
        text: {
          marginTop: 16,
          fontSize: 16,
          color: colors.textSecondary,
          textAlign: 'center',
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={resolvedColor} />
      {text ? (
        <Typography variant="body" style={styles.text}>
          {text}
        </Typography>
      ) : null}
    </View>
  );
};

export default LoadingSpinner;
