import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';

export type ExpenseCategory = { id: string; name: string; color: string | null; icon: string | null; created_at: string };

export async function createExpenseCategory(name: string, color?: string, icon?: string) {
  const db = await getDb();
  const id = uuidv4();
  await db.execute('INSERT INTO expense_categories (id, name, color, icon) VALUES (?, ?, ?, ?)', [id, name, color ?? null, icon ?? null]);
  return id;
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const db = await getDb();
  const result = await db.execute('SELECT * FROM expense_categories ORDER BY name ASC');
  return (result.rows ?? []) as ExpenseCategory[];
}