import React, { useState, useMemo } from 'react';
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
import { UI_CONFIG } from '../../constants/config';

interface AgencySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  agencies: Array<{ id: string; name: string; ownerName?: string }>;
  selectedAgencyId: string | null;
  onSelectAgency: (agency: { id: string; name: string; ownerName?: string }) => void;
  loading: boolean;
}

const AgencySelectionModal: React.FC<AgencySelectionModalProps> = ({
  visible,
  onClose,
  agencies,
  selectedAgencyId,
  onSelectAgency,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter agencies based on search query (business name or owner name)
  const filteredAgencies = useMemo(() => {
    if (!searchQuery.trim()) {
      return agencies;
    }
    const query = searchQuery.toLowerCase().trim();
    return agencies.filter(agency => {
      const businessName = agency.name?.toLowerCase() || '';
      const ownerName = agency.ownerName?.toLowerCase() || '';
      return businessName.includes(query) || ownerName.includes(query);
    });
  }, [agencies, searchQuery]);

  // Reset search when modal closes
  React.useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Select Tanker Agency</Typography>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={UI_CONFIG.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by business or owner name..."
              placeholderTextColor={UI_CONFIG.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={UI_CONFIG.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <View style={styles.emptyState}>
              <LoadingSpinner />
              <Typography variant="body" style={styles.emptyStateText}>Loading agencies...</Typography>
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
                    <Typography variant="body" style={styles.tankerName}>{agency.name}</Typography>
                    {agency.ownerName && (
                      <Typography variant="caption" style={styles.ownerName}>
                        Owner: {agency.ownerName}
                      </Typography>
                    )}
                  </View>
                  <Ionicons
                    name={selectedAgencyId === agency.id ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={selectedAgencyId === agency.id ? UI_CONFIG.colors.primary : UI_CONFIG.colors.textSecondary}
                  />
                </Card>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color={UI_CONFIG.colors.textSecondary} />
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
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
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderColor: UI_CONFIG.colors.primary,
    borderWidth: 1,
  },
  tankerInfo: {
    flex: 1,
  },
  tankerName: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
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
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default AgencySelectionModal;

