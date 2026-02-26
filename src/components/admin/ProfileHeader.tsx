import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { Typography } from '../common';
import { AdminUser } from '../../types';
import { UI_CONFIG } from '../../constants/config';

interface ProfileHeaderProps {
  user: AdminUser;
  imageError: boolean;
  imageLoading: boolean;
  onRetryImage: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  imageError,
  imageLoading,
  onRetryImage,
}) => {
  const getBusinessInitials = (businessName: string) => {
    return businessName
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Typography variant="h3" style={styles.avatarText}>
              {getBusinessInitials(user.businessName || user.name || 'A')}
            </Typography>
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Typography variant="h3" style={styles.userName}>{user.businessName || user.name}</Typography>
          <Typography variant="body" style={styles.userPhone}>{user.email}</Typography>
          {user.phone && (
            <Typography variant="body" style={styles.userPhone}>{user.phone}</Typography>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    margin: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI_CONFIG.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  userPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  retryButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    zIndex: 2,
  },
});

export default ProfileHeader;