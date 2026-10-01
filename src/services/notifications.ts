import notifee, { AndroidImportance, AndroidNotificationSetting, AuthorizationStatus, EventType, RepeatFrequency, TimestampTrigger, TriggerType } from '@notifee/react-native';
import { getSetting } from '../db/repositories/settiengs';
import { listBlocksForReminders } from '../db/repositories/timeBlocks';
import { findGoalTitleForCategory } from '../db/repositories/goals';
import { localDateKey } from '../shared/utils/date';

export async function scheduleActivityReminder(input: { id: string; title: string; date: string; startTime: string; goalTitle?: string | null; recurring?: boolean }) {
  // El valor visible por defecto es 15 min: úsalo también si el ajuste aún no se ha guardado.
  const minutes = Number(await getSetting('reminder_minutes') ?? '15');
  if (!minutes) return;
  let date = input.date;
  let triggerAt = new Date(`${date}T${input.startTime}:00`).getTime() - minutes * 60_000;
  if (triggerAt <= Date.now() && input.recurring) {
    const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 7);
    date = localDateKey(next);
    triggerAt = new Date(`${date}T${input.startTime}:00`).getTime() - minutes * 60_000;
  }
  // Si el aviso previo ya pasó pero la actividad todavía no, avisa al inicio.
  if (triggerAt <= Date.now()) {
    const startsAt = new Date(`${date}T${input.startTime}:00`).getTime();
    if (startsAt <= Date.now()) return;
    triggerAt = Math.max(Date.now() + 5_000, startsAt);
  }
  const channelId = await notifee.createChannel({ id: 'activities', name: 'Actividades', importance: AndroidImportance.HIGH });
  const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: triggerAt, ...(input.recurring ? { repeatFrequency: RepeatFrequency.WEEKLY } : {}), alarmManager: { allowWhileIdle: true } };
  await notifee.createTriggerNotification({ id: `activity-${input.id}`, title: `En ${minutes} min empieza: ${input.title}`, body: input.goalTitle ? `Recuerda tu meta: ${input.goalTitle}` : `Tu actividad empieza a las ${input.startTime}.`, data: { blockId: input.id, date }, android: { channelId, pressAction: { id: 'default' }, actions: [{ title: 'Iniciar', pressAction: { id: 'start' } }, { title: 'Posponer 10 min', pressAction: { id: 'snooze' } }] } }, trigger);
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
  const channelId = await notifee.createChannel({ id: 'activities', name: 'Actividades', importance: AndroidImportance.HIGH });
  const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: Date.now() + 10_000, alarmManager: { allowWhileIdle: true } };
  await notifee.createTriggerNotification({ id: 'activity-test', title: 'Recordatorios activos', body: 'Esta es una prueba de HabitLook.', android: { channelId, pressAction: { id: 'default' } } }, trigger);
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
    const channelId = await notifee.createChannel({ id: 'activities', name: 'Actividades', importance: AndroidImportance.HIGH });
    await notifee.createTriggerNotification({ ...detail.notification, id: `snooze-${Date.now()}`, title: 'Recordatorio pospuesto', android: { channelId, pressAction: { id: 'default' } } }, { type: TriggerType.TIMESTAMP, timestamp: Date.now() + 10 * 60_000, alarmManager: { allowWhileIdle: true } });
  }
}

export function observeNotificationActions() {
  return notifee.onForegroundEvent(({ type, detail }) => handleNotificationAction(type, detail));
}

export function nextDateForBlock(block: { schedule_date: string | null; is_recurring: number; day_of_week: number | null; start_time: string }) {
  if (block.schedule_date) return block.schedule_date;
  const now = new Date(); const candidate = new Date(now); const targetDay = block.day_of_week ?? now.getDay();
  candidate.setDate(now.getDate() + ((targetDay - now.getDay() + 7) % 7));
  const [hour, minute] = block.start_time.split(':').map(Number); candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= Date.now()) candidate.setDate(candidate.getDate() + 7);
  return localDateKey(candidate);
}

export async function rescheduleActivityReminders() {
  const ids = await notifee.getTriggerNotificationIds();
  await Promise.all(ids.filter(id => id.startsWith('activity-')).map(id => notifee.cancelTriggerNotification(id)));
  const blocks = await listBlocksForReminders();
  await Promise.all(blocks.map(async block => {
    const date = nextDateForBlock(block);
    const goalTitle = await findGoalTitleForCategory(block.category_id);
    await scheduleActivityReminder({ id: block.id, title: block.category_name, date, startTime: block.start_time, goalTitle, recurring: Boolean(block.is_recurring) });
  }));
}
