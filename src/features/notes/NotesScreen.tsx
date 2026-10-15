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
      if (editingId) {
        await updateNote(editingId, text);
        setEditingId(null);
      } else {
        const linkedBlock = blocks.find(block => block.id === timeBlockId);
        await createNote(
          text,
          linkedBlock?.category_id ?? filter,
          timeBlockId,
          selectedDate,
        );
      }
      setText('');
      setTimeBlockId(undefined);
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText('');
    setTimeBlockId(undefined);
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
        <Text style={[styles.eyebrow, theme.isLight && lightStyles.eyebrow]}>
          NOTAS
        </Text>
        <Text style={[styles.title, theme.isLight && lightStyles.title]}>
          Ideas que no se escapan
        </Text>

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

          <Pressable
            onPress={save}
            style={[styles.save, saving && styles.saveDisabled]}
            disabled={saving}
          >
            <Text style={styles.saveText}>
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
          <View style={styles.empty}>
            <Text
              style={[
                styles.emptyTitle,
                theme.isLight && lightStyles.emptyTitle,
              ]}
            >
              Todavía no hay notas
            </Text>
            <Text
              style={[styles.emptyText, theme.isLight && lightStyles.emptyText]}
            >
              Puedes vincularlas a una actividad planificada o dejarlas libres.
            </Text>
          </View>
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

              <Text style={[styles.date, theme.isLight && lightStyles.date]}>
                {formatNoteDate(note)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
    paddingBottom: 40,
  },
  eyebrow: {
    color: '#A78BFA',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '800',
  },
  title: { color: '#F8F7FB', fontSize: 23, fontWeight: '700', marginTop: -9 },
  dateSelectorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#171B27',
    borderRadius: 14,
    padding: 12,
  },
  dateSelectorDisabled: { opacity: 0.6 },
  allDatesToggle: {
    backgroundColor: '#202433',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDatesToggleActive: {
    borderWidth: 1,
    borderColor: '#A78BFA',
    backgroundColor: '#2A2342',
  },
  allDatesText: { color: '#8E94A5', fontSize: 12, fontWeight: '700' },
  allDatesTextActive: { color: '#D9C9F3' },
  dateLabel: {
    color: '#A78BFA',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
  },
  dateValue: {
    color: '#EDEEF3',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 3,
  },
  chevron: { color: '#C9B6E8', fontSize: 23 },
  composer: {
    backgroundColor: '#181B25',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  textarea: {
    color: '#F6F7FA',
    minHeight: 72,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  associationLabel: { color: '#AAB0C0', fontSize: 11, fontWeight: '700' },
  planChips: { gap: 7 },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 11,
    backgroundColor: '#252A39',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  planChipActive: { borderWidth: 1, borderColor: '#A78BFA' },
  planChipText: { color: '#E2E3E9', fontSize: 12 },
  save: {
    alignSelf: 'flex-end',
    backgroundColor: '#A78BFA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#171421', fontWeight: '800' },
  search: {
    height: 47,
    color: '#F6F7FA',
    borderRadius: 13,
    backgroundColor: '#1B1E29',
    paddingHorizontal: 14,
  },
  filters: { gap: 8 },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    backgroundColor: '#202433',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterActive: { borderWidth: 1, borderColor: '#A78BFA' },
  filterText: { color: '#DDE0E8', fontSize: 13 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  note: { backgroundColor: '#181B25', borderRadius: 16, padding: 15, gap: 9 },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  categoryText: { color: '#CFC4DF', fontSize: 12, fontWeight: '700' },
  noteText: { color: '#F2F3F6', fontSize: 15, lineHeight: 21 },
  linked: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    backgroundColor: '#2A3040',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  linkedText: { color: '#C9B6E8', fontSize: 11, fontWeight: '700' },
  date: { color: '#7C8192', fontSize: 12 },
  delete: { color: '#E895A4', fontSize: 12, fontWeight: '700' },
  edit: { color: '#C9B6E8', fontSize: 12, fontWeight: '700' },
  noteActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  editingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2440',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editingText: { color: '#C9B6E8', fontSize: 12, fontWeight: '700' },
  editingCancel: { color: '#E895A4', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyTitle: { color: '#ECEEF3', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#9298A9', textAlign: 'center', marginTop: 8 },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  eyebrow: { color: light.accent },
  title: { color: light.text },
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
    backgroundColor: '#EDE5F8',
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
  associationLabel: { color: light.muted },
  planChip: {
    backgroundColor: light.surfaceMuted,
    borderWidth: 1,
    borderColor: light.border,
  },
  planChipActive: {
    borderColor: light.accent,
    backgroundColor: '#ECE4F8',
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
    backgroundColor: '#ECE4F8',
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
  emptyTitle: { color: light.text },
  emptyText: { color: light.muted },
});
