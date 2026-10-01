import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { MiniCalendar } from './components/MiniCalendar';
import { dateFromKey, localDateKey } from '../../shared/utils/date';
import { light, useTheme } from '../../shared/theme/ThemeProvider';

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

const formatDisplayDate = (dateKey: string) => {
  return dateFromKey(dateKey).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const formatTimeMinutes = (minutes: number) => {
  const value = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export function ClockScreen() {
  const theme = useTheme();
  const now = useNow();
  const { width } = useWindowDimensions();
  const ringSize = Math.min(330, Math.max(260, width - 44));

  const currentTodayKey = useMemo(() => localDateKey(now), [now]);
  const [selectedDate, setSelectedDate] = useState(currentTodayKey);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const previousTodayRef = useRef(currentTodayKey);

  useEffect(() => {
    if (selectedDate === previousTodayRef.current) {
      setSelectedDate(currentTodayKey);
    }
    previousTodayRef.current = currentTodayKey;
  }, [currentTodayKey, selectedDate]);

  const {
    segments,
    nightSegments,
    legend,
    currentActivity,
    loading: loadingTimeline,
    reload: reloadTimeline,
  } = useTodayTimeline(selectedDate, now);

  const { goals, loading: loadingGoals, reload: reloadGoals } = useTodayGoals();

  const [planOpen, setPlanOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<RingSegment | null>(null);

  const freeSlot = useMemo(
    () => segments.find(segment => segment.categoryId === '__free__'),
    [segments]
  );

  const onChanged = useCallback(() => {
    reloadTimeline();
    reloadGoals();
    setCalendarRevision(revision => revision + 1);
  }, [reloadTimeline, reloadGoals]);

  useFocusEffect(
    useCallback(() => {
      reloadTimeline();
      reloadGoals();
    }, [reloadTimeline, reloadGoals])
  );

  const markProgress = async (goal: (typeof goals)[number], direction = 1) => {
    await addGoalProgress(
      goal.id,
      currentTodayKey,
      (goal.targetType === 'duration' ? 5 : 1) * direction,
      goal.targetValue
    );
    reloadGoals();
  };

  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    if (!loadingTimeline && !loadingGoals) {
      setInitialLoading(false);
    }
  }, [loadingTimeline, loadingGoals]);

  const currentHour = now.getHours();
  const isDay = currentHour >= 6 && currentHour < 18;
  const themed = theme.isLight ? lightStyles : undefined;

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, themed?.container]}>
        <Text style={[styles.loading, themed?.text]}>Preparando tu día…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themed?.container]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <View>
            <Text style={styles.eyebrow}>HABITLOOK</Text>
            <Text style={[styles.greeting, themed?.text]}>Tu día, de un vistazo</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => setPlanOpen(true)} style={[styles.planButton, themed?.border]}>
              <Text style={styles.planText}>Planificar</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => setCalendarOpen(open => !open)}
          style={[styles.dateSelector, themed?.card]}
        >
          <View>
            <Text style={styles.dateLabel}>
              {selectedDate === currentTodayKey ? 'HOY' : 'DÍA ELEGIDO'}
            </Text>
            <Text style={[styles.dateValue, themed?.text]}>
              {formatDisplayDate(selectedDate)}
            </Text>
          </View>
          <Text style={styles.calendarIcon}>{calendarOpen ? '⌃' : '⌄'}</Text>
        </Pressable>

        {calendarOpen && (
          <MiniCalendar
            selectedDate={selectedDate}
            refreshKey={calendarRevision}
            onSelect={date => setSelectedDate(date)}
          />
        )}

        <View style={styles.ringWrapper}>
          <DayRing
            size={ringSize}
            daySegments={segments}
            nightSegments={nightSegments}
            now={now}
            onSegmentPress={setSelectedSegment}
          />
        </View>

        <View style={styles.ringKey}>
          <Text style={styles.keyDay}>
            Anillo grande · {isDay ? '06:00 — 17:59' : '18:00 — 05:59'}
          </Text>
          <Text style={styles.keyNight}>
            Anillo interior · {!isDay ? '06:00 — 17:59' : '18:00 — 05:59'}
          </Text>
        </View>

        <CategoryLegend items={legend} />

        <NowStatusCard
          activityName={currentActivity.name}
          color={currentActivity.color}
          onPress={() =>
            setSelectedSegment(
              segments.find(segment => segment.categoryName === currentActivity.name) ??
                freeSlot ??
                null
            )
          }
        />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Metas de hoy</Text>
          <Pressable onPress={() => setGoalOpen(true)}>
            <Text style={styles.link}>+ Nueva</Text>
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <Text style={[styles.empty, themed?.muted]}>Crea una meta pequeña para empezar.</Text>
        ) : (
          goals.map(goal => (
            <GoalProgressCard
              key={goal.id}
              title={goal.title}
              progressLabel={goal.progressLabel}
              progressRatio={goal.progressRatio}
              color={goal.color}
              onPress={() => markProgress(goal)}
              onUndo={() => markProgress(goal, -1)}
              onDelete={() =>
                Alert.alert('Eliminar meta', `¿Eliminar “${goal.title}”?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteGoal(goal.id);
                      reloadGoals();
                    },
                  },
                ])
              }
            />
          ))
        )}

        <Text style={styles.hint}>
          Toca una meta para registrar 5 min o 1 avance. Usa ↶ para deshacer un toque por error.
        </Text>
      </ScrollView>

      <PlanManager
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        onChanged={onChanged}
        date={selectedDate}
        suggestedStart={freeSlot ? formatTimeMinutes(freeSlot.startMinutes) : '08:00'}
        suggestedEnd={
          freeSlot
            ? formatTimeMinutes(Math.min(freeSlot.startMinutes + 60, freeSlot.endMinutes))
            : '09:00'
        }
      />

      <GoalComposer visible={goalOpen} onClose={() => setGoalOpen(false)} onSaved={reloadGoals} />

      <AppModal
        visible={Boolean(selectedSegment)}
        title={selectedSegment?.categoryName ?? ''}
        onClose={() => setSelectedSegment(null)}
      >
        {selectedSegment && (
          <>
            <View style={[styles.segmentColor, { backgroundColor: selectedSegment.color }]} />
            <Text style={styles.detailTime}>
              {formatTimeMinutes(selectedSegment.startMinutes)} —{' '}
              {formatTimeMinutes(selectedSegment.endMinutes)}
            </Text>
            <Text style={styles.detail}>
              {selectedSegment.categoryId === '__free__'
                ? 'Este tiempo está disponible. Úsalo para crear una actividad en el día elegido.'
                : `Bloque de ${
                    selectedSegment.hours % 1
                      ? selectedSegment.hours.toFixed(1)
                      : selectedSegment.hours
                  } horas.`}
            </Text>
            <Pressable
              style={styles.detailButton}
              onPress={() => {
                setSelectedSegment(null);
                setPlanOpen(true);
              }}
            >
              <Text style={styles.detailButtonText}>
                {selectedSegment.categoryId === '__free__'
                  ? 'Usar este hueco'
                  : 'Editar mi plan'}
              </Text>
            </Pressable>
          </>
        )}
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' },
  content: { padding: 18, paddingBottom: 38, gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: '#A78BFA', fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  greeting: { color: '#F8F7FB', fontSize: 20, fontWeight: '700', marginTop: 2 },
  planButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#624B86',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  planText: { color: '#D9C9F3', fontWeight: '700', fontSize: 13 },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#171B27',
    borderRadius: 14,
    padding: 12,
  },
  dateLabel: { color: '#A78BFA', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  dateValue: {
    color: '#EDEEF3',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 3,
  },
  calendarIcon: { color: '#C9B6E8', fontSize: 23 },
  ringWrapper: { alignItems: 'center', marginTop: 2 },
  ringKey: { alignItems: 'center', gap: 3, marginTop: -9 },
  keyDay: { color: '#C8CBDA', fontSize: 11, fontWeight: '700' },
  keyNight: { color: '#858B9D', fontSize: 11 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  sectionTitle: { color: '#C9B6E8', fontSize: 14, fontWeight: '700' },
  link: { color: '#A78BFA', fontWeight: '700' },
  loading: { color: '#FFFFFF', textAlign: 'center', marginTop: 40 },
  empty: { color: '#9CA3AF' },
  hint: { color: '#74798A', fontSize: 12, marginTop: -8 },
  segmentColor: { height: 6, borderRadius: 3 },
  detailTime: { color: '#F8F7FB', fontSize: 21, fontWeight: '700', marginTop: 4 },
  detail: { color: '#AEB2C0', lineHeight: 21 },
  detailButton: {
    alignItems: 'center',
    backgroundColor: '#A78BFA',
    borderRadius: 13,
    padding: 15,
    marginTop: 4,
  },
  detailButtonText: { color: '#171421', fontWeight: '800' },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  card: { backgroundColor: light.surface },
  text: { color: light.text },
  muted: { color: light.muted },
  border: { borderColor: light.border },
});
