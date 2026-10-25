import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { AppModal } from '../../../shared/components/AppModal';
import { createDebt, DebtDirection } from '../../../db/repositories/debts';
import { cop } from '../utils/currency';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';
import { localDateKey } from '../../../shared/utils/date';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function DebtModal({ visible, onClose, onSaved }: Props) {
  const theme = useTheme();
  const isLight = theme.isLight;
  const [title, setTitle] = useState('');
  const [person, setPerson] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('owe');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setPerson('');
      setDirection('owe');
      setAmount('');
      setDueDate(null);
      setNote('');
    }
  }, [visible]);

  const save = async () => {
    const total = cop(amount);
    if (!title.trim() || total <= 0) {
      Alert.alert(
        'Falta información',
        'Escribe qué es la deuda y un monto mayor a cero.',
      );
      return;
    }
    try {
      await createDebt({
        title: title.trim(),
        person: person.trim() || null,
        direction,
        total,
        dueDate: dueDate ? localDateKey(dueDate) : null,
        note: note.trim() || null,
      });
      await onSaved();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo guardar la deuda.',
      );
    }
  };

  return (
    <AppModal visible={visible} title="Nueva deuda" onClose={onClose}>
      <Text style={[styles.label, isLight && lightStyles.label]}>
        ¿Qué es la deuda?
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ej. Préstamo para la moto"
        placeholderTextColor={isLight ? light.muted : '#75798B'}
        style={[styles.input, isLight && lightStyles.input]}
      />

      <Text style={[styles.label, isLight && lightStyles.label]}>
        ¿Con quién? · opcional
      </Text>
      <TextInput
        value={person}
        onChangeText={setPerson}
        placeholder="Ej. Juan"
        placeholderTextColor={isLight ? light.muted : '#75798B'}
        style={[styles.input, isLight && lightStyles.input]}
      />

      <Text style={[styles.label, isLight && lightStyles.label]}>
        Dirección
      </Text>
      <View style={styles.chips}>
        {(
          [
            ['owe', 'Yo debo'],
            ['owed', 'Me deben'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setDirection(value)}
            style={[
              styles.chip,
              isLight && lightStyles.chip,
              direction === value && styles.chipActive,
              isLight && direction === value && lightStyles.chipActive,
            ]}
          >
            <Text style={[styles.chipText, isLight && lightStyles.chipText]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, isLight && lightStyles.label]}>
        Monto total
      </Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Ej. 500000"
        placeholderTextColor={isLight ? light.muted : '#75798B'}
        style={[styles.input, isLight && lightStyles.input]}
      />

      <Text style={[styles.label, isLight && lightStyles.label]}>
        Fecha límite · opcional
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[styles.chip, isLight && lightStyles.chip]}
        >
          <Text style={[styles.chipText, isLight && lightStyles.chipText]}>
            {dueDate
              ? dueDate.toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Sin fecha límite'}
          </Text>
        </Pressable>
        {dueDate && (
          <Pressable onPress={() => setDueDate(null)} hitSlop={10}>
            <Text style={styles.clear}>Quitar</Text>
          </Pressable>
        )}
      </View>
      {showPicker && (
        <DateTimePicker
          value={dueDate ?? new Date()}
          mode="date"
          display="default"
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowPicker(false);
            if (event.type === 'dismissed' || !date) return;
            setDueDate(date);
          }}
        />
      )}

      <Text style={[styles.label, isLight && lightStyles.label]}>
        Nota · opcional
      </Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Ej. Pagar en cuotas"
        placeholderTextColor={isLight ? light.muted : '#75798B'}
        style={[styles.input, isLight && lightStyles.input]}
      />

      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Guardar deuda</Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#C9B6E8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#202433',
    color: '#F8F7FB',
    paddingHorizontal: 13,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 12,
    backgroundColor: '#202433',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chipActive: { borderWidth: 1, borderColor: '#A78BFA' },
  chipText: { color: '#E8E9EE', fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clear: { color: '#E895A4', fontSize: 13, fontWeight: '700' },
  save: {
    marginTop: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#A78BFA',
  },
  saveText: { color: '#171421', fontWeight: '800', fontSize: 15 },
});

const lightStyles = StyleSheet.create({
  label: { color: light.accent },
  input: {
    backgroundColor: light.surface,
    color: light.text,
    borderWidth: 1,
    borderColor: light.border,
  },
  chip: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  chipActive: { borderColor: light.accent, backgroundColor: '#EAE4D9' },
  chipText: { color: light.text },
});
