import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import {
  Category,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../../db/repositories/categories';
import {
  createTimeBlock,
  deleteTimeBlock,
  deleteTimeBlockOccurrence,
  listBlocksForDate,
  TimeBlockWithCategory,
  updateTimeBlock,
} from '../../../db/repositories/timeBlocks';
import {
  ensureNotificationPermission,
  getReminderPermissionStatus,
  nextDateForBlock,
  openExactAlarmSettings,
  openNotificationPermissionSettings,
  rescheduleActivityReminders,
  scheduleActivityReminder,
} from '../../../services/notifications';
import { findGoalTitleForCategory } from '../../../db/repositories/goals';
import { getSetting, setSetting } from '../../../db/repositories/settings';
import {
  doIntervalsOverlap,
  normalizeTimeString,
} from '../utils/timeValidation';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';

const COLORS = [
  '#A78BFA',
  '#64D9A0',
  '#F2A93B',
  '#E85D75',
  '#58BDEB',
  '#E39CE9',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#FB7185',
  '#A3E635',
  '#2DD4BF',
  '#38BDF8',
  '#818CF8',
  '#C084FC',
  '#F0ABFC',
  '#FDA4AF',
];
const EMOJIS = [
  '📚',
  '💼',
  '🏃',
  '🧘',
  '🍽️',
  '😴',
  '🎯',
  '🎨',
  '🧹',
  '💬',
  '🎮',
  '🩺',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
  date: string;
  suggestedStart?: string;
  suggestedEnd?: string;
};

const labelDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const [rawH = '00', rawM = '00'] = (value || '00:00').split(':');
  const [hour, setHour] = useState(rawH);
  const [minute, setMinute] = useState(rawM);

  useEffect(() => {
    const [h = '00', m = '00'] = (value || '00:00').split(':');
    setHour(h);
    setMinute(m);
  }, [value]);

  const commit = (hVal: string, mVal: string) => {
    const h = parseInt(hVal, 10);
    const m = parseInt(mVal, 10);
    const normH = isNaN(h)
      ? '00'
      : String(Math.min(23, Math.max(0, h))).padStart(2, '0');
    const normM = isNaN(m)
      ? '00'
      : String(Math.min(59, Math.max(0, m))).padStart(2, '0');
    setHour(normH);
    setMinute(normM);
    onChange(`${normH}:${normM}`);
  };

  return (
    <View style={[styles.timeField, theme.isLight && lightStyles.timeField]}>
      <TextInput
        value={hour}
        onChangeText={val => {
          const digits = val.replace(/\D/g, '').slice(0, 2);
          setHour(digits);
          onChange(`${digits.padStart(2, '0')}:${minute.padStart(2, '0')}`);
        }}
        onBlur={() => commit(hour, minute)}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="00"
        placeholderTextColor={theme.isLight ? "#8A8474" : "#75798B"}
        style={[styles.timePart, theme.isLight && lightStyles.timePart]}
      />
      <Text style={[styles.colon, theme.isLight && lightStyles.colon]}>:</Text>
      <TextInput
        value={minute}
        onChangeText={val => {
          const digits = val.replace(/\D/g, '').slice(0, 2);
          setMinute(digits);
          onChange(`${hour.padStart(2, '0')}:${digits.padStart(2, '0')}`);
        }}
        onBlur={() => commit(hour, minute)}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="00"
        placeholderTextColor={theme.isLight ? "#8A8474" : "#75798B"}
        style={[styles.timePart, theme.isLight && lightStyles.timePart]}
      />
    </View>
  );
}

