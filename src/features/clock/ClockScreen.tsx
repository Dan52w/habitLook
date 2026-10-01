import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DayRing } from './components/DayRing';
import { CategoryLegend } from './components/CategoryLegend';
import { NowStatusCard } from './components/NowStatusCard';
import { GoalProgressCard } from '../goals/components/GoalProgressCard';
import { useTodayTimeline } from './hooks/useTodayTimeline';
import { useTodayGoals } from '../goals/hooks/useTodayGoals';
import { PlanManager } from './components/PlanManager';
import { GoalComposer } from '../goals/components/GoalComposer';
import { AppModal } from '../../shared/components/AppModal';
import { RingSegment } from './utils/clockMath';
import { addGoalProgress, deleteGoal } from '../../db/repositories/goals';
import { Alert } from 'react-native';
import { MiniCalendar } from './components/MiniCalendar';
import { localDateKey } from '../../shared/utils/date';

const todayKey = () => localDateKey();
const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
export function ClockScreen() {
  const { width } = useWindowDimensions();
  const ringSize = Math.min(330, Math.max(260, width - 44));
  const [selectedDate, setSelectedDate] = useState(todayKey()); const [calendarOpen, setCalendarOpen] = useState(false); const [calendarRevision, setCalendarRevision] = useState(0);
  const { segments, nightSegments, legend, currentActivity, loading: loadingTimeline, reload: reloadTimeline } = useTodayTimeline(selectedDate);
  const { goals, loading: loadingGoals, reload: reloadGoals } = useTodayGoals();
  const [planOpen, setPlanOpen] = useState(false); const [goalOpen, setGoalOpen] = useState(false); const [selectedSegment, setSelectedSegment] = useState<RingSegment | null>(null);
  const freeSlot = useMemo(() => segments.find(segment => segment.categoryId === '__free__'), [segments]);
  const formatTime = (minutes: number) => { const value = ((minutes % 1440) + 1440) % 1440; return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; };
  const onChanged = () => { reloadTimeline(); reloadGoals(); setCalendarRevision(revision => revision + 1); };
  const markProgress = async (goal: typeof goals[number], direction = 1) => { await addGoalProgress(goal.id, todayKey(), (goal.targetType === 'duration' ? 5 : 1) * direction, goal.targetValue); reloadGoals(); };
  if (loadingTimeline || loadingGoals) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Preparando tu día…</Text></SafeAreaView>;
  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.top}><View><Text style={styles.eyebrow}>RITMO</Text><Text style={styles.greeting}>Tu día, de un vistazo</Text></View><View style={styles.topActions}><Pressable onPress={() => setPlanOpen(true)} style={styles.planButton}><Text style={styles.planText}>Planificar</Text></Pressable></View></View>
    <Pressable onPress={() => setCalendarOpen(open => !open)} style={styles.dateSelector}><View><Text style={styles.dateLabel}>{selectedDate === todayKey() ? 'HOY' : 'DÍA ELEGIDO'}</Text><Text style={styles.dateValue}>{displayDate(selectedDate)}</Text></View><Text style={styles.calendarIcon}>{calendarOpen ? '⌃' : '⌄'}</Text></Pressable>
    {calendarOpen && <MiniCalendar selectedDate={selectedDate} refreshKey={calendarRevision} onSelect={date => { setSelectedDate(date); }} />}
    <View style={styles.ringWrapper}><DayRing size={ringSize} daySegments={segments} nightSegments={nightSegments} now={new Date()} onSegmentPress={setSelectedSegment} /></View>
    <View style={styles.ringKey}><Text style={styles.keyDay}>Anillo grande · {new Date().getHours() >= 6 && new Date().getHours() < 18 ? '06:00 — 17:59' : '18:00 — 05:59'}</Text><Text style={styles.keyNight}>Anillo interior · {new Date().getHours() >= 6 && new Date().getHours() < 18 ? '18:00 — 05:59' : '06:00 — 17:59'}</Text></View>
    <CategoryLegend items={legend} />
    <NowStatusCard activityName={currentActivity.name} color={currentActivity.color} onPress={() => setSelectedSegment(segments.find(segment => segment.categoryName === currentActivity.name) ?? freeSlot ?? null)} />
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Metas de hoy</Text><Pressable onPress={() => setGoalOpen(true)}><Text style={styles.link}>+ Nueva</Text></Pressable></View>
    {goals.length === 0 ? <Text style={styles.empty}>Crea una meta pequeña para empezar.</Text> : goals.map(goal => <GoalProgressCard key={goal.id} title={goal.title} progressLabel={goal.progressLabel} progressRatio={goal.progressRatio} color={goal.color} onPress={() => markProgress(goal)} onUndo={() => markProgress(goal, -1)} onDelete={() => Alert.alert('Eliminar meta', `¿Eliminar “${goal.title}”?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteGoal(goal.id); reloadGoals(); } }])} />)}
    <Text style={styles.hint}>Toca una meta para registrar 5 min o 1 avance. Usa ↶ para deshacer un toque por error.</Text>
  </ScrollView>
  <PlanManager visible={planOpen} onClose={() => setPlanOpen(false)} onChanged={onChanged} date={selectedDate} suggestedStart={freeSlot ? formatTime(freeSlot.startMinutes) : '08:00'} suggestedEnd={freeSlot ? formatTime(Math.min(freeSlot.startMinutes + 60, freeSlot.endMinutes)) : '09:00'} />
  <GoalComposer visible={goalOpen} onClose={() => setGoalOpen(false)} onSaved={reloadGoals} />
  <AppModal visible={!!selectedSegment} title={selectedSegment?.categoryName ?? ''} onClose={() => setSelectedSegment(null)}>{selectedSegment && <><View style={[styles.segmentColor, { backgroundColor: selectedSegment.color }]} /><Text style={styles.detailTime}>{formatTime(selectedSegment.startMinutes)} — {formatTime(selectedSegment.endMinutes)}</Text><Text style={styles.detail}>{selectedSegment.categoryId === '__free__' ? 'Este tiempo está disponible. Úsalo para crear una actividad en el día elegido.' : `Bloque de ${selectedSegment.hours % 1 ? selectedSegment.hours.toFixed(1) : selectedSegment.hours} horas.`}</Text><Pressable style={styles.detailButton} onPress={() => { setSelectedSegment(null); setPlanOpen(true); }}><Text style={styles.detailButtonText}>{selectedSegment.categoryId === '__free__' ? 'Usar este hueco' : 'Editar mi plan'}</Text></Pressable></>}</AppModal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' }, content: { padding: 18, paddingBottom: 38, gap: 14 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, eyebrow: { color: '#A78BFA', fontWeight: '800', fontSize: 12, letterSpacing: 2 }, greeting: { color: '#F8F7FB', fontSize: 20, fontWeight: '700', marginTop: 2 }, calendarButton: { width: 38, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#4C5367', alignItems: 'center', justifyContent: 'center' }, calendarButtonText: { color: '#C9B6E8', fontSize: 21, lineHeight: 22 }, planButton: { borderRadius: 12, borderWidth: 1, borderColor: '#624B86', paddingHorizontal: 13, paddingVertical: 9 }, planText: { color: '#D9C9F3', fontWeight: '700', fontSize: 13 }, dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#171B27', borderRadius: 14, padding: 12 }, dateLabel: { color: '#A78BFA', fontWeight: '800', fontSize: 10, letterSpacing: 1 }, dateValue: { color: '#EDEEF3', fontWeight: '600', textTransform: 'capitalize', marginTop: 3 }, calendarIcon: { color: '#C9B6E8', fontSize: 23 }, ringWrapper: { alignItems: 'center', marginTop: 2 }, ringKey: { alignItems: 'center', gap: 3, marginTop: -9 }, keyDay: { color: '#C8CBDA', fontSize: 11, fontWeight: '700' }, keyNight: { color: '#858B9D', fontSize: 11 }, sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }, sectionTitle: { color: '#C9B6E8', fontSize: 14, fontWeight: '700' }, link: { color: '#A78BFA', fontWeight: '700' }, loading: { color: '#FFFFFF', textAlign: 'center', marginTop: 40 }, empty: { color: '#9CA3AF' }, hint: { color: '#74798A', fontSize: 12, marginTop: -8 }, segmentColor: { height: 6, borderRadius: 3 }, detailTime: { color: '#F8F7FB', fontSize: 21, fontWeight: '700', marginTop: 4 }, detail: { color: '#AEB2C0', lineHeight: 21 }, detailButton: { alignItems: 'center', backgroundColor: '#A78BFA', borderRadius: 13, padding: 15, marginTop: 4 }, detailButtonText: { color: '#171421', fontWeight: '800' },
});
