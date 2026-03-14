import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Card from '../common/Card';
import { Typography } from '../common';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../../constants/config';
import { parseDateString, parseTimeString } from '../../utils/dateUtils';

interface DateTimeInputProps {
  date: string;
  time: string;
  timePeriod: 'AM' | 'PM';
  dateError?: string;
  onDateChange: (text: string) => void;
  onTimeChange: (text: string) => void;
  onTimePeriodChange: (period: 'AM' | 'PM') => void;
}

/**
 * Convert Date to DD-MM-YYYY string
 */
function dateToDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Convert Date to HH:MM (12-hour) and AM/PM
 */
function dateToTimeAndPeriod(d: Date): { time: string; period: 'AM' | 'PM' } {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { time, period };
}

/**
 * Get initial Date for date picker from date string or default to today
 */
function getInitialDate(dateStr: string): Date {
  const parsed = parseDateString(dateStr);
  if (parsed) return parsed;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get initial Date for time picker from time string + period, or default to 9 AM
 */
function getInitialTime(timeStr: string, period: 'AM' | 'PM'): Date {
  const parsed = parseTimeString(timeStr);
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  if (parsed) {
    let hours24 = parsed.hours;
    if (period === 'AM') {
      if (hours24 === 12) hours24 = 0;
    } else {
      if (hours24 !== 12) hours24 += 12;
    }
    base.setHours(hours24, parsed.minutes, 0, 0);
  } else {
    base.setHours(9, 0, 0, 0); // default 9 AM
  }
  return base;
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => getInitialDate(date));
  const [tempTime, setTempTime] = useState<Date>(() => getInitialTime(time, timePeriod));

  const handleOpenDatePicker = useCallback(() => {
    setTempDate(getInitialDate(date));
    setShowDatePicker(true);
  }, [date]);

  const handleOpenTimePicker = useCallback(() => {
    setTempTime(getInitialTime(time, timePeriod));
    setShowTimePicker(true);
  }, [time, timePeriod]);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (_event.type === 'dismissed') return;
      if (selectedDate) {
        setTempDate(selectedDate);
        onDateChange(dateToDDMMYYYY(selectedDate));
      }
    },
    [onDateChange]
  );

  const handleTimeChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowTimePicker(false);
      if (_event.type === 'dismissed') return;
      if (selectedDate) {
        setTempTime(selectedDate);
        const { time: timeStr, period: periodStr } = dateToTimeAndPeriod(selectedDate);
        onTimeChange(timeStr);
        onTimePeriodChange(periodStr);
      }
    },
    [onTimeChange, onTimePeriodChange]
  );

  const handleDatePickerDismiss = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleTimePickerDismiss = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  return (
    <View style={styles.dateTimeContainer}>
      <View style={styles.dateTimeRow}>
        {/* Date - Calendar Picker */}
        <View style={styles.dateTimeInputContainer}>
          <TouchableOpacity
            onPress={handleOpenDatePicker}
            activeOpacity={0.7}
          >
            <Card style={[styles.inputCard, styles.pickerCard, dateError && styles.inputCardError]}>
              <View style={styles.pickerContent}>
                <Ionicons name="calendar-outline" size={20} color={UI_CONFIG.colors.textSecondary} />
                <Typography variant="body" style={styles.pickerText}>
                  {date || 'Tap to select date'}
                </Typography>
                <Ionicons name="chevron-down" size={18} color={UI_CONFIG.colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
          {dateError && (
            <Typography variant="caption" style={styles.errorText}>{dateError}</Typography>
          )}
        </View>

        {/* Time - Time Scroller Picker */}
        <View style={styles.dateTimeInputContainer}>
          <TouchableOpacity
            onPress={handleOpenTimePicker}
            activeOpacity={0.7}
          >
            <Card style={[styles.inputCard, styles.pickerCard]}>
              <View style={styles.pickerContent}>
                <Ionicons name="time-outline" size={20} color={UI_CONFIG.colors.textSecondary} />
                <Typography variant="body" style={styles.pickerText}>
                  {time ? `${time} ${timePeriod}` : 'Tap to select time'}
                </Typography>
                <Ionicons name="chevron-down" size={18} color={UI_CONFIG.colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Modal - iOS uses inline, Android uses native dialog; Modal for iOS overlay */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={handleDatePickerDismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleDatePickerDismiss}>
                    <Typography variant="body" style={styles.modalDone}>Done</Typography>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              </View>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="calendar"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={handleTimePickerDismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleTimePickerDismiss}>
                    <Typography variant="body" style={styles.modalDone}>Done</Typography>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  is24Hour={false}
                />
              </View>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            is24Hour={false}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dateTimeContainer: {
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'column',
    gap: 12,
  },
  dateTimeInputContainer: {
    width: '100%',
  },
  inputCard: {
    marginBottom: 8,
    minHeight: 53,
    justifyContent: 'center',
  },
  inputCardError: {
    borderColor: UI_CONFIG.colors.error,
    borderWidth: 1,
  },
  pickerCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  errorText: {
    fontSize: 12,
    color: UI_CONFIG.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalDone: {
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
  },
});

export default DateTimeInput;
