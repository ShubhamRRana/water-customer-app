import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, DriverIcon, AdminIcon, CustomerIcon } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList, UserRole } from '../../types';

type RoleEntryNavigationProp = StackNavigationProp<AuthStackParamList, 'RoleEntry'>;

interface Props {
  navigation: RoleEntryNavigationProp;
}

const RoleEntryScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  const roles: Array<{ key: UserRole; title: string; subtitle: string }> = [
    { key: 'customer', title: 'Customer', subtitle: 'Book tankers and manage orders' },
    { key: 'admin', title: 'Admin', subtitle: 'Manage platform operations' },
    { key: 'driver', title: 'Driver', subtitle: 'Accept jobs and deliver' },
  ];

  const handleContinue = () => {
    if (!selectedRole) return;
    navigation.navigate('Login', { preferredRole: selectedRole });
  };

  // Generate non-overlapping positions for watermarks (10 customer, 10 admin, 10 driver = 30 total)
  const watermarkPositions = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const iconSize = 50;
    const minSpacing = 70; // Minimum spacing between icons to prevent overlap
    const positions: Array<{ top: number; left: number }> = [];
    const watermarkCount = 30;
    const maxAttempts = 100; // Maximum attempts to find a non-overlapping position
    
    // Helper function to check if a position overlaps with existing positions
    const hasOverlap = (newTop: number, newLeft: number, existingPositions: Array<{ top: number; left: number }>) => {
      for (const pos of existingPositions) {
        const distance = Math.sqrt(
          Math.pow(newTop - pos.top, 2) + Math.pow(newLeft - pos.left, 2)
        );
        if (distance < minSpacing) {
          return true;
        }
      }
      return false;
    };
    
    for (let i = 0; i < watermarkCount; i++) {
      let attempts = 0;
      let top: number, left: number;
      
      // Try to find a non-overlapping position
      do {
        top = Math.random() * (screenHeight - iconSize - 40) + 20; // Leave some margin from edges
        left = Math.random() * (screenWidth - iconSize - 40) + 20;
        attempts++;
        
        // If we've tried too many times, use a grid-based fallback
        if (attempts > maxAttempts) {
          // Use a grid-based approach as fallback
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {watermarkPositions.map((position, index) => {
          const IconComponent = index < 10 ? CustomerIcon : index < 20 ? AdminIcon : DriverIcon;
          return (
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
              <IconComponent size={50} color={UI_CONFIG.colors.textSecondary} />
            </View>
          );
        })}
        <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.contentOverlay}>
          <View style={styles.header}>
            <Typography variant="h1" style={styles.title}>Choose Your Role</Typography>
            <Typography variant="body" style={styles.subtitle}>Select how you want to use the app</Typography>
          </View>

          <View style={styles.roleContainer}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.key}
                style={[styles.roleCard, selectedRole === role.key && styles.roleCardSelected]}
                onPress={() => setSelectedRole(role.key)}
              >
                <View style={styles.roleHeader}>
                  <View style={styles.roleInfo}>
                    <Typography variant="h3" style={[styles.roleTitle, selectedRole === role.key && styles.roleTitleSelected]}>
                      {role.title}
                    </Typography>
                    <Typography variant="caption" style={[styles.roleDescription, selectedRole === role.key && styles.roleDescriptionSelected]}>
                      {role.subtitle}
                    </Typography>
                  </View>
                  {role.key === 'driver' && (
                    <View style={styles.iconContainer}>
                      <DriverIcon size={32} color={selectedRole === role.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text} />
                    </View>
                  )}
                  {role.key === 'admin' && (
                    <View style={styles.iconContainer}>
                      <AdminIcon size={32} color={selectedRole === role.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text} />
                    </View>
                  )}
                  {role.key === 'customer' && (
                    <View style={styles.iconContainer}>
                      <CustomerIcon size={32} color={selectedRole === role.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, !selectedRole && styles.buttonDisabled, isButtonPressed && styles.buttonPressed]}
              onPress={handleContinue}
              disabled={!selectedRole}
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
    fontSize: 28,
    fontWeight: 'bold',
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
  roleIcon: {
    fontSize: 32,
    marginRight: 16,
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
    color: UI_CONFIG.colors.primary,
  },
  button: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
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
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.primary,
  },
  buttonSecondaryDisabled: {
    borderColor: UI_CONFIG.colors.disabled,
    opacity: 0.5,
  },
  buttonSecondaryText: {
    color: UI_CONFIG.colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default RoleEntryScreen;


