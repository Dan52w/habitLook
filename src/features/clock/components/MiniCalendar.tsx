import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { listBlocksForDate, TimeBlockWithCategory } from '../../../db/repositories/timeBlocks';
import { dateFromKey, localDateKey } from '../../../shared/utils/date';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const toKey = (date: Date) => localDateKey(date);
const startOfWeek = (date: Date) => { const start = new Date(date); start.setDate(date.getDate() - date.getDay()); start.setHours(12, 0, 0, 0); return start; };
const longDate = (date: Date) => date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

export function MiniCalendar({ selectedDate, onSelect, refreshKey = 0 }: { selectedDate: string; onSelect: (date: string) => void; refreshKey?: number }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dateFromKey(selectedDate)));
  const [events, setEvents] = useState<Record<string, TimeBlockWithCategory[]>>({});
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const day = new Date(weekStart); day.setDate(weekStart.getDate() + index); return day; }), [weekStart]);
  const load = useCallback(async () => {
    const dates = days.map(toKey); const result = await Promise.all(dates.map(date => listBlocksForDate(date)));
    setEvents(Object.fromEntries(dates.map((date, index) => [date, result[index]])));
  }, [days]);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { const selected = dateFromKey(selectedDate); const start = startOfWeek(selected); setWeekStart(current => current.getTime() === start.getTime() ? current : start); }, [selectedDate]);
  const selectedEvents = events[selectedDate] ?? [];
  return <View style={styles.card}>
    <View style={styles.header}><Pressable onPress={() => setWeekStart(current => { const next = new Date(current); next.setDate(current.getDate() - 7); return next; })}><Text style={styles.arrow}>‹</Text></Pressable><View><Text style={styles.overline}>CALENDARIO SEMANAL</Text><Text style={styles.range}>{longDate(days[0])} — {longDate(days[6])}</Text></View><Pressable onPress={() => setWeekStart(current => { const next = new Date(current); next.setDate(current.getDate() + 7); return next; })}><Text style={styles.arrow}>›</Text></Pressable></View>
    <View style={styles.week}>{days.map((day, index) => { const key = toKey(day); const hasEvents = (events[key]?.length ?? 0) > 0; const selected = key === selectedDate; return <Pressable key={key} onPress={() => onSelect(key)} style={[styles.day, selected && styles.selected]}><Text style={[styles.dayName, selected && styles.selectedText]}>{DAY_NAMES[index]}</Text><Text style={[styles.dayNumber, selected && styles.selectedText]}>{day.getDate()}</Text>{hasEvents && <View style={[styles.eventDot, selected && styles.eventDotSelected]} />}</Pressable>; })}</View>
    <View style={styles.list}><Text style={styles.listTitle}>Plan de {longDate(dateFromKey(selectedDate))}</Text>{selectedEvents.length === 0 ? <Text style={styles.empty}>No hay actividades para este día.</Text> : selectedEvents.map(event => <View key={event.id} style={styles.event}><View style={[styles.color, { backgroundColor: event.category_color }]} /><Text style={styles.eventTime}>{event.start_time}–{event.end_time}</Text><Text numberOfLines={1} style={styles.eventName}>{event.category_name}</Text></View>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#161A25', borderRadius: 18, padding: 13, gap: 12, borderWidth: 1, borderColor: '#292E3D' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, arrow: { color: '#C9B6E8', fontSize: 29, lineHeight: 30, paddingHorizontal: 5 }, overline: { color: '#9B82C7', fontSize: 9, letterSpacing: 1, fontWeight: '800', textAlign: 'center' }, range: { color: '#F0EFF5', fontWeight: '700', textAlign: 'center', marginTop: 2, textTransform: 'capitalize' }, week: { flexDirection: 'row', justifyContent: 'space-between' }, day: { width: '13.5%', alignItems: 'center', borderRadius: 12, paddingVertical: 8, gap: 2 }, selected: { backgroundColor: '#A78BFA' }, dayName: { color: '#949AAA', fontSize: 10, fontWeight: '700' }, dayNumber: { color: '#E5E7EC', fontWeight: '800', fontSize: 15 }, selectedText: { color: '#171421' }, eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#9D79D6', marginTop: 2 }, eventDotSelected: { backgroundColor: '#171421' }, list: { backgroundColor: '#1D2230', borderRadius: 12, padding: 10, gap: 7 }, listTitle: { color: '#C9B6E8', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }, empty: { color: '#8990A1', fontSize: 12, paddingVertical: 3 }, event: { flexDirection: 'row', alignItems: 'center', gap: 7 }, color: { width: 7, height: 7, borderRadius: 4 }, eventTime: { color: '#AAB0C0', fontSize: 12, fontVariant: ['tabular-nums'] }, eventName: { color: '#EFF0F4', fontSize: 12, fontWeight: '600', flex: 1 },
});
