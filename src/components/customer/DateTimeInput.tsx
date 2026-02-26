import React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Card from '../common/Card';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';

interface DateTimeInputProps {
  date: string;
  time: string;
  timePeriod: 'AM' | 'PM';
  dateError?: string;
  onDateChange: (text: string) => void;
  onTimeChange: (text: string) => void;
  onTimePeriodChange: (period: 'AM' | 'PM') => void;
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({
  date,
  time,
  timePeriod,
  dateError,
  onDateChange,
  onTimeChange,
  onTimePeriodChange,
}) => {
  return (
    <View style={styles.dateTimeContainer}>
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeInputContainer}>
          <Typography variant="body" style={styles.inputLabel}>Date</Typography>
          <Card style={[styles.inputCard, dateError && styles.inputCardError]}>
            <TextInput
              style={styles.dateTimeInput}
              placeholder="DD-MM-YYYY"
              value={date}
              onChangeText={onDateChange}
              keyboardType="numeric"
              maxLength={10}
            />
          </Card>
          {dateError && (
            <Typography variant="caption" style={styles.errorText}>{dateError}</Typography>
          )}
        </View>
        <View style={styles.dateTimeInputContainer}>
          <Typography variant="body" style={styles.inputLabel}>Time</Typography>
          <Card style={styles.inputCard}>
            <View style={styles.timeInputContainer}>
              <TextInput
                style={styles.dateTimeInput}
                placeholder="HH:MM"
                value={time}
                onChangeText={onTimeChange}
                keyboardType="numeric"
                maxLength={5}
              />
              <View style={styles.timePeriodContainer}>
                <TouchableOpacity
                  style={[
                    styles.timePeriodButton,
                    timePeriod === 'AM' && styles.timePeriodButtonActive
                  ]}
                  onPress={() => onTimePeriodChange('AM')}
                >
                  <Typography variant="body" style={[
                    styles.timePeriodText,
                    timePeriod === 'AM' && styles.timePeriodTextActive
                  ]}>AM</Typography>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timePeriodButton,
                    timePeriod === 'PM' && styles.timePeriodButtonActive
                  ]}
                  onPress={() => onTimePeriodChange('PM')}
                >
                  <Typography variant="body" style={[
                    styles.timePeriodText,
                    timePeriod === 'PM' && styles.timePeriodTextActive
                  ]}>PM</Typography>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dateTimeContainer: {
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 8,
  },
  dateTimeInput: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    paddingVertical: 12,
    flex: 1,
  },
  inputCard: {
    marginBottom: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  inputCardError: {
    borderColor: UI_CONFIG.colors.error,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: UI_CONFIG.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  timePeriodContainer: {
    flexDirection: 'column',
    gap: 2,
    marginLeft: 12,
  },
  timePeriodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.surface,
    borderWidth: 1.5,
    borderColor: UI_CONFIG.colors.border,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timePeriodButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
    shadowColor: UI_CONFIG.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timePeriodText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
    letterSpacing: 0.5,
  },
  timePeriodTextActive: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '700',
  },
});

export default DateTimeInput;

