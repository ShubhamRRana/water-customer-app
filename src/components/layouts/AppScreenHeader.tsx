import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';

const headerTokens = UI_CONFIG.appScreenHeader;

export type AppScreenHeaderLeft =
  | { type: 'menu'; onPress: () => void; accessibilityLabel?: string }
  | { type: 'back'; onPress: () => void; accessibilityLabel?: string };

export interface AppScreenHeaderProps {
  left: AppScreenHeaderLeft;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Subtitle line above title (e.g. greeting then “Hi, Name”) */
  subtitleFirst?: boolean;
  /** Trailing control or {@link AppScreenHeaderTrailingSpacer} to balance layout */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ICON_SIZE = 24;

/** Reserve width on the right when there is no action so the title block stays aligned. */
export const AppScreenHeaderTrailingSpacer: React.FC = () => (
  <View style={styles.trailingSpacer} />
);

const AppScreenHeader: React.FC<AppScreenHeaderProps> = ({
  left,
  title,
  subtitle,
  subtitleFirst = false,
  right,
  style,
}) => {
  const renderLeft = () => {
    if (left.type === 'menu') {
      return (
        <TouchableOpacity
          style={styles.leftButton}
          onPress={left.onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={left.accessibilityLabel ?? 'Open menu'}
        >
          <Ionicons name="menu" size={ICON_SIZE} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={styles.leftButton}
        onPress={left.onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={left.accessibilityLabel ?? 'Go back'}
      >
        <Ionicons name="chevron-back" size={ICON_SIZE} color={UI_CONFIG.colors.text} />
      </TouchableOpacity>
    );
  };

  const hasSubtitle = subtitle != null && subtitle !== '';

  const renderCenter = () => {
    if (subtitleFirst && hasSubtitle) {
      return (
        <View style={styles.headerTextContainer}>
          <Typography variant="body" style={styles.subtitleFirstLine}>
            {subtitle}
          </Typography>
          <Typography variant="h2" style={styles.titleAfterSubtitle}>
            {title}
          </Typography>
        </View>
      );
    }
    return (
      <View style={styles.headerTextContainer}>
        <Typography
          variant="h2"
          style={[styles.title, hasSubtitle && styles.titleWithSubtitleBelow]}
        >
          {title}
        </Typography>
        {hasSubtitle ? (
          <Typography variant="body" style={styles.subtitle}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.header, style]}>
      {renderLeft()}
      {renderCenter()}
      {right !== undefined ? right : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: headerTokens.paddingHorizontal,
    paddingTop: headerTokens.paddingTop,
    paddingBottom: headerTokens.paddingBottom,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  leftButton: {
    padding: headerTokens.leftButtonPadding,
    marginRight: headerTokens.leftButtonMarginRight,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: UI_CONFIG.colors.text,
  },
  titleWithSubtitleBelow: {
    marginBottom: UI_CONFIG.spacing.xs,
  },
  titleAfterSubtitle: {
    fontWeight: '700',
    color: UI_CONFIG.colors.text,
  },
  subtitle: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: UI_CONFIG.spacing.xs,
  },
  subtitleFirstLine: {
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: UI_CONFIG.spacing.xs,
  },
  trailingSpacer: {
    minWidth: headerTokens.trailingMinWidth,
  },
});

export default AppScreenHeader;