export function PlanManager({
  visible,
  onClose,
  onChanged,
  date,
  suggestedStart = '08:00',
  suggestedEnd = '09:00',
}: Props) {
  const theme = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [blocks, setBlocks] = useState<TimeBlockWithCategory[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [selected, setSelected] = useState('');
  const [start, setStart] = useState(suggestedStart);
  const [end, setEnd] = useState(suggestedEnd);
  const [recurring, setRecurring] = useState(false);
  const [editingBlock, setEditingBlock] =
    useState<TimeBlockWithCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [storedCategories, storedBlocks] = await Promise.all([
      listCategories(),
      listBlocksForDate(date),
    ]);
    setCategories(storedCategories);
    setBlocks(storedBlocks);
    setSelected(current => current || storedCategories[0]?.id || current);
  }, [date]);

  useEffect(() => {
    if (visible) {
      setStart(suggestedStart);
      setEnd(suggestedEnd);
      load();
    }
  }, [visible, suggestedStart, suggestedEnd, load]);

  const addCategory = async () => {
    if (!name.trim()) return;
    const item = await createCategory(name, color, emoji);
    setName('');
    setSelected(item.id);
    await load();
    onChanged();
  };

  const saveBlock = async (startTime = start, endTime = end) => {
    if (saving) return;
    setSaving(true);
    try {
      const id = await createTimeBlock({
        categoryId: selected,
        startTime,
        endTime,
        date,
        recurring,
      });
      const categoryName =
        categories.find(item => item.id === selected)?.name ?? 'Actividad';
      const goalTitle = await findGoalTitleForCategory(selected);
      try {
        const allowed = await ensureNotificationPermission();
        if (!allowed) {
          Alert.alert(
            'Activa las notificaciones',
            'La actividad se guardó, pero necesitas permitir notificaciones para recibir el aviso.',
            [
              { text: 'Ahora no', style: 'cancel' },
              {
                text: 'Abrir ajustes',
                onPress: openNotificationPermissionSettings,
              },
            ],
          );
        } else {
          const reminderDate = recurring
            ? nextDateForBlock({
                schedule_date: null,
                is_recurring: 1,
                day_of_week: new Date(`${date}T12:00:00`).getDay(),
                start_time: startTime,
              })
            : date;
          await scheduleActivityReminder({
            id,
            title: categoryName,
            date: reminderDate,
            startTime,
            goalTitle,
            recurring,
          });
          const status = await getReminderPermissionStatus();
          if (
            Platform.OS === 'android' &&
            !status.exactAlarms &&
            (await getSetting('exact_alarm_prompted')) !== '1'
          ) {
            await setSetting('exact_alarm_prompted', '1');
            Alert.alert(
              'Permite alarmas exactas',
              'Para avisarte justo a tiempo, permite las alarmas exactas en los ajustes del sistema.',
              [
                { text: 'Ahora no', style: 'cancel' },
                { text: 'Abrir ajustes', onPress: openExactAlarmSettings },
              ],
            );
          }
        }
      } catch (error) {
        console.warn('No se pudo programar el recordatorio:', error);
      }
      await load();
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const addBlock = async () => {
    const normStart = normalizeTimeString(start);
    const normEnd = normalizeTimeString(end);
    setStart(normStart);
    setEnd(normEnd);
    if (
      !selected ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(normStart) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(normEnd) ||
      normStart === normEnd
    ) {
      Alert.alert(
        'Revisa el horario',
        'Usa horas válidas y distintas, por ejemplo 09:00 a 10:30 o 22:00 a 02:00 para rangos que cruzan medianoche.',
      );
      return;
    }
    const clash = blocks.find(block =>
      doIntervalsOverlap(normStart, normEnd, block.start_time, block.end_time),
    );
    if (clash) {
      Alert.alert(
        'Horario ocupado',
        `A las ${clash.start_time} ya tienes “${clash.category_name}”. ¿Quieres guardar ambas actividades?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Guardar de todos modos',
            onPress: () => saveBlock(normStart, normEnd),
          },
        ],
      );
      return;
    }
    await saveBlock(normStart, normEnd);
  };

  const beginEditBlock = (block: TimeBlockWithCategory) => {
    setEditingBlock(block);
    setSelected(block.category_id);
    setStart(block.start_time);
    setEnd(block.end_time);
    setRecurring(Boolean(block.is_recurring));
  };

  const saveEditBlock = async (scope: 'day' | 'all') => {
    if (!editingBlock) return;
    const normStart = normalizeTimeString(start);
    const normEnd = normalizeTimeString(end);
    setStart(normStart);
    setEnd(normEnd);
    if (
      !selected ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(normStart) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(normEnd) ||
      normStart === normEnd
    ) {
      Alert.alert('Revisa el horario', 'Usa horas válidas y distintas.');
      return;
    }
    await updateTimeBlock({
      id: editingBlock.id,
      categoryId: selected,
      startTime: normStart,
      endTime: normEnd,
      date,
      recurring:
        scope === 'day' ? Boolean(editingBlock.is_recurring) : recurring,
      scope,
    });
    try {
      await rescheduleActivityReminders();
    } catch (error) {
      console.warn('No se pudieron actualizar los recordatorios:', error);
    }
    setEditingBlock(null);
    await load();
    onChanged();
  };

  const beginEditCategory = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setEmoji(category.emoji || EMOJIS[0]);
  };

  const saveCategoryEdit = async () => {
    if (!editingCategory || !name.trim()) return;
    await updateCategory(editingCategory.id, name, color, emoji);
    await rescheduleActivityReminders();
    setEditingCategory(null);
    setName('');
    await load();
    onChanged();
  };

  const suggestions = (() => {
    const slots: { start: string; end: string }[] = [];
    let cursor = 6 * 60;
    blocks
      .filter(block => block.start_time < block.end_time)
      .map(block => ({
        start:
          Number(block.start_time.slice(0, 2)) * 60 +
          Number(block.start_time.slice(3)),
        end:
          Number(block.end_time.slice(0, 2)) * 60 +
          Number(block.end_time.slice(3)),
      }))
      .sort((a, b) => a.start - b.start)
      .forEach(item => {
        if (item.start - cursor >= 30) {
          slots.push({
            start: `${String(Math.floor(cursor / 60)).padStart(
              2,
              '0',
            )}:${String(cursor % 60).padStart(2, '0')}`,
            end: `${String(Math.floor(item.start / 60)).padStart(
              2,
              '0',
            )}:${String(item.start % 60).padStart(2, '0')}`,
          });
        }
        cursor = Math.max(cursor, item.end);
      });
    if (18 * 60 - cursor >= 30) {
      slots.push({
        start: `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(
          cursor % 60,
        ).padStart(2, '0')}`,
        end: '18:00',
      });
    }
    return slots.slice(0, 5);
  })();

  return (
    <AppModal visible={visible} title="Planificar" onClose={onClose}>
      <View style={[styles.date, theme.isLight && lightStyles.date]}>
        <Text style={[styles.dateOverline, theme.isLight && lightStyles.dateOverline]}>PLAN DEL DÍA</Text>
        <Text style={[styles.dateText, theme.isLight && lightStyles.dateText]}>{labelDate(date)}</Text>
      </View>
      <Text style={[styles.label, theme.isLight && lightStyles.label]}>Categorías</Text>
      <View style={styles.categories}>
        {categories.map(category => (
          <Pressable
            key={category.id}
            onPress={() => setSelected(category.id)}
            style={[
              styles.category,
              theme.isLight && lightStyles.category,
              selected === category.id && styles.categoryActive,
              selected === category.id &&
                theme.isLight &&
                lightStyles.categoryActive,
            ]}
          >
            <Text>{category.emoji || '•'}</Text>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <Text numberOfLines={1} style={[styles.categoryText, theme.isLight && lightStyles.categoryText]}>
              {category.name}
            </Text>
            <Pressable
              accessibilityLabel={`Editar ${category.name}`}
              onPress={() => beginEditCategory(category)}
            >
              <Text style={[styles.edit, theme.isLight && lightStyles.edit]}>✎</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert(
                  'Eliminar categoría',
                  'Se eliminarán sus actividades y metas.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteCategory(category.id);
                        await rescheduleActivityReminders();
                        await load();
                        onChanged();
                      },
                    },
                  ],
                )
              }
            >
              <Text style={[styles.remove, theme.isLight && lightStyles.remove]}>×</Text>
            </Pressable>
          </Pressable>
        ))}
      </View>
      <View style={styles.inline}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={
            editingCategory ? 'Nombre de categoría' : 'Nueva categoría'
          }
          placeholderTextColor={theme.isLight ? "#8A8474" : "#75798B"}
          style={[styles.input, theme.isLight && lightStyles.input]}
        />
        <Pressable
          style={styles.add}
          onPress={editingCategory ? saveCategoryEdit : addCategory}
        >
          <Text style={styles.addText}>
            {editingCategory ? 'Guardar' : 'Añadir'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colors}
      >
        {COLORS.map(item => (
          <Pressable
            key={item}
            onPress={() => setColor(item)}
            style={[
              styles.color,
              { backgroundColor: item },
              color === item && styles.colorSelected,
              color === item && theme.isLight && lightStyles.colorSelected,
            ]}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.emojis}
      >
        {EMOJIS.map(item => (
          <Pressable
            key={item}
            onPress={() => setEmoji(item)}
            style={[styles.emoji, theme.isLight && lightStyles.emoji, emoji === item && styles.emojiSelected, emoji === item && theme.isLight && lightStyles.emojiSelected]}
          >
            <Text>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[styles.divider, theme.isLight && lightStyles.divider]} />
      <Text style={[styles.label, theme.isLight && lightStyles.label]}>Nueva actividad</Text>
      <Text style={[styles.help, theme.isLight && lightStyles.help]}>
        Elige la categoría y el horario para este día.
      </Text>
      <View style={styles.timeRow}>
        <View>
          <Text style={[styles.timeLabel, theme.isLight && lightStyles.timeLabel]}>Inicio</Text>
          <TimeField value={start} onChange={setStart} />
        </View>
        <Text style={[styles.to, theme.isLight && lightStyles.to]}>a</Text>
        <View>
          <Text style={[styles.timeLabel, theme.isLight && lightStyles.timeLabel]}>Fin</Text>
          <TimeField value={end} onChange={setEnd} />
        </View>
      </View>
      <Text style={[styles.timeLabel, theme.isLight && lightStyles.timeLabel]}>Horas libres sugeridas</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timeChoices}
      >
        {suggestions.map(slot => (
          <Pressable
            key={`${slot.start}-${slot.end}`}
            onPress={() => {
              setStart(slot.start);
              setEnd(slot.end);
            }}
            style={[styles.suggestion, theme.isLight && lightStyles.suggestion]}
          >
            <Text style={[styles.timeChoiceText, theme.isLight && lightStyles.timeChoiceText]}>
              {slot.start}–{slot.end}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        style={styles.saveActivity}
        onPress={
          editingBlock
            ? () => {
                if (editingBlock.is_recurring) {
                  Alert.alert(
                    '¿Dónde aplicarlo?',
                    'Elige si el cambio solo afecta este día o todas las semanas.',
                    [
                      {
                        text: 'Solo este día',
                        onPress: () => saveEditBlock('day'),
                      },
                      {
                        text: 'Todas las semanas',
                        onPress: () => saveEditBlock('all'),
                      },
                      { text: 'Cancelar', style: 'cancel' },
                    ],
                  );
                } else {
                  saveEditBlock('day');
                }
              }
            : addBlock
        }
      >
        <Text style={styles.addText}>
          {editingBlock ? 'Guardar cambios' : 'Guardar actividad'}
        </Text>
      </Pressable>
      <View style={[styles.repeat, theme.isLight && lightStyles.repeat]}>
        <View>
          <Text style={[styles.repeatTitle, theme.isLight && lightStyles.repeatTitle]}>Repetir cada semana</Text>
          <Text style={[styles.help, theme.isLight && lightStyles.help]}>Se repetirá este mismo día y horario.</Text>
        </View>
        <Switch
          value={recurring}
          onValueChange={setRecurring}
          trackColor={{ false: '#3A3F50', true: '#8066AA' }}
          thumbColor={recurring ? '#CDB7F2' : '#BAC0CE'}
        />
      </View>
      <Text style={[styles.label, theme.isLight && lightStyles.label]}>Actividades de este día</Text>
      {blocks.length === 0 ? (
        <Text style={[styles.none, theme.isLight && lightStyles.none]}>Todavía no hay actividades programadas.</Text>
      ) : (
        blocks.map(block => (
          <View key={block.id} style={[styles.block, theme.isLight && lightStyles.block]}>
            <View
              style={[styles.dot, { backgroundColor: block.category_color }]}
            />
            <Text style={[styles.blockText, theme.isLight && lightStyles.blockText]}>
              {block.start_time}–{block.end_time} · {block.category_name}
              {block.is_recurring ? ' · semanal' : ''}
            </Text>
            <Pressable
              accessibilityLabel="Editar actividad"
              onPress={() => beginEditBlock(block)}
            >
              <Text style={[styles.edit, theme.isLight && lightStyles.edit]}>✎</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const remove = async (scope: 'day' | 'all') => {
                  if (scope === 'all') await deleteTimeBlock(block.id);
                  else
                    await deleteTimeBlockOccurrence(
                      block.id,
                      date,
                      Boolean(block.is_recurring),
                    );
                  await rescheduleActivityReminders();
                  await load();
                  onChanged();
                };
                if (block.is_recurring) {
                  Alert.alert(
                    'Eliminar actividad semanal',
                    '¿Eliminar solo esta ocurrencia o toda la serie?',
                    [
                      { text: 'Solo este día', onPress: () => remove('day') },
                      {
                        text: 'Toda la serie',
                        style: 'destructive',
                        onPress: () => remove('all'),
                      },
                      { text: 'Cancelar', style: 'cancel' },
                    ],
                  );
                } else {
                  remove('all');
                }
              }}
            >
              <Text style={[styles.remove, theme.isLight && lightStyles.remove]}>×</Text>
            </Pressable>
          </View>
        ))
      )}
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
  },
  date: { backgroundColor: '#202433', borderRadius: 13, padding: 12, gap: 3 },
  dateOverline: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dateText: {
    color: '#F4F3F8',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  help: { color: '#9DA2B3', fontSize: 13, marginTop: -7 },
  categories: { gap: 8 },
  category: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#202433',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  categoryActive: { borderWidth: 1, borderColor: '#A78BFA' },
  categoryText: { flex: 1, color: '#EFF0F5', fontSize: 14 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  remove: { color: '#A6A9B7', fontSize: 23, lineHeight: 23 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: '#202433',
    borderRadius: 12,
    color: '#F8F7FB',
    paddingHorizontal: 13,
  },
  to: { color: '#A6A9B7' },
  add: {
    backgroundColor: '#A78BFA',
    paddingHorizontal: 13,
    height: 46,
    justifyContent: 'center',
    borderRadius: 12,
  },
  addText: { color: '#171421', fontWeight: '800', fontSize: 13 },
  colors: { flexDirection: 'row', gap: 12 },
  color: { width: 25, height: 25, borderRadius: 13 },
  colorSelected: { borderWidth: 3, borderColor: '#F8F7FB' },
  divider: { height: 1, backgroundColor: '#282C3C', marginVertical: 5 },
  repeat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C202D',
    borderRadius: 12,
    padding: 12,
  },
  repeatTitle: { color: '#E8E9EE', fontWeight: '700', fontSize: 14 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#1C202D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  blockText: { color: '#E5E6EB', flex: 1, fontSize: 14 },
  none: { color: '#858B9B', fontSize: 13 },
  emojis: { flexDirection: 'row', gap: 8 },
  emoji: { padding: 7, borderRadius: 9, backgroundColor: '#202433' },
  emojiSelected: { borderWidth: 1, borderColor: '#A78BFA' },
  edit: { color: '#C9B6E8', fontSize: 19, lineHeight: 22 },
  timeLabel: { color: '#B9C0D0', fontSize: 12, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202433',
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 46,
    marginTop: 5,
  },
  timePart: {
    width: 29,
    color: '#F8F7FB',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  colon: { color: '#A78BFA', fontSize: 18, fontWeight: '900' },
  timeChoices: { flexDirection: 'row', gap: 7 },
  suggestion: {
    backgroundColor: '#253A36',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeChoiceText: { color: '#E8E9EE', fontSize: 12 },
  saveActivity: {
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
  },
});

const lightStyles = StyleSheet.create({
  label: { color: light.accent },
  date: { backgroundColor: light.surfaceMuted },
  dateOverline: { color: light.accent },
  dateText: { color: light.text },
  help: { color: light.muted },
  category: { backgroundColor: light.surfaceMuted },
  categoryActive: { borderColor: light.accent },
  categoryText: { color: light.text },
  remove: { color: light.muted },
  input: { backgroundColor: light.input, color: light.text },
  colorSelected: { borderColor: light.text },
  divider: { backgroundColor: light.border },
  repeat: {
    backgroundColor: light.surface,
    borderWidth: 1,
    borderColor: light.border,
  },
  repeatTitle: { color: light.text },
  block: { backgroundColor: light.surfaceMuted },
  blockText: { color: light.text },
  none: { color: light.muted },
  emoji: { backgroundColor: light.surfaceMuted },
  emojiSelected: { borderColor: light.accent },
  edit: { color: light.accent },
  timeLabel: { color: light.muted },
  to: { color: light.muted },
  timeField: { backgroundColor: light.surfaceMuted },
  timePart: { color: light.text },
  colon: { color: light.accent },
  suggestion: { backgroundColor: '#E4EFE8' },
  timeChoiceText: { color: light.textSecondary },
});
