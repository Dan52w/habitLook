import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  listBlocksForDates,
  TimeBlockWithCategory,
} from '../../../db/repositories/timeBlocks';
import { dateFromKey, localDateKey } from '../../../shared/utils/date';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const toKey = (date: Date) => localDateKey(date);

const startOfWeek = (date: Date) => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(12, 0, 0, 0);
  return start;
};

const formatLongDate = (date: Date) =>
  date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

type Props = {
  selectedDate: string;
  onSelect: (date: string) => void;
  refreshKey?: number;
};

export function MiniCalendar({
  selectedDate,
  onSelect,
  refreshKey = 0,
}: Props) {
  const theme = useTheme();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(dateFromKey(selectedDate)),
  );
  const [events, setEvents] = useState<Record<string, TimeBlockWithCategory[]>>(
    {},
  );

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return day;
    });
  }, [weekStart]);

  const load = useCallback(async () => {
    const dates = days.map(toKey);
    const allDates = dates.includes(selectedDate)
      ? dates
      : [...dates, selectedDate];
    const result = await listBlocksForDates(allDates);
    setEvents(result);
  }, [days, selectedDate]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const selected = dateFromKey(selectedDate);
    const start = startOfWeek(selected);
    setWeekStart(current =>
      current.getTime() === start.getTime() ? current : start,
    );
  }, [selectedDate]);

  const selectedEvents = events[selectedDate] ?? [];

  return (
    <View style={[styles.card, theme.isLight && lightStyles.card]}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            setWeekStart(current => {
              const next = new Date(current);
              next.setDate(current.getDate() - 7);
              return next;
            })
          }
        >
          <Text style={[styles.arrow, theme.isLight && lightStyles.arrow]}>
            ‹
          </Text>
        </Pressable>
        <View>
          <Text
            style={[styles.overline, theme.isLight && lightStyles.overline]}
          >
            CALENDARIO SEMANAL
          </Text>
          <Text style={[styles.range, theme.isLight && lightStyles.range]}>
            {formatLongDate(days[0])} — {formatLongDate(days[6])}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            setWeekStart(current => {
              const next = new Date(current);
              next.setDate(current.getDate() + 7);
              return next;
            })
          }
        >
          <Text style={[styles.arrow, theme.isLight && lightStyles.arrow]}>
            ›
          </Text>
        </Pressable>
      </View>

      <View style={styles.week}>
        {days.map((day, index) => {
          const key = toKey(day);
          const hasEvents = (events[key]?.length ?? 0) > 0;
          const selected = key === selectedDate;
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              style={[
                styles.day,
                selected && styles.selected,
                selected && theme.isLight && lightStyles.selected,
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  theme.isLight && lightStyles.dayName,
                  selected && styles.selectedText,
                  selected && theme.isLight && lightStyles.selectedText,
                ]}
              >
                {DAY_NAMES[index]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  theme.isLight && lightStyles.dayNumber,
                  selected && styles.selectedText,
                  selected && theme.isLight && lightStyles.selectedText,
                ]}
              >
                {day.getDate()}
              </Text>
              {hasEvents && (
                <View
                  style={[
                    styles.eventDot,
                    theme.isLight && lightStyles.eventDot,
                    selected && styles.eventDotSelected,
                    selected && theme.isLight && lightStyles.eventDotSelected,
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.list, theme.isLight && lightStyles.list]}>
        <Text style={[styles.listTitle, theme.isLight && lightStyles.listTitle]}>
          Plan de {formatLongDate(dateFromKey(selectedDate))}
        </Text>
        {selectedEvents.length === 0 ? (
          <Text style={[styles.empty, theme.isLight && lightStyles.empty]}>
            No hay actividades para este día.
          </Text>
        ) : (
          selectedEvents.map(event => (
            <View key={event.id} style={styles.event}>
              <View
                style={[
                  styles.color,
                  { backgroundColor: event.category_color },
                ]}
              />
              <Text
                style={[
                  styles.eventTime,
                  theme.isLight && lightStyles.eventTime,
                ]}
              >
                {event.start_time}–{event.end_time}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.eventName,
                  theme.isLight && lightStyles.eventName,
                ]}
              >
                {event.category_name}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161A25',
    borderRadius: 18,
    padding: 13,
    gap: 12,
    borderWidth: 1,
    borderColor: '#292E3D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrow: {
    color: '#C9B6E8',
    fontSize: 29,
    lineHeight: 30,
    paddingHorizontal: 5,
  },
  overline: {
    color: '#9B82C7',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
    textAlign: 'center',
  },
  range: {
    color: '#F0EFF5',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: '13.5%',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    gap: 2,
  },
  selected: { backgroundColor: '#A78BFA' },
  dayName: { color: '#949AAA', fontSize: 10, fontWeight: '700' },
  dayNumber: { color: '#E5E7EC', fontWeight: '800', fontSize: 15 },
  selectedText: { color: '#171421' },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#9D79D6',
    marginTop: 2,
  },
  eventDotSelected: { backgroundColor: '#171421' },
  list: { backgroundColor: '#1D2230', borderRadius: 12, padding: 10, gap: 7 },
  listTitle: {
    color: '#C9B6E8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  empty: { color: '#8990A1', fontSize: 12, paddingVertical: 3 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  color: { width: 7, height: 7, borderRadius: 4 },
  eventTime: { color: '#AAB0C0', fontSize: 12, fontVariant: ['tabular-nums'] },
  eventName: { color: '#EFF0F4', fontSize: 12, fontWeight: '600', flex: 1 },
});

const lightStyles = StyleSheet.create({
  card: { backgroundColor: light.surface, borderColor: light.border },
  arrow: { color: light.accent },
  overline: { color: light.accent },
  range: { color: light.text },
  selected: { backgroundColor: light.accent },
  dayName: { color: light.muted },
  dayNumber: { color: light.text },
  selectedText: { color: '#FFFFFF' },
  eventDot: { backgroundColor: light.accent },
  eventDotSelected: { backgroundColor: '#FFFFFF' },
  list: { backgroundColor: light.surfaceMuted },
  listTitle: { color: light.accent },
  empty: { color: light.muted },
  eventTime: { color: light.muted },
  eventName: { color: light.text },
});
