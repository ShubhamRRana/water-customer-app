import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { user, logout, customerAccountKind } = useAuthStore();
  const [trips, setTrips] = useState<SocietyTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

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
    setPhotoPreviewUri(url);
  };

  const closePhotoPreview = () => {
    setPhotoPreviewUri(null);
  };

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const toggleTripSelected = useCallback((tripId: string) => {
    setSelectedIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId],
    );
  }, []);

  const performDelete = useCallback(
    async (tripIds: string[]) => {
      if (!user?.id || tripIds.length === 0) return;
      setDeleting(true);
      try {
        await SocietyTripService.deleteTripsForCustomer(user.id, tripIds);
        setTrips((prev) => prev.filter((t) => !tripIds.includes(t.id)));
        exitSelectionMode();
      } catch (error) {
        errorLogger.medium('Failed to delete society trips', error, {
          userId: user.id,
          count: tripIds.length,
        });
        Alert.alert('Error', 'Could not delete trip(s). Try again.');
      } finally {
        setDeleting(false);
      }
    },
    [user?.id, exitSelectionMode],
  );

  const confirmDeleteSingle = useCallback(
    (trip: SocietyTrip) => {
      Alert.alert(
        'Delete trip',
        `Remove this trip for ${trip.agencyName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => performDelete([trip.id]),
          },
        ],
      );
    },
    [performDelete],
  );

  const confirmDeleteSelected = useCallback(() => {
    const n = selectedIds.length;
    if (n === 0) return;
    Alert.alert(
      n === 1 ? 'Delete trip' : 'Delete trips',
      n === 1
        ? 'Remove this trip?'
        : `Remove ${n} trips? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(selectedIds),
        },
      ],
    );
  }, [performDelete, selectedIds]);

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
              {selectionMode ? 'Select trips' : 'Trip details'}
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {selectionMode
                ? `${selectedIds.length} selected`
                : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} logged`}
            </Typography>
          </View>
          {trips.length > 0 ? (
            selectionMode ? (
              <TouchableOpacity
                style={styles.headerAction}
                onPress={exitSelectionMode}
                activeOpacity={0.7}
                disabled={deleting}
              >
                <Typography variant="body" style={styles.headerActionText}>
                  Cancel
                </Typography>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.headerAction}
                onPress={() => setSelectionMode(true)}
                activeOpacity={0.7}
              >
                <Typography variant="body" style={styles.headerActionText}>
                  Select
                </Typography>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.headerActionPlaceholder} />
          )}
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
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Card style={[styles.tripCard, selectionMode && isSelected && styles.tripCardSelected]}>
                <View style={styles.tripRow}>
                  {selectionMode ? (
                    <TouchableOpacity
                      style={styles.selectCheckbox}
                      onPress={() => toggleTripSelected(item.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={isSelected ? UI_CONFIG.colors.accent : UI_CONFIG.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ) : null}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.thumbWrap}
                    contentContainerStyle={styles.thumbStrip}
                  >
                    {item.photoUrls.length > 0 ? (
                      item.photoUrls.map((url, idx) => (
                        <TouchableOpacity
                          key={`${item.id}-img-${idx}`}
                          onPress={() => openPhoto(url)}
                          activeOpacity={0.85}
                          style={styles.thumbCell}
                        >
                          <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                          <View style={styles.thumbHint}>
                            <Ionicons name="expand-outline" size={14} color={UI_CONFIG.colors.textLight} />
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]} />
                    )}
                  </ScrollView>
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
                  {!selectionMode ? (
                    <TouchableOpacity
                      style={styles.tripDeleteBtn}
                      onPress={() => confirmDeleteSingle(item)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Delete trip"
                    >
                      <Ionicons name="trash-outline" size={22} color={UI_CONFIG.colors.error} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />

        {selectionMode && selectedIds.length > 0 ? (
          <View style={[styles.selectionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={[styles.selectionDeleteBtn, deleting && styles.selectionDeleteBtnDisabled]}
              onPress={confirmDeleteSelected}
              activeOpacity={0.85}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={UI_CONFIG.colors.textLight} />
              ) : (
                <Typography variant="body" style={styles.selectionDeleteText}>
                  Delete {selectedIds.length} {selectedIds.length === 1 ? 'trip' : 'trips'}
                </Typography>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <CustomerMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="TripDetails"
        customerAccountKind={customerAccountKind}
      />

      <Modal
        visible={photoPreviewUri != null}
        transparent
        animationType="fade"
        onRequestClose={closePhotoPreview}
        statusBarTranslucent
      >
        <Pressable style={styles.photoModalRoot} onPress={closePhotoPreview}>
          {photoPreviewUri ? (
            <View pointerEvents="none" style={styles.photoModalImage}>
              <Image
                source={{ uri: photoPreviewUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="contain"
              />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.photoModalClose, { top: insets.top + 8 }]}
            onPress={closePhotoPreview}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Ionicons name="close" size={28} color={UI_CONFIG.colors.textLight} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
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
  headerAction: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerActionPlaceholder: {
    minWidth: 64,
  },
  headerActionText: {
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
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
  tripCardSelected: {
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.accent,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  selectCheckbox: {
    justifyContent: 'center',
    marginRight: 10,
    paddingTop: 2,
  },
  tripDeleteBtn: {
    paddingLeft: 4,
    paddingTop: 2,
  },
  thumbWrap: {
    maxWidth: 220,
    marginRight: 14,
  },
  thumbStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  thumbCell: {
    position: 'relative',
    marginRight: 8,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  thumbEmpty: {
    opacity: 0.35,
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
  photoModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    right: 20,
    zIndex: 2,
    padding: 4,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  selectionBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: UI_CONFIG.colors.surface,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  selectionDeleteBtn: {
    backgroundColor: UI_CONFIG.colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  selectionDeleteBtnDisabled: {
    opacity: 0.7,
  },
  selectionDeleteText: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '700',
  },
});

export default TripDetailsScreen;
