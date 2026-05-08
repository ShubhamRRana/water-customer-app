import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { Typography } from '../common';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';

interface AgencySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  agencies: Array<{ id: string; name: string; ownerName?: string }>;
  selectedAgencyId: string | null;
  onSelectAgency: (agency: { id: string; name: string; ownerName?: string }) => void;
  loading: boolean;
}

function createAgencyModalStyles(colors: ThemeColors) {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    searchBarFocused: {
      borderColor: colors.accent,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 0,
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    tankerCard: {
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedTankerCard: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
    },
    tankerInfo: {
      flex: 1,
    },
    tankerName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    ownerName: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
  });
}

const AgencySelectionModal: React.FC<AgencySelectionModalProps> = ({
  visible,
  onClose,
  agencies,
  selectedAgencyId,
  onSelectAgency,
  loading,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createAgencyModalStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredAgencies = useMemo(() => {
    if (!searchQuery.trim()) {
      return agencies;
    }
    const query = searchQuery.toLowerCase().trim();
    return agencies.filter((agency) => {
      const businessName = agency.name?.toLowerCase() || '';
      const ownerName = agency.ownerName?.toLowerCase() || '';
      return businessName.includes(query) || ownerName.includes(query);
    });
  }, [agencies, searchQuery]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close modal" accessibilityRole="button">
            <Ionicons name="close" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>
            Select Tanker Agency
          </Typography>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Ionicons
              name="search"
              size={20}
              color={searchFocused ? colors.accent : colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by business or owner name..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              accessibilityLabel="Search agencies"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <View style={styles.emptyState}>
              <LoadingSpinner />
              <Typography variant="body" style={styles.emptyStateText}>
                Loading agencies...
              </Typography>
            </View>
          ) : filteredAgencies.length > 0 ? (
            <>
              {filteredAgencies.map((agency, index) => (
                <Card
                  key={agency.id || `agency-${index}`}
                  style={[
                    styles.tankerCard,
                    selectedAgencyId === agency.id && styles.selectedTankerCard,
                  ]}
                  onPress={() => onSelectAgency(agency)}
                >
                  <View style={styles.tankerInfo}>
                    <Typography variant="body" style={styles.tankerName}>
                      {agency.name}
                    </Typography>
                    {agency.ownerName && (
                      <Typography variant="caption" style={styles.ownerName}>
                        Owner: {agency.ownerName}
                      </Typography>
                    )}
                  </View>
                  <Ionicons
                    name={selectedAgencyId === agency.id ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={selectedAgencyId === agency.id ? colors.accent : colors.textSecondary}
                  />
                </Card>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
              <Typography variant="body" style={styles.emptyStateText}>
                {searchQuery.trim() ? 'No agencies found' : 'No agencies available'}
              </Typography>
              <Typography variant="caption" style={styles.emptyStateSubtext}>
                {searchQuery.trim()
                  ? 'Try adjusting your search terms'
                  : 'Please contact support if you need assistance'}
              </Typography>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default AgencySelectionModal;
