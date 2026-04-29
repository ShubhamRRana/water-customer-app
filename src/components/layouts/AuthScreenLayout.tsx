import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';

export interface AuthScreenLayoutProps {
  /** Ionicons glyph name for scattered watermark icons */
  watermarkIcon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  backLabel: string;
  onBack: () => void;
  /** Fixed caption pinned above safe-area bottom (e.g. reset-password notice) */
  bottomNotice?: string;
  children: React.ReactNode;
}

function useWatermarkPositions() {
  return useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const iconSize = 50;
    const minSpacing = 70;
    const positions: Array<{ top: number; left: number }> = [];
    const watermarkCount = 24;
    const maxAttempts = 100;

    const hasOverlap = (
      newTop: number,
      newLeft: number,
      existing: Array<{ top: number; left: number }>
    ) => {
      for (const pos of existing) {
        const distance = Math.sqrt(Math.pow(newTop - pos.top, 2) + Math.pow(newLeft - pos.left, 2));
        if (distance < minSpacing) return true;
      }
      return false;
    };

    for (let i = 0; i < watermarkCount; i++) {
      let attempts = 0;
      let top: number;
      let left: number;
      do {
        top = Math.random() * (screenHeight - iconSize - 40) + 20;
        left = Math.random() * (screenWidth - iconSize - 40) + 20;
        attempts++;
        if (attempts > maxAttempts) {
          const cols = Math.floor(screenWidth / minSpacing);
          const rows = Math.floor(screenHeight / minSpacing);
          const gridIndex = i % (cols * rows);
          const col = gridIndex % cols;
          const row = Math.floor(gridIndex / cols);
          top = row * minSpacing + 20;
          left = col * minSpacing + 20;
          break;
        }
      } while (hasOverlap(top, left, positions));
      positions.push({ top, left });
    }
    return positions;
  }, []);
}

/**
 * Shared shell for auth flows: safe area, keyboard avoidance, optional watermark,
 * scroll region with back row + title/subtitle, and optional bottom notice.
 */
const AuthScreenLayout: React.FC<AuthScreenLayoutProps> = ({
  watermarkIcon,
  title,
  subtitle,
  backLabel,
  onBack,
  bottomNotice,
  children,
}) => {
  const watermarkPositions = useWatermarkPositions();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {watermarkPositions.map((position, index) => (
          <View
            key={index}
            style={[
              styles.watermarkContainer,
              {
                top: position.top,
                left: position.left,
              },
            ]}
          >
            <Ionicons name={watermarkIcon} size={50} color={UI_CONFIG.colors.textSecondary} />
          </View>
        ))}

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backRow}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={UI_CONFIG.colors.accent} />
            <Typography variant="body" style={styles.backLabel}>
              {backLabel}
            </Typography>
          </TouchableOpacity>

          <View style={styles.header}>
            <Typography variant="h1" style={styles.title}>
              {title}
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {subtitle}
            </Typography>
          </View>

          {children}
        </ScrollView>

        {bottomNotice ? (
          <View style={styles.bottomNoticeWrapper} pointerEvents="none">
            <Typography variant="caption" style={styles.bottomNoticeText}>
              {bottomNotice}
            </Typography>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 96,
    zIndex: 1,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backLabel: {
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'PlayfairDisplay-Regular',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  watermarkContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.06,
    zIndex: 0,
    pointerEvents: 'none',
  },
  bottomNoticeWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 2,
    alignItems: 'center',
  },
  bottomNoticeText: {
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    lineHeight: 18,
  },
});

export default AuthScreenLayout;
