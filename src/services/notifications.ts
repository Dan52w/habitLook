import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { getSetting } from '../db/repositories/settings';
import { listBlocksForReminders } from '../db/repositories/timeBlocks';
import { findGoalTitleForCategory } from '../db/repositories/goals';
import { localDateKey } from '../shared/utils/date';

let channelCreated = false;

export async function ensureActivityChannel(): Promise<string> {
  if (!channelCreated) {
    await notifee.createChannel({
      id: 'activities',
      name: 'Actividades',
      importance: AndroidImportance.HIGH,
    });
    channelCreated = true;
  }
  return 'activities';
}

export async function scheduleActivityReminder(input: {
  id: string;
  title: string;
  date: string;
  startTime: string;
  goalTitle?: string | null;
  recurring?: boolean;
}) {
  const minutes = Number((await getSetting('reminder_minutes')) ?? '15');
  if (!minutes) return;

  let date = input.date;
  const now = Date.now();
  let triggerAt: number;

  if (input.recurring) {
    while (new Date(`${date}T${input.startTime}:00`).getTime() <= now) {
      const next = new Date(`${date}T12:00:00`);
      next.setDate(next.getDate() + 7);
      date = localDateKey(next);
    }
    const startsAt = new Date(`${date}T${input.startTime}:00`).getTime();
    const plannedTrigger = startsAt - minutes * 60_000;
    triggerAt =
      plannedTrigger <= now
        ? Math.max(now + 5_000, startsAt - 30_000)
        : plannedTrigger;
  } else {
    const startsAt = new Date(`${date}T${input.startTime}:00`).getTime();
    if (startsAt <= now) return;
    const plannedTrigger = startsAt - minutes * 60_000;
    triggerAt =
      plannedTrigger <= now
        ? Math.max(now + 5_000, startsAt - 30_000)
        : plannedTrigger;
  }

  const settings = await notifee.getNotificationSettings();
  const hasExactAlarm =
    settings.android?.alarm === AndroidNotificationSetting.ENABLED;
  const channelId = await ensureActivityChannel();

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerAt,
    ...(input.recurring ? { repeatFrequency: RepeatFrequency.WEEKLY } : {}),
    ...(hasExactAlarm ? { alarmManager: { allowWhileIdle: true } } : {}),
  };

  await notifee.createTriggerNotification(
    {
      id: `activity-${input.id}`,
      title: `En ${minutes} min empieza: ${input.title}`,
      body: input.goalTitle
        ? `Recuerda tu meta: ${input.goalTitle}`
        : `Tu actividad empieza a las ${input.startTime}.`,
      data: { blockId: input.id, date },
      android: {
        channelId,
        pressAction: { id: 'default' },
        actions: [
          { title: 'Iniciar', pressAction: { id: 'start' } },
          { title: 'Posponer 10 min', pressAction: { id: 'snooze' } },
        ],
      },
    },
    trigger,
  );
}

export async function requestReminderPermission() {
  return notifee.requestPermission();
}

export type ReminderPermissionStatus = {
  notifications: boolean;
  exactAlarms: boolean;
};

export async function getReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  const settings = await notifee.getNotificationSettings();
  return {
    notifications:
      settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED,
    exactAlarms: settings.android?.alarm === AndroidNotificationSetting.ENABLED,
  };
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const status = await getReminderPermissionStatus();
  if (status.notifications) return true;
  const result = await notifee.requestPermission();
  return result.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function openNotificationPermissionSettings() {
  await notifee.openNotificationSettings();
}

export async function openExactAlarmSettings() {
  await notifee.openAlarmPermissionSettings();
}

export async function openBatterySettings() {
  await notifee.openPowerManagerSettings();
}

export async function scheduleReminderTest(): Promise<void> {
  const channelId = await ensureActivityChannel();
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + 10_000,
    alarmManager: { allowWhileIdle: true },
  };

  await notifee.createTriggerNotification(
    {
      id: 'activity-test',
      title: 'Recordatorios activos',
      body: 'Esta es una prueba de HabitLook.',
      android: { channelId, pressAction: { id: 'default' } },
    },
    trigger,
  );
}

export async function handleNotificationAction(
  type: EventType,
  detail: any,
): Promise<void> {
  if (type !== EventType.ACTION_PRESS) return;
  const blockId = detail.notification?.data?.blockId as string | undefined;

  if (detail.pressAction?.id === 'start' && blockId) {
    const { markTimeBlockStarted } = require('../db/repositories/timeBlocks');
    // Se usa la fecha actual y no la guardada en la notificación: en las
    // series semanales la fecha original queda congelada en la primera ocurrencia.
    await markTimeBlockStarted(blockId, localDateKey());
  }

  if (detail.pressAction?.id === 'snooze') {
    const channelId = await ensureActivityChannel();
    await notifee.createTriggerNotification(
      {
        ...detail.notification,
        id: `snooze-${Date.now()}`,
        title: 'Recordatorio pospuesto',
        android: { channelId, pressAction: { id: 'default' } },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 10 * 60_000,
        alarmManager: { allowWhileIdle: true },
      },
    );
  }

  if (detail.pressAction?.id === 'goal-done') {
    const goalId = detail.notification?.data?.goalId as string | undefined;
    const increment = Number(
      detail.notification?.data?.goalIncrement ?? 1,
    );
    const targetValue = Number(
      detail.notification?.data?.goalTargetValue ?? 1,
    );
    if (goalId) {
      const { addGoalProgress } = require('../db/repositories/goals');
      await addGoalProgress(goalId, localDateKey(), increment, targetValue);
      const shownId = detail.notification?.id as string | undefined;
      if (shownId) {
        try {
          await notifee.cancelNotification(shownId);
        } catch {
          // La notificación ya no existe: no es un error.
        }
      }
    }
  }
}

