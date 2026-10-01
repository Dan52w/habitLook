import notifee, { AndroidImportance, RepeatFrequency, TimestampTrigger, TriggerType } from '@notifee/react-native';
import { getSetting } from '../db/repositories/settiengs';
import { listBlocksForReminders } from '../db/repositories/timeBlocks';
import { findGoalTitleForCategory } from '../db/repositories/goals';
import { localDateKey } from '../shared/utils/date';

export async function scheduleActivityReminder(input: { id: string; title: string; date: string; startTime: string; goalTitle?: string | null; recurring?: boolean }) {
  // El valor visible por defecto es 15 min: úsalo también si el ajuste aún no se ha guardado.
  const minutes = Number(await getSetting('reminder_minutes') ?? '15');
  if (!minutes) return;
  const triggerAt = new Date(`${input.date}T${input.startTime}:00`).getTime() - minutes * 60_000;
  if (triggerAt <= Date.now()) return;
  const channelId = await notifee.createChannel({ id: 'activities', name: 'Actividades', importance: AndroidImportance.HIGH });
  const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: triggerAt, ...(input.recurring ? { repeatFrequency: RepeatFrequency.WEEKLY } : {}), alarmManager: { allowWhileIdle: true } };
  await notifee.createTriggerNotification({ id: `activity-${input.id}`, title: `En ${minutes} min empieza: ${input.title}`, body: input.goalTitle ? `Recuerda tu meta: ${input.goalTitle}` : `Tu actividad empieza a las ${input.startTime}.`, android: { channelId, pressAction: { id: 'default' } } }, trigger);
}

export async function requestReminderPermission() {
  return notifee.requestPermission();
}

function nextDateForBlock(block: { schedule_date: string | null; is_recurring: number; day_of_week: number | null; start_time: string }) {
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
