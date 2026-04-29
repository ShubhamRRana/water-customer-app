import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types/index';
import { CustomerIcon, Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type RoleSelectionNavigationProp = StackNavigationProp<AuthStackParamList, 'RoleSelection'>;

interface Props {
  navigation: RoleSelectionNavigationProp;
}

const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [selectedAccount, setSelectedAccount] = useState<'individual' | 'society' | null>(null);
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  const accountTypes = [
    {
      key: 'individual' as const,
      title: 'Individual',
      subtitle: 'Order water tankers for personal use',
    },
    {
      key: 'society' as const,
      title: 'Society',
      subtitle: 'Manage water requirements for your society',
    },
  ];

  const handleContinue = () => {
    if (!selectedAccount) return;

    if (selectedAccount === 'society') {
      navigation.navigate('SocietyLogin');
      return;
    }

    navigation.navigate('Login', { accountType: 'individual' });
  };

  const watermarkPositions = useMemo(() => {
    const iconSize = 50;
    const minSpacing = 70;
    const positions: Array<{ top: number; left: number }> = [];
    const watermarkCount = 20;
    const maxAttempts = 100;

    const hasOverlap = (
      newTop: number,
      newLeft: number,
      existingPositions: Array<{ top: number; left: number }>
    ) => {
      for (const pos of existingPositions) {
        const distance = Math.sqrt(
          Math.pow(newTop - pos.top, 2) + Math.pow(newLeft - pos.left, 2)
        );
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
  }, [screenWidth, screenHeight]);

  const renderWatermarkIcon = (index: number) => {
    if (index < 10) {
      return <CustomerIcon size={50} color={UI_CONFIG.colors.textSecondary} />;
    }
    return <Ionicons name="business-outline" size={50} color={UI_CONFIG.colors.textSecondary} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            {renderWatermarkIcon(index)}
          </View>
        ))}

        <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.contentOverlay}>
          <View style={styles.header}>
            <Typography variant="h1" style={styles.title}>Water Tanker - Customer</Typography>
            <Typography variant="body" style={styles.subtitle}>Select how you want to use the app</Typography>
          </View>

          <View style={styles.roleContainer}>
            {accountTypes.map((accountType) => (
              <TouchableOpacity
                key={accountType.key}
                style={[
                  styles.roleCard,
                  selectedAccount === accountType.key && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedAccount(accountType.key)}
              >
                <View style={styles.roleHeader}>
                  <View style={styles.roleInfo}>
                    <Typography
                      variant="h3"
                      style={[
                        styles.roleTitle,
                        selectedAccount === accountType.key && styles.roleTitleSelected,
                      ]}
                    >
                      {accountType.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      style={[
                        styles.roleDescription,
                        selectedAccount === accountType.key && styles.roleDescriptionSelected,
                      ]}
                    >
                      {accountType.subtitle}
                    </Typography>
                  </View>
                  <View style={styles.iconContainer}>
                    {accountType.key === 'individual' ? (
                      <CustomerIcon
                        size={32}
                        color={selectedAccount === accountType.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text}
                      />
                    ) : (
                      <Ionicons
                        name="business-outline"
                        size={32}
                        color={selectedAccount === accountType.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                !selectedAccount && styles.buttonDisabled,
                isButtonPressed && styles.buttonPressed,
              ]}
              onPress={handleContinue}
              disabled={!selectedAccount}
              onPressIn={() => setIsButtonPressed(true)}
              onPressOut={() => setIsButtonPressed(false)}
            >
              <Typography variant="body" style={styles.buttonText}>Continue</Typography>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  watermarkContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.06,
    zIndex: 0,
    pointerEvents: 'none',
  },
  contentOverlay: {
    zIndex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
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
  },
  roleContainer: {
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  roleCardSelected: {
    borderColor: UI_CONFIG.colors.accent,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginLeft: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: UI_CONFIG.colors.accent,
  },
  roleDescription: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  roleDescriptionSelected: {
    color: UI_CONFIG.colors.accentMuted,
  },
  button: {
    backgroundColor: UI_CONFIG.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.accent,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 6,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: UI_CONFIG.colors.disabled,
    borderColor: UI_CONFIG.colors.disabled,
    shadowOpacity: 0.3,
  },
  buttonPressed: {
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  buttonText: {
    color: UI_CONFIG.colors.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
  },
});

export default RoleSelectionScreen;
