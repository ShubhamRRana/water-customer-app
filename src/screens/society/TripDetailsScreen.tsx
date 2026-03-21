import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography, CustomerMenuDrawer } from '../../components/common';
import { SocietyTrip } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { BOOKING_CONFIG, UI_CONFIG } from '../../constants/config';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';
import { SocietyTripService } from '../../services/societyTrip.service';

type TripDetailsNavigationProp = StackNavigationProp<CustomerStackParamList, 'TripDetails'>;

interface TripDetailsScreenProps {
  navigation: TripDetailsNavigationProp;
}

const TripDetailsScreen: React.FC<TripDetailsScreenProps> = ({ navigation }) => {
  const { user, logout, customerAccountKind } = useAuthStore();
  const [trips, setTrips] = useState<SocietyTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadTrips = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await SocietyTripService.listTripsForCustomer(user.id);
      setTrips(list);
    } catch (error) {
      errorLogger.medium('Failed to load society trips', error, { userId: user.id });
      throw error;
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      loadTrips()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [loadTrips]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTrips();
    } catch {
      Alert.alert('Error', 'Could not load trip details. Try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (
    route: 'Home' | 'Orders' | 'Profile' | 'PastOrders' | 'TripDetails',
  ) => {
    if (route === 'TripDetails') {
      return;
    }
    navigation.navigate(route);
  };

  const openPhoto = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open photo.');
    });
  };

  const tripsByTankerSize = useMemo(() => {
    const counts = new Map<number, number>();
    for (const t of trips) {
      counts.set(t.tankerSizeLiters, (counts.get(t.tankerSizeLiters) ?? 0) + 1);
    }
    const defaultSizes = BOOKING_CONFIG.defaultTankerSizes.map((d) => d.size);
    const allLiters = [...new Set([...defaultSizes, ...counts.keys()])].sort((a, b) => a - b);
    return allLiters.map((liters) => ({ liters, count: counts.get(liters) ?? 0 }));
  }, [trips]);

  if (isLoading && !trips.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading trip details…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="h2" style={styles.title}>
              Trip details
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'} logged
            </Typography>
          </View>
        </View>

        <Card style={styles.summaryCard}>
          <Typography variant="caption" style={styles.summaryHeading}>
            Trips by tanker size
          </Typography>
          {tripsByTankerSize.map(({ liters, count }) => (
            <View key={liters} style={styles.summaryRow}>
              <Typography variant="body" style={styles.summarySize}>
                {liters.toLocaleString()}L
              </Typography>
              <Typography variant="body" style={styles.summaryCount}>
                {count} {count === 1 ? 'trip' : 'trips'}
              </Typography>
            </View>
          ))}
        </Card>

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={trips.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI_CONFIG.colors.accent} />
          }
          ListEmptyComponent={
            <Card style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyTitle}>
                No trips yet
              </Typography>
              <Typography variant="caption" style={styles.emptySubtext}>
                Trips you add from Home appear here.
              </Typography>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.tripCard}>
              <View style={styles.tripRow}>
                <TouchableOpacity
                  onPress={() => openPhoto(item.photoUrl)}
                  activeOpacity={0.85}
                  style={styles.thumbWrap}
                >
                  <Image source={{ uri: item.photoUrl }} style={styles.thumb} resizeMode="cover" />
                  <View style={styles.thumbHint}>
                    <Ionicons name="expand-outline" size={14} color={UI_CONFIG.colors.textLight} />
                  </View>
                </TouchableOpacity>
                <View style={styles.tripInfo}>
                  <Typography variant="body" style={styles.agencyName} numberOfLines={2}>
                    {item.agencyName}
                  </Typography>
                  <Typography variant="caption" style={styles.meta}>
                    {formatDateTime(item.scheduledAt)}
                  </Typography>
                  <Typography variant="caption" style={styles.meta}>
                    {item.tankerSizeLiters}L tanker
                  </Typography>
                </View>
              </View>
            </Card>
          )}
        />
      </View>

      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="TripDetails"
        customerAccountKind={customerAccountKind}
      />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: UI_CONFIG.colors.text,
    fontWeight: '700',
  },
  subtitle: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 4,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryHeading: {
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_CONFIG.colors.border,
  },
  summarySize: {
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  summaryCount: {
    color: UI_CONFIG.colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  tripCard: {
    marginBottom: 12,
    padding: 14,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbWrap: {
    position: 'relative',
    marginRight: 14,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  thumbHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    padding: 2,
  },
  tripInfo: {
    flex: 1,
    minWidth: 0,
  },
  agencyName: {
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 6,
  },
  meta: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    paddingHorizontal: 16,
  },
});

export default TripDetailsScreen;
