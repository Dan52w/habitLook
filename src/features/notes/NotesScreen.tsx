import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Category, listCategories } from '../../db/repositories/categories';
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  Note,
} from '../../db/repositories/notes';
import {
  listBlocksForDate,
  TimeBlockWithCategory,
} from '../../db/repositories/timeBlocks';
import { MiniCalendar } from '../clock/components/MiniCalendar';
import { dateFromKey, localDateKey } from '../../shared/utils/date';
import { useFocusEffect } from '@react-navigation/native';
import { light, useTheme } from '../../shared/theme/ThemeProvider';
import { useAppDialog } from '../../shared/context/DialogContext';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { FirstTimeTip, TipText } from '../../shared/components/FirstTimeTip';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  cancelNoteReminder,
  scheduleNoteReminder,
} from '../../services/notifications';

const toLocalIsoMinutes = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
};

const formatReminderAt = (iso: string) => {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  const date = d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  return `${date}, ${time}`;
};

const today = () => localDateKey();

const formatNoteDate = (note: Note) => {
  if (note.note_date) {
    try {
      return dateFromKey(note.note_date).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
      });
    } catch {}
  }
  if (note.created_at) {
    try {
      const parsed = new Date(note.created_at.replace(' ', 'T') + 'Z');
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'short',
        });
      }
    } catch {}
  }
  return 'Sin fecha';
};

