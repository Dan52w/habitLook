import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { Category, listCategories } from '../../../db/repositories/categories';
import { createGoal } from '../../../db/repositories/goals';
import { scheduleGoalReminder } from '../../../services/notifications';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';
import { localDateKey } from '../../../shared/utils/date';
import { GoalReminderPicker } from './GoalReminderPicker';

type Frequency = 'daily' | 'weekly' | 'once';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function GoalComposer({ visible, onClose, onSaved }: Props) {
  const theme = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'duration' | 'count' | 'boolean'>(
    'duration',
  );
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [target, setTarget] = useState('30');
  const [reminderTime, setReminderTime] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      listCategories().then(items => {
        setCategories(items);
        setCategory(current => current || items[0]?.id || current);
      });
    }
  }, [visible]);

  const save = async () => {
    const targetValue = type === 'boolean' ? 1 : Number(target);
    if (
      !title.trim() ||
      !category ||
      !Number.isFinite(targetValue) ||
      targetValue <= 0
    ) {
      return;
    }
    const goalId = await createGoal({
      categoryId: category,
      title: title.trim(),
      targetType: type,
      targetValue,
      // 'once' se guarda como diaria anclada a hoy (ver target_date).
      period: frequency === 'once' ? 'daily' : frequency,
      targetDate: frequency === 'once' ? localDateKey() : null,
      reminderTime,
    });
    if (reminderTime) {
      try {
        await scheduleGoalReminder({
          id: goalId,
          title: title.trim(),
          target_type: type,
          target_value: targetValue,
          reminder_time: reminderTime,
        });
      } catch (error) {
        console.warn('No se pudo programar el recordatorio:', error);
      }
    }
    setTitle('');
    setReminderTime(null);
    onSaved();
    onClose();
  };

  return (
    <AppModal visible={visible} title="Nueva meta" onClose={onClose}>
      <Text style={[styles.label, theme.isLight && lightStyles.label]}>
        Categoría
      </Text>
      <View style={styles.chips}>
        {categories.map(item => (
          <Pressable
            key={item.id}
            onPress={() => setCategory(item.id)}
            style={[
              styles.chip,
              theme.isLight && lightStyles.chip,
              category === item.id && styles.chipActive,
              theme.isLight && category === item.id && lightStyles.chipActive,
            ]}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text
              style={[styles.chipText, theme.isLight && lightStyles.chipText]}
            >
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, theme.isLight && lightStyles.label]}>
        ¿Qué quieres lograr?
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ej. Leer sin distracciones"
        placeholderTextColor={theme.isLight ? light.muted : '#75798B'}
        style={[styles.input, theme.isLight && lightStyles.input]}
      />

      <Text style={[styles.label, theme.isLight && lightStyles.label]}>
        Medición
      </Text>
      <View style={styles.chips}>
        {(
          [
            ['duration', 'Minutos'],
            ['count', 'Veces'],
            ['boolean', 'Sí / no'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setType(value)}
            style={[
              styles.chip,
              theme.isLight && lightStyles.chip,
              type === value && styles.chipActive,
              theme.isLight && type === value && lightStyles.chipActive,
            ]}
          >
            <Text
              style={[styles.chipText, theme.isLight && lightStyles.chipText]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {type !== 'boolean' && (
        <>
          <Text style={[styles.label, theme.isLight && lightStyles.label]}>
            Objetivo
          </Text>
          <TextInput
            value={target}
            keyboardType="decimal-pad"
            onChangeText={setTarget}
            placeholderTextColor={theme.isLight ? light.muted : '#75798B'}
            style={[styles.input, theme.isLight && lightStyles.input]}
          />
        </>
      )}

      <Text style={[styles.label, theme.isLight && lightStyles.label]}>
        Frecuencia
      </Text>
      <View style={styles.chips}>
        {(
          [
            ['daily', 'Cada día'],
            ['weekly', 'Cada semana'],
            ['once', 'Solo un día'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setFrequency(value)}
            style={[
              styles.chip,
              theme.isLight && lightStyles.chip,
              frequency === value && styles.chipActive,
              theme.isLight && frequency === value && lightStyles.chipActive,
            ]}
          >
            <Text
              style={[styles.chipText, theme.isLight && lightStyles.chipText]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <GoalReminderPicker value={reminderTime} onChange={setReminderTime} />

      <Pressable
        style={[styles.save, theme.isLight && lightStyles.save]}
        onPress={save}
      >
        <Text style={[styles.saveText, theme.isLight && lightStyles.saveText]}>
          Crear meta
        </Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#C7C7CC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    backgroundColor: '#252525',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  chipActive: {
    borderWidth: 1,
    borderColor: '#555555',
    backgroundColor: '#303030',
  },
  chipText: {
    color: '#FAFAFA',
    fontSize: 14,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#202020',
    color: '#FAFAFA',
    paddingHorizontal: 13,
    fontSize: 15,
  },
  save: {
    marginTop: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
  },
  saveText: {
    color: '#0E0E0F',
    fontWeight: '700',
    fontSize: 15,
  },
});

const lightStyles = StyleSheet.create({
  label: {
    color: light.accent,
  },
  chip: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  chipActive: {
    borderColor: light.accent,
    backgroundColor: light.chipActive,
  },
  chipText: {
    color: light.text,
  },
  input: {
    backgroundColor: light.surface,
    color: light.text,
    borderWidth: 1,
    borderColor: light.border,
  },
  save: { backgroundColor: light.text },
  saveText: { color: '#FFFFFF' },
});
