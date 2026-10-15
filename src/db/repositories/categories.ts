import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';

export type Category = {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  created_at: string;
};

export async function createCategory(
  name: string,
  color: string,
  emoji?: string,
): Promise<Category> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute(
    'INSERT INTO categories (id, name, color, emoji) VALUES (?, ?, ?, ?)',
    [id, name, color, emoji?.trim() || null],
  );
  return {
    id,
    name,
    color,
    emoji: emoji?.trim() || null,
    created_at: new Date().toISOString(),
  };
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const result = await db.execute(
    'SELECT * FROM categories ORDER BY created_at ASC',
  );
  return (result.rows ?? []) as Category[];
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM categories WHERE id = ?', [id]);
  try {
    const {
      rescheduleActivityReminders,
    } = require('../../services/notifications');
    await rescheduleActivityReminders();
  } catch {}
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  emoji?: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE categories SET name = ?, color = ?, emoji = ? WHERE id = ?',
    [name.trim(), color, emoji?.trim() || null, id],
  );
  try {
    const {
      rescheduleActivityReminders,
    } = require('../../services/notifications');
    await rescheduleActivityReminders();
  } catch {}
}