export function NotesScreen() {
  const theme = useTheme();
  const { showConfirm } = useAppDialog();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [blocks, setBlocks] = useState<TimeBlockWithCategory[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | undefined>();
  const [timeBlockId, setTimeBlockId] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState(today());
  const [allDates, setAllDates] = useState(false);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const load = useCallback(async () => {
    const isGlobal = allDates || search.trim().length > 0;
    const loadedNotes = await listNotes(
      search,
      filter,
      isGlobal ? undefined : selectedDate,
    );
    setNotes(loadedNotes);
  }, [search, filter, selectedDate, allDates]);

  const loadContext = useCallback(() => {
    Promise.all([listCategories(), listBlocksForDate(selectedDate)])
      .then(([items, selectedBlocks]) => {
        setCategories(items);
        setBlocks(selectedBlocks);
        setTimeBlockId(undefined);
      })
      .catch(() => undefined);
  }, [selectedDate]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useFocusEffect(
    useCallback(() => {
      loadContext();
      load();
    }, [loadContext, load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const reminderStr = reminderAt ? toLocalIsoMinutes(reminderAt) : null;
      if (editingId) {
        await updateNote(editingId, text, reminderStr);
        if (reminderStr) {
          await scheduleNoteReminder({
            id: editingId,
            text: text.trim(),
            reminder_at: reminderStr,
          }).catch(() => undefined);
        } else {
          await cancelNoteReminder(editingId).catch(() => undefined);
        }
        setEditingId(null);
      } else {
        const linkedBlock = blocks.find(block => block.id === timeBlockId);
        const noteId = await createNote(
          text,
          linkedBlock?.category_id ?? filter,
          timeBlockId,
          selectedDate,
          reminderStr,
        );
        if (reminderStr) {
          await scheduleNoteReminder({
            id: noteId,
            text: text.trim(),
            reminder_at: reminderStr,
          }).catch(() => undefined);
        }
      }
      setText('');
      setTimeBlockId(undefined);
      setReminderAt(null);
      setCalendarRevision(value => value + 1);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const beginEditNote = (note: Note) => {
    setEditingId(note.id);
    setText(note.text);
    setTimeBlockId(note.time_block_id ?? undefined);
    setReminderAt(note.reminder_at ? new Date(note.reminder_at) : null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText('');
    setTimeBlockId(undefined);
    setReminderAt(null);
  };

  const handleDeleteNote = (noteId: string) => {
    showConfirm({
      title: 'Eliminar nota',
      message: '¿Estás seguro de que deseas borrar esta nota?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        await deleteNote(noteId);
        await cancelNoteReminder(noteId).catch(() => undefined);
        await load();
      },
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, theme.isLight && lightStyles.container]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader eyebrow="NOTAS" title="Ideas que no se escapan" />

        <View style={styles.dateSelectorRow}>
          <Pressable
            onPress={() => setCalendarOpen(open => !open)}
            style={[
              styles.dateSelector,
              theme.isLight && lightStyles.dateSelector,
              allDates && styles.dateSelectorDisabled,
            ]}
          >
            <View>
              <Text
                style={[
                  styles.dateLabel,
                  theme.isLight && lightStyles.dateLabel,
                ]}
              >
                {selectedDate === today() ? 'HOY' : 'DÍA ELEGIDO'}
              </Text>
              <Text
                style={[
                  styles.dateValue,
                  theme.isLight && lightStyles.dateValue,
                ]}
              >
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                  'es-CO',
                  {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  },
                )}
              </Text>
            </View>
            <Text
              style={[styles.chevron, theme.isLight && lightStyles.chevron]}
            >
              {calendarOpen ? '⌃' : '⌄'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAllDates(prev => !prev)}
            style={[
              styles.allDatesToggle,
              theme.isLight && lightStyles.allDatesToggle,
              allDates && styles.allDatesToggleActive,
              theme.isLight && allDates && lightStyles.allDatesToggleActive,
            ]}
          >
            <Text
              style={[
                styles.allDatesText,
                theme.isLight && lightStyles.allDatesText,
                allDates && styles.allDatesTextActive,
                theme.isLight && allDates && lightStyles.allDatesTextActive,
              ]}
            >
              {allDates ? 'Todas' : 'Por día'}
            </Text>
          </Pressable>
        </View>

        {calendarOpen && !allDates && (
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            refreshKey={calendarRevision}
          />
        )}

        <View style={[styles.composer, theme.isLight && lightStyles.composer]}>
          {editingId && (
            <View style={styles.editingBar}>
              <Text style={styles.editingText}>Editando nota</Text>
              <Pressable onPress={cancelEdit} hitSlop={10}>
                <Text style={styles.editingCancel}>Cancelar</Text>
              </Pressable>
            </View>
          )}
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder={
              editingId ? 'Edita tu nota…' : 'Escribe una nota rápida…'
            }
            placeholderTextColor={theme.isLight ? light.muted : '#777C8E'}
            style={[styles.textarea, theme.isLight && lightStyles.textarea]}
          />

          <Text
            style={[
              styles.associationLabel,
              theme.isLight && lightStyles.associationLabel,
            ]}
          >
            Asociar a planificación · opcional
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.planChips}
          >
            <Pressable
              onPress={() => setTimeBlockId(undefined)}
              style={[
                styles.planChip,
                theme.isLight && lightStyles.planChip,
                !timeBlockId && styles.planChipActive,
                theme.isLight && !timeBlockId && lightStyles.planChipActive,
              ]}
            >
              <Text
                style={[
                  styles.planChipText,
                  theme.isLight && lightStyles.planChipText,
                  !timeBlockId &&
                    theme.isLight &&
                    lightStyles.planChipTextActive,
                ]}
              >
                Sin asociación
              </Text>
            </Pressable>
            {blocks.map(block => (
              <Pressable
                key={block.id}
                onPress={() => setTimeBlockId(block.id)}
                style={[
                  styles.planChip,
                  theme.isLight && lightStyles.planChip,
                  timeBlockId === block.id && styles.planChipActive,
                  theme.isLight &&
                    timeBlockId === block.id &&
                    lightStyles.planChipActive,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: block.category_color },
                  ]}
                />
                <Text
                  style={[
                    styles.planChipText,
                    theme.isLight && lightStyles.planChipText,
                    timeBlockId === block.id &&
                      theme.isLight &&
                      lightStyles.planChipTextActive,
                  ]}
                >
                  {block.start_time} · {block.category_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.reminderRow}>
            <Pressable
              onPress={() => setShowReminderPicker(true)}
              style={[
                styles.planChip,
                theme.isLight && lightStyles.planChip,
                reminderAt && styles.planChipActive,
                theme.isLight && reminderAt && lightStyles.planChipActive,
              ]}
            >
              <Text
                style={[
                  styles.planChipText,
                  theme.isLight && lightStyles.planChipText,
                ]}
              >
                {reminderAt
                  ? `🔔 ${formatReminderAt(toLocalIsoMinutes(reminderAt))}`
                  : '🔔 Avísame de esta nota'}
              </Text>
            </Pressable>
            {reminderAt && (
              <Pressable onPress={() => setReminderAt(null)} hitSlop={10}>
                <Text
                  style={[
                    styles.reminderClear,
                    theme.isLight && lightStyles.reminderClear,
                  ]}
                >
                  Quitar
                </Text>
              </Pressable>
            )}
          </View>
          {showReminderPicker && (
            <DateTimePicker
              value={reminderAt ?? new Date(Date.now() + 60 * 60_000)}
              mode="datetime"
              is24Hour
              minimumDate={new Date()}
              display="default"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowReminderPicker(false);
                if (event.type === 'dismissed' || !date) return;
                setReminderAt(date);
              }}
            />
          )}

          <Pressable
            onPress={save}
            style={[
              styles.save,
              theme.isLight && lightStyles.save,
              saving && styles.saveDisabled,
            ]}
            disabled={saving}
          >
            <Text
              style={[styles.saveText, theme.isLight && lightStyles.saveText]}
            >
              {saving
                ? 'Guardando…'
                : editingId
                ? 'Guardar cambios'
                : 'Guardar nota'}
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar en todas tus notas"
          placeholderTextColor={theme.isLight ? light.muted : '#777C8E'}
          style={[styles.search, theme.isLight && lightStyles.search]}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Pressable
            onPress={() => setFilter(undefined)}
            style={[
              styles.filter,
              theme.isLight && lightStyles.filter,
              !filter && styles.filterActive,
              theme.isLight && !filter && lightStyles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                theme.isLight && lightStyles.filterText,
                !filter && theme.isLight && lightStyles.filterTextActive,
              ]}
            >
              Todas
            </Text>
          </Pressable>
          {categories.map(category => (
            <Pressable
              key={category.id}
              onPress={() =>
                setFilter(filter === category.id ? undefined : category.id)
              }
              style={[
                styles.filter,
                theme.isLight && lightStyles.filter,
                filter === category.id && styles.filterActive,
                theme.isLight &&
                  filter === category.id &&
                  lightStyles.filterActive,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <Text
                style={[
                  styles.filterText,
                  theme.isLight && lightStyles.filterText,
                  filter === category.id &&
                    theme.isLight &&
                    lightStyles.filterTextActive,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {notes.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Todavía no hay notas"
            message="Escribe arriba tu primera idea. Puedes vincularla a una actividad planificada o dejarla libre."
          />
        ) : (
          notes.map(note => (
            <View
              key={note.id}
              style={[styles.note, theme.isLight && lightStyles.note]}
            >
              <View style={styles.noteHeader}>
                {note.category_name ? (
                  <View style={styles.category}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: note.category_color ?? '#6B7280' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        theme.isLight && lightStyles.categoryText,
                      ]}
                    >
                      {note.category_name}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[styles.date, theme.isLight && lightStyles.date]}
                  >
                    {formatNoteDate(note)}
                  </Text>
                )}
                <View style={styles.noteActions}>
                  <Pressable hitSlop={10} onPress={() => beginEditNote(note)}>
                    <Text style={styles.edit}>Editar</Text>
                  </Pressable>
                  <Pressable
                    hitSlop={10}
                    onPress={() => handleDeleteNote(note.id)}
                  >
                    <Text style={styles.delete}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>

              <Text
                style={[styles.noteText, theme.isLight && lightStyles.noteText]}
              >
                {note.text}
              </Text>

              {note.time_block_id && (
                <View
                  style={[styles.linked, theme.isLight && lightStyles.linked]}
                >
                  <Text
                    style={[
                      styles.linkedText,
                      theme.isLight && lightStyles.linkedText,
                    ]}
                  >
                    Plan: {note.block_start_time}–{note.block_end_time}
                  </Text>
                </View>
              )}

              {note.reminder_at && (
                <Text
                  style={[
                    styles.reminderSet,
                    theme.isLight && lightStyles.reminderSet,
                  ]}
                >
                  🔔 {formatReminderAt(note.reminder_at)}
                </Text>
              )}

              <Text style={[styles.date, theme.isLight && lightStyles.date]}>
                {formatNoteDate(note)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <FirstTimeTip tipKey="notas" icon="📝" title="Ideas que no se escapan">
        <TipText>Escribe cualquier idea rápida, sin formato ni complicaciones.</TipText>
        <TipText>
          Si quieres, puedes pegarla a una actividad de tu día o ponerle un
          aviso para que te recuerde a una hora.
        </TipText>
      </FirstTimeTip>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0F' },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
    paddingBottom: 40,
  },
  dateSelectorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 18,
    padding: 16,
  },
  dateSelectorDisabled: { opacity: 0.6 },
  allDatesToggle: {
    backgroundColor: '#252525',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDatesToggleActive: {
    borderWidth: 1,
    borderColor: '#555555',
    backgroundColor: '#303030',
  },
  allDatesText: { color: '#A3A3A3', fontSize: 12, fontWeight: '600' },
  allDatesTextActive: { color: '#FAFAFA' },
  dateLabel: {
    color: '#A3A3A3',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  dateValue: {
    color: '#FAFAFA',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 3,
  },
  chevron: { color: '#A3A3A3', fontSize: 23 },
  composer: {
    backgroundColor: '#191919',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  textarea: {
    color: '#FAFAFA',
    minHeight: 72,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  associationLabel: { color: '#A3A3A3', fontSize: 11, fontWeight: '600' },
  planChips: { gap: 7 },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#252525',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  planChipActive: { borderWidth: 1, borderColor: '#555555', backgroundColor: '#303030' },
  planChipText: { color: '#C7C7CC', fontSize: 12 },
  save: {
    alignSelf: 'flex-end',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#0E0E0F', fontWeight: '700' },
  search: {
    height: 47,
    color: '#FAFAFA',
    borderRadius: 16,
    backgroundColor: '#191919',
    paddingHorizontal: 14,
  },
  filters: { gap: 8 },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    backgroundColor: '#252525',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterActive: { borderWidth: 1, borderColor: '#555555', backgroundColor: '#303030' },
  filterText: { color: '#C7C7CC', fontSize: 13 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  note: {
    backgroundColor: '#191919',
    borderRadius: 18,
    padding: 18,
    gap: 9,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  categoryText: { color: '#65D6C0', fontSize: 12, fontWeight: '600' },
  noteText: { color: '#FAFAFA', fontSize: 15, lineHeight: 21 },
  linked: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    backgroundColor: '#282828',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  linkedText: { color: '#C7C7CC', fontSize: 11, fontWeight: '600' },
  date: { color: '#A3A3A3', fontSize: 12 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderClear: { color: '#E895A4', fontSize: 12, fontWeight: '700' },
  reminderSet: { color: '#65D6C0', fontSize: 12, fontWeight: '600' },
  delete: { color: '#E895A4', fontSize: 12, fontWeight: '700' },
  edit: { color: '#C7C7CC', fontSize: 12, fontWeight: '600' },
  noteActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  editingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editingText: { color: '#FAFAFA', fontSize: 12, fontWeight: '600' },
  editingCancel: { color: '#E895A4', fontSize: 12, fontWeight: '700' },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  dateSelector: {
    backgroundColor: light.surface,
    borderWidth: 1,
    borderColor: light.border,
  },
  dateLabel: { color: light.accent },
  dateValue: { color: light.text },
  chevron: { color: light.muted },
  allDatesToggle: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  allDatesToggleActive: {
    backgroundColor: light.chipActive,
    borderColor: light.accent,
  },
  allDatesText: { color: light.muted },
  allDatesTextActive: { color: light.accent },
  composer: {
    backgroundColor: light.surface,
    borderWidth: 1,
    borderColor: light.border,
  },
  textarea: { color: light.text },
  save: { backgroundColor: light.text },
  saveText: { color: '#FFFFFF' },
  associationLabel: { color: light.muted },
  planChip: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  planChipActive: {
    borderColor: light.accent,
    backgroundColor: light.chipActive,
  },
  planChipText: { color: light.muted },
  planChipTextActive: { color: light.text, fontWeight: '700' },
  search: {
    backgroundColor: light.surface,
    color: light.text,
    borderWidth: 1,
    borderColor: light.border,
  },
  filter: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  filterActive: {
    borderColor: light.accent,
    backgroundColor: light.chipActive,
  },
  filterText: { color: light.muted },
  filterTextActive: { color: light.text, fontWeight: '700' },
  note: {
    backgroundColor: light.surface,
    borderWidth: 1,
    borderColor: light.border,
  },
  categoryText: { color: light.accent },
  noteText: { color: light.text },
  linked: {
    backgroundColor: light.surfaceMuted,
  },
  linkedText: { color: light.accent },
  date: { color: light.muted },
  reminderClear: { color: '#C05A6E' },
  reminderSet: { color: light.accent },
});
