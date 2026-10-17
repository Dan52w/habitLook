import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
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
import { SectionHeader } from '../../shared/components/SectionHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { RingSegment } from './utils/clockMath';
import { addGoalProgress, deleteGoal } from '../../db/repositories/goals';
import { MiniCalendar } from './components/MiniCalendar';
import { WeeklyStatsModal } from '../stats/components/WeeklyStatsModal';
import { GoalReminderPicker } from '../goals/components/GoalReminderPicker';
import { updateGoalReminder } from '../../db/repositories/goals';
import {
  cancelGoalReminder,
  scheduleGoalReminder,
} from '../../services/notifications';
import { dateFromKey, localDateKey } from '../../shared/utils/date';
import { light, useTheme } from '../../shared/theme/ThemeProvider';

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  const isFocused = useIsFocused();

  useEffect(() => {
    // Solo actualizar el reloj cuando la pestaña está visible.
    if (!isFocused) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, isFocused]);

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

function DayNightPill({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active: boolean;
}) {
  const theme = useTheme();
  const isLight = theme.isLight;
  return (
    <View
      style={[
        styles.keyPill,
        isLight && lightStyles.keyPill,
        active && styles.keyPillActive,
        active && isLight && lightStyles.keyPillActive,
      ]}
    >
      <Text
        style={[
          styles.keyPillText,
          isLight && lightStyles.keyPillText,
          active && styles.keyPillTextActive,
          active && isLight && lightStyles.keyPillTextActive,
        ]}
      >
        {icon} {label}
      </Text>
    </View>
  );
}

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
  const [statsOpen, setStatsOpen] = useState(false);
  const [reminderGoal, setReminderGoal] = useState<
    (typeof goals)[number] | null
  >(null);
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<RingSegment | null>(
    null,
  );

  const freeSlot = useMemo(
    () => segments.find(segment => segment.categoryId === '__free__'),
    [segments],
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
    }, [reloadTimeline, reloadGoals]),
  );

  const markProgress = async (goal: (typeof goals)[number], direction = 1) => {
    try {
      await addGoalProgress(
        goal.id,
        currentTodayKey,
        (goal.targetType === 'duration' ? 5 : 1) * direction,
        goal.targetValue,
      );
      reloadGoals();
    } catch (error) {
      console.warn('No se pudo registrar el avance:', error);
    }
  };

  const [initialLoading, setInitialLoading] = useState(true);

  const openReminderEditor = (goal: (typeof goals)[number]) => {
    setReminderGoal(goal);
    setReminderTime(goal.reminderTime ?? null);
  };

  const saveReminder = async () => {
    if (!reminderGoal) return;
    try {
      await updateGoalReminder(reminderGoal.id, reminderTime);
      if (reminderTime) {
        await scheduleGoalReminder({
          id: reminderGoal.id,
          title: reminderGoal.title,
          target_type: reminderGoal.targetType,
          target_value: reminderGoal.targetValue,
          reminder_time: reminderTime,
        });
      } else {
        await cancelGoalReminder(reminderGoal.id);
      }
      reloadGoals();
    } catch (error) {
      console.warn('No se pudo guardar el recordatorio:', error);
    }
    setReminderGoal(null);
  };
  useEffect(() => {
    if (!loadingTimeline && !loadingGoals) {
      setInitialLoading(false);
    }
  }, [loadingTimeline, loadingGoals]);

  const currentHour = now.getHours();
  const isDay = currentHour >= 6 && currentHour < 18;
  const themed = theme.isLight ? lightStyles : undefined;

  // Punto "estás aquí" + etiqueta del centro del reloj.
  const viewingToday = selectedDate === currentTodayKey;
  const nowMinutesRaw = now.getHours() * 60 + now.getMinutes();
  let nowAngle: number | null = null;
  let centerSub: string | undefined;
  if (viewingToday) {
    const windowStart = isDay ? 360 : 1080;
    let m = nowMinutesRaw;
    if (!isDay && m < 360) m += 1440;
    nowAngle = ((m - windowStart) / 720) * 360;
    const outerSegs = isDay ? segments : nightSegments;
    const cur = outerSegs.find(s => m >= s.startMinutes && m < s.endMinutes);
    if (cur) {
      const name =
        cur.categoryId === '__free__' ? 'Tiempo libre' : cur.categoryName;
      centerSub = `${name} · ${formatTimeMinutes(cur.endMinutes)}`;
    }
  } else {
    const planned = [...segments, ...nightSegments]
      .filter(s => s.categoryId !== '__free__')
      .reduce((acc, s) => acc + s.hours, 0);
    centerSub =
      planned > 0
        ? `${planned % 1 ? planned.toFixed(1) : planned} h planificadas`
        : 'Sin plan';
  }

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
        <SectionHeader
          eyebrow="HABITLOOK"
          title="Tu día, de un vistazo"
          action={
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setStatsOpen(true)}
                style={[styles.planButton, themed?.border]}
              >
                <Text style={styles.planText}>📊 Stats</Text>
              </Pressable>
              <Pressable
                onPress={() => setPlanOpen(true)}
                style={[styles.planButton, themed?.border]}
              >
                <Text style={styles.planText}>+ Planificar</Text>
              </Pressable>
            </View>
          }
        />

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
            nowAngle={nowAngle}
            centerSub={centerSub}
          />
        </View>

        <View style={styles.ringKey}>
          <DayNightPill icon="☀️" label="Día · 6:00–18:00" active={isDay} />
          <DayNightPill icon="🌙" label="Noche · 18:00–6:00" active={!isDay} />
        </View>

        <CategoryLegend items={legend} />

        <NowStatusCard
          activityName={currentActivity.name}
          color={currentActivity.color}
          onPress={() =>
            setSelectedSegment(
              segments.find(
                segment => segment.categoryName === currentActivity.name,
              ) ??
                freeSlot ??
                null,
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
          <EmptyState
            icon="🎯"
            title="Sin metas todavía"
            message="Crea una meta pequeña para empezar a construir tu racha día a día."
            actionLabel="Crear mi primera meta"
            onAction={() => setGoalOpen(true)}
          />
        ) : (
          goals.map(goal => (
            <GoalProgressCard
              key={goal.id}
              title={goal.title}
              progressLabel={goal.progressLabel}
              progressRatio={goal.progressRatio}
              color={goal.color}
              streak={goal.streak}
              reminderTime={goal.reminderTime}
              onReminderPress={() => openReminderEditor(goal)}
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
                      try {
                        await cancelGoalReminder(goal.id);
                      } catch {
                        // Sin recordatorio programado.
                      }
                      reloadGoals();
                    },
                  },
                ])
              }
            />
          ))
        )}

        <Text style={styles.hint}>
          Toca una meta para registrar 5 min o 1 avance. Usa ↶ para deshacer un
          toque por error.
        </Text>
      </ScrollView>

      <PlanManager
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        onChanged={onChanged}
        date={selectedDate}
        suggestedStart={
          freeSlot ? formatTimeMinutes(freeSlot.startMinutes) : '08:00'
        }
        suggestedEnd={
          freeSlot
            ? formatTimeMinutes(
                Math.min(freeSlot.startMinutes + 60, freeSlot.endMinutes),
              )
            : '09:00'
        }
      />

      <GoalComposer
        visible={goalOpen}
        onClose={() => setGoalOpen(false)}
        onSaved={reloadGoals}
      />

      <WeeklyStatsModal
        visible={statsOpen}
        onClose={() => setStatsOpen(false)}
      />

      <AppModal
        visible={Boolean(reminderGoal)}
        title={reminderGoal ? `Aviso · ${reminderGoal.title}` : ''}
        onClose={() => setReminderGoal(null)}
      >
        <GoalReminderPicker value={reminderTime} onChange={setReminderTime} />
        <Pressable style={styles.detailButton} onPress={saveReminder}>
          <Text style={styles.detailButtonText}>Guardar aviso</Text>
        </Pressable>
      </AppModal>

      <AppModal
        visible={Boolean(selectedSegment)}
        title={selectedSegment?.categoryName ?? ''}
        onClose={() => setSelectedSegment(null)}
      >
        {selectedSegment && (
          <>
            <View
              style={[
                styles.segmentColor,
                { backgroundColor: selectedSegment.color },
              ]}
            />
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
  headerActions: { flexDirection: 'row', gap: 8 },
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
  calendarIcon: { color: '#C9B6E8', fontSize: 23 },
  ringWrapper: { alignItems: 'center', marginTop: 2 },
  ringKey: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: -4,
  },
  keyPill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2F42',
    backgroundColor: '#12151F',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keyPillActive: { borderColor: '#A78BFA', backgroundColor: '#1E1830' },
  keyPillText: { color: '#858B9D', fontSize: 11, fontWeight: '700' },
  keyPillTextActive: { color: '#D9C9F3' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  sectionTitle: { color: '#C9B6E8', fontSize: 14, fontWeight: '700' },
  link: { color: '#A78BFA', fontWeight: '700' },
  loading: { color: '#FFFFFF', textAlign: 'center', marginTop: 40 },
  hint: { color: '#74798A', fontSize: 12, marginTop: -8 },
  segmentColor: { height: 6, borderRadius: 3 },
  detailTime: {
    color: '#F8F7FB',
    fontSize: 21,
    fontWeight: '700',
    marginTop: 4,
  },
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
  keyPill: { backgroundColor: light.surface, borderColor: light.border },
  keyPillActive: { borderColor: light.accent, backgroundColor: '#F1EAFB' },
  keyPillText: { color: light.muted },
  keyPillTextActive: { color: light.accent },
});