export function observeNotificationActions() {
  return notifee.onForegroundEvent(({ type, detail }) =>
    handleNotificationAction(type, detail),
  );
}

// ---------- Recordatorios de metas y notas ----------

function nextTimestampForDailyTime(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

async function exactAlarmAllowed(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.android?.alarm === AndroidNotificationSetting.ENABLED;
  } catch {
    return false;
  }
}

export async function scheduleGoalReminder(goal: {
  id: string;
  title: string;
  target_type: string;
  target_value: number;
  reminder_time: string | null;
}): Promise<void> {
  if (!goal.reminder_time) return;
  const timestamp = nextTimestampForDailyTime(goal.reminder_time);
  if (!timestamp) return;
  const channelId = await ensureActivityChannel();
  const increment = goal.target_type === 'duration' ? 5 : 1;
  await notifee.createTriggerNotification(
    {
      id: `goal-reminder-${goal.id}`,
      title: `⏰ ${goal.title}`,
      body: '¿Cómo va tu meta hoy?',
      data: {
        goalId: goal.id,
        goalIncrement: increment,
        goalTargetValue: goal.target_value,
      },
      android: {
        channelId,
        pressAction: { id: 'default' },
        actions: [
          { title: 'Ya lo hice ✓', pressAction: { id: 'goal-done' } },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency: RepeatFrequency.DAILY,
      ...((await exactAlarmAllowed())
        ? { alarmManager: { allowWhileIdle: true } }
        : {}),
    },
  );
}

export async function cancelGoalReminder(goalId: string): Promise<void> {
  try {
    await notifee.cancelTriggerNotification(`goal-reminder-${goalId}`);
  } catch {
    // No había nada programado: no es un error.
  }
}

export async function scheduleNoteReminder(note: {
  id: string;
  text: string;
  reminder_at: string | null;
}): Promise<void> {
  if (!note.reminder_at) return;
  const timestamp = new Date(note.reminder_at).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return;
  const channelId = await ensureActivityChannel();
  const body =
    note.text.length > 120 ? `${note.text.slice(0, 120)}…` : note.text;
  await notifee.createTriggerNotification(
    {
      id: `note-reminder-${note.id}`,
      title: '📝 Recordatorio',
      body,
      data: { noteId: note.id },
      android: { channelId, pressAction: { id: 'default' } },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      ...((await exactAlarmAllowed())
        ? { alarmManager: { allowWhileIdle: true } }
        : {}),
    },
  );
}

export async function cancelNoteReminder(noteId: string): Promise<void> {
  try {
    await notifee.cancelTriggerNotification(`note-reminder-${noteId}`);
  } catch {
    // No había nada programado: no es un error.
  }
}

/**
 * Reprograma todos los recordatorios de metas y notas desde la base de
 * datos. Cancela primero los existentes para evitar duplicados.
 */
export async function rescheduleGoalAndNoteReminders(): Promise<void> {
  const { listGoalsWithReminders } = require('../db/repositories/goals');
  const { getNoteReminderNotes } = require('../db/repositories/notes');

  const existingIds = await notifee.getTriggerNotificationIds();
  const staleIds = existingIds.filter(
    id => id.startsWith('goal-reminder-') || id.startsWith('note-reminder-'),
  );
  await Promise.all(
    staleIds.map(id =>
      notifee.cancelTriggerNotification(id).catch(() => {}),
    ),
  );

  await ensureActivityChannel();
  const [goals, notes] = await Promise.all([
    listGoalsWithReminders(),
    getNoteReminderNotes(),
  ]);
  await Promise.all([
    ...goals.map((g: any) =>
      scheduleGoalReminder(g).catch(e =>
        console.warn('No se pudo programar recordatorio de meta:', e),
      ),
    ),
    ...notes.map((n: any) =>
      scheduleNoteReminder(n).catch(e =>
        console.warn('No se pudo programar recordatorio de nota:', e),
      ),
    ),
  ]);
}

export function nextDateForBlock(block: {
  schedule_date: string | null;
  is_recurring: number;
  day_of_week: number | null;
  start_time: string;
}) {
  if (block.schedule_date) return block.schedule_date;
  const now = new Date();
  const candidate = new Date(now);
  const targetDay = block.day_of_week ?? now.getDay();
  candidate.setDate(now.getDate() + ((targetDay - now.getDay() + 7) % 7));
  const [hour, minute] = block.start_time.split(':').map(Number);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= Date.now())
    candidate.setDate(candidate.getDate() + 7);
  return localDateKey(candidate);
}

export async function rescheduleActivityReminders() {
  const minutes = Number((await getSetting('reminder_minutes')) ?? '15');

  // Cancela primero todos los recordatorios de actividades: evita duplicados
  // y hace que "No avisar" (0 min) realmente silencie los ya programados.
  const existingTriggerIds = await notifee.getTriggerNotificationIds();
  const staleIds = existingTriggerIds.filter(id => id.startsWith('activity-'));
  if (staleIds.length > 0) {
    await Promise.all(
      staleIds.map(id => notifee.cancelTriggerNotification(id)),
    );
  }

  if (!minutes) return;

  await ensureActivityChannel();
  const blocks = await listBlocksForReminders();

  await Promise.all(
    blocks.map(async block => {
      const date = nextDateForBlock(block);
      const goalTitle = await findGoalTitleForCategory(block.category_id);
      await scheduleActivityReminder({
        id: block.id,
        title: block.category_name,
        date,
        startTime: block.start_time,
        goalTitle,
        recurring: Boolean(block.is_recurring),
      });
    }),
  );
}
