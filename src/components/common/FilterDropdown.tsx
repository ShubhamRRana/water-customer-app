import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Typography from './Typography';
import type { ThemeColors } from '../../constants/config';
import { useThemeColors } from '../../hooks/useThemeColors';

export type FilterDropdownOption<T> = {
  label: string;
  value: T;
};

interface FilterDropdownProps<T> {
  label: string;
  value: string;
  options: FilterDropdownOption<T>[];
  onSelect: (value: T) => void;
  testID?: string;
  isSelected?: (option: FilterDropdownOption<T>) => boolean;
}

function createFilterDropdownStyles(colors: ThemeColors) {
  return StyleSheet.create({
    trigger: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.overlaySubtle,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    triggerTextBlock: {
      flex: 1,
      marginRight: 8,
    },
    triggerLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    triggerValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.overlayDark,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '60%',
      paddingBottom: 34,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    optionsList: {
      paddingVertical: 8,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    optionRowSelected: {
      backgroundColor: colors.overlaySubtle,
    },
    optionLabel: {
      fontSize: 16,
      color: colors.text,
    },
    optionLabelSelected: {
      fontWeight: '600',
      color: colors.accent,
    },
  });
}

function FilterDropdown<T>({
  label,
  value,
  options,
  onSelect,
  testID,
  isSelected,
}: FilterDropdownProps<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createFilterDropdownStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  const handleOpen = useCallback(() => setVisible(true), []);
  const handleClose = useCallback(() => setVisible(false), []);

  const handleSelect = useCallback(
    (option: FilterDropdownOption<T>) => {
      onSelect(option.value);
      setVisible(false);
    },
    [onSelect],
  );

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
      >
        <View style={styles.triggerTextBlock}>
          <Typography variant="caption" style={styles.triggerLabel}>
            {label}
          </Typography>
          <Typography variant="body" style={styles.triggerValue}>
            {value}
          </Typography>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Typography variant="body" style={styles.modalTitle}>
                {label}
              </Typography>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList} bounces={false}>
              {options.map((option, index) => {
                const selected = isSelected ? isSelected(option) : false;
                return (
                  <TouchableOpacity
                    key={`${option.label}-${index}`}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => handleSelect(option)}
                    activeOpacity={0.7}
                  >
                    <Typography
                      variant="body"
                      style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                    >
                      {option.label}
                    </Typography>
                    {selected ? (
                      <Ionicons name="checkmark" size={20} color={colors.accent} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default FilterDropdown;
