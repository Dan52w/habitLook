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
    triggerAt = plannedTrigger <= now ? Math.max(now + 5_000, startsAt - 30_000) : plannedTrigger;
  } else {
    const startsAt = new Date(`${date}T${input.startTime}:00`).getTime();
    if (startsAt <= now) return;
    const plannedTrigger = startsAt - minutes * 60_000;
    triggerAt = plannedTrigger <= now ? Math.max(now + 5_000, startsAt - 30_000) : plannedTrigger;
  }

  const settings = await notifee.getNotificationSettings();
  const hasExactAlarm = settings.android?.alarm === AndroidNotificationSetting.ENABLED;
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
    trigger
  );
}

export async function requestReminderPermission() {
  return notifee.requestPermission();
}

export type ReminderPermissionStatus = { notifications: boolean; exactAlarms: boolean };

export async function getReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  const settings = await notifee.getNotificationSettings();
  return {
    notifications: settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED,
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
    trigger
  );
}

export async function handleNotificationAction(type: EventType, detail: any): Promise<void> {
  if (type !== EventType.ACTION_PRESS) return;
  const blockId = detail.notification?.data?.blockId as string | undefined;
  const date = detail.notification?.data?.date as string | undefined;

  if (detail.pressAction?.id === 'start' && blockId && date) {
    const { markTimeBlockStarted } = require('../db/repositories/timeBlocks');
    await markTimeBlockStarted(blockId, date);
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
      }
    );
  }
}

export function observeNotificationActions() {
  return notifee.onForegroundEvent(({ type, detail }) => handleNotificationAction(type, detail));
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
  if (candidate.getTime() <= Date.now()) candidate.setDate(candidate.getDate() + 7);
  return localDateKey(candidate);
}

export async function rescheduleActivityReminders() {
  await ensureActivityChannel();
  const blocks = await listBlocksForReminders();
  const expectedNotificationIds = new Set(blocks.map(block => `activity-${block.id}`));
  const existingTriggerIds = await notifee.getTriggerNotificationIds();
  const staleIds = existingTriggerIds.filter(
    id => id.startsWith('activity-') && !expectedNotificationIds.has(id)
  );

  if (staleIds.length > 0) {
    await Promise.all(staleIds.map(id => notifee.cancelTriggerNotification(id)));
  }

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
    })
  );
}
