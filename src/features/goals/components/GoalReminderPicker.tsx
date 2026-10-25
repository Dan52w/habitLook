import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
};

function timeToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/** Selector de hora para el recordatorio diario de una meta. */
export function GoalReminderPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const isLight = theme.isLight;
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(dateToTime(date));
  };

  return (
    <View>
      <Text style={[styles.label, isLight && lightStyles.label]}>
        Recordatorio diario · opcional
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[styles.chip, isLight && lightStyles.chip]}
        >
          <Text style={[styles.chipText, isLight && lightStyles.chipText]}>
            {value ? `⏰ ${value}` : 'Sin recordatorio'}
          </Text>
        </Pressable>
        {value && (
          <Pressable
            onPress={() => onChange(null)}
            style={[styles.chip, isLight && lightStyles.chip]}
          >
            <Text style={[styles.chipText, isLight && lightStyles.chipText]}>
              Quitar
            </Text>
          </Pressable>
        )}
      </View>
      {value && (
        <Text style={[styles.hint, isLight && lightStyles.hint]}>
          Te avisaremos cada día a las {value} para que registres tu avance.
        </Text>
      )}
      {showPicker && (
        <DateTimePicker
          value={value ? timeToDate(value) : new Date()}
          mode="time"
          is24Hour
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#C7C7CC',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 12,
    backgroundColor: '#252525',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chipText: { color: '#FAFAFA', fontSize: 14, fontWeight: '600' },
  hint: { color: '#A3A3A3', fontSize: 12, marginTop: 6 },
});

const lightStyles = StyleSheet.create({
  label: { color: light.accent },
  chip: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  chipText: { color: light.text },
  hint: { color: light.muted },
});
