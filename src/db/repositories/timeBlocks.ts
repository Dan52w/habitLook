import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { weekdayFromKey } from '../../shared/utils/date';

export type TimeBlockWithCategory = {
  id: string; category_id: string; category_name: string; category_color: string; category_emoji: string | null;
  start_time: string; end_time: string; day_of_week: number | null; is_recurring: number; schedule_date: string | null;
};

export async function listBlocksForDate(date: string): Promise<TimeBlockWithCategory[]> {
  const db = await getDb();
  const dayOfWeek = weekdayFromKey(date);
  const result = await db.execute(
    `SELECT tb.id, tb.category_id, c.name AS category_name, c.color AS category_color, c.emoji AS category_emoji,
            tb.start_time, tb.end_time, tb.day_of_week, tb.is_recurring, tb.schedule_date
     FROM time_blocks tb JOIN categories c ON c.id = tb.category_id
     WHERE tb.schedule_date = ?
       OR (tb.schedule_date IS NULL AND tb.is_recurring = 1 AND tb.day_of_week = ?)
       OR (tb.schedule_date IS NULL AND tb.is_recurring = 0 AND tb.day_of_week = ?)
     ORDER BY tb.start_time ASC`, [date, dayOfWeek, dayOfWeek],
  );
  return (result.rows ?? []) as TimeBlockWithCategory[];
}

export async function listBlocksForReminders(): Promise<TimeBlockWithCategory[]> {
  const db = await getDb();
  const result = await db.execute(`SELECT tb.id, tb.category_id, c.name AS category_name, c.color AS category_color, c.emoji AS category_emoji, tb.start_time, tb.end_time, tb.day_of_week, tb.is_recurring, tb.schedule_date FROM time_blocks tb JOIN categories c ON c.id = tb.category_id ORDER BY tb.start_time ASC`);
  return (result.rows ?? []) as TimeBlockWithCategory[];
}

export async function createTimeBlock(input: { categoryId: string; startTime: string; endTime: string; date: string; recurring?: boolean }): Promise<string> {
  const db = await getDb();
  const dayOfWeek = weekdayFromKey(input.date);
  const id = uuidv4();
  await db.execute(
    'INSERT INTO time_blocks (id, category_id, start_time, end_time, day_of_week, is_recurring, schedule_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, input.categoryId, input.startTime, input.endTime, dayOfWeek, input.recurring ? 1 : 0, input.recurring ? null : input.date],
  );
  return id;
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM time_blocks WHERE id = ?', [id]);
}

export async function updateTimeBlock(input: { id: string; categoryId: string; startTime: string; endTime: string; date: string; recurring: boolean; scope: 'day' | 'all' }): Promise<void> {
  const db = await getDb();
  if (input.recurring && input.scope === 'day') {
    await db.execute('UPDATE time_blocks SET category_id = ?, start_time = ?, end_time = ?, is_recurring = 0, schedule_date = ? WHERE id = ?', [input.categoryId, input.startTime, input.endTime, input.date, input.id]);
    return;
  }
  await db.execute('UPDATE time_blocks SET category_id = ?, start_time = ?, end_time = ? WHERE id = ?', [input.categoryId, input.startTime, input.endTime, input.id]);
}
