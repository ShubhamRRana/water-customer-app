import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import FilterDropdown from './FilterDropdown';
import { UI_CONFIG } from '../../constants/config';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface MonthYearFilterRowProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  availableYears: number[];
}

const MonthYearFilterRow: React.FC<MonthYearFilterRowProps> = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  availableYears,
}) => {
  const monthOptions = useMemo(
    () => MONTH_LABELS.map((label, index) => ({ label, value: index })),
    [],
  );

  const yearOptions = useMemo(
    () => availableYears.map((year) => ({ label: String(year), value: year })),
    [availableYears],
  );

  return (
    <View style={styles.container}>
      <FilterDropdown
        label="Month"
        value={MONTH_LABELS[selectedMonth] ?? 'Jan'}
        options={monthOptions}
        onSelect={onMonthChange}
        isSelected={(option) => option.value === selectedMonth}
        testID="month-filter-dropdown"
      />
      <FilterDropdown
        label="Year"
        value={String(selectedYear)}
        options={yearOptions}
        onSelect={onYearChange}
        isSelected={(option) => option.value === selectedYear}
        testID="year-filter-dropdown"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: UI_CONFIG.spacing.sm,
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.sm,
  },
});

export default MonthYearFilterRow;
