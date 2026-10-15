import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';

export type ExpenseCategory = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
};

const CATEGORY_COLORS = [
  '#A78BFA',
  '#64D9A0',
  '#7CC7FF',
  '#F5B86B',
  '#F08CA0',
  '#E8C15A',
];

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const db = await getDb();
  const result = await db.execute(
    'SELECT * FROM expense_categories ORDER BY created_at ASC',
  );
  return (result.rows ?? []) as ExpenseCategory[];
}

export async function createExpenseCategory(name: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  const existing = await listExpenseCategories();
  const color = CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length];
  await db.execute(
    'INSERT INTO expense_categories (id, name, color) VALUES (?, ?, ?)',
    [id, name.trim(), color],
  );
  return id;
}

export async function updateExpenseCategory(
  id: string,
  name: string,
): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE expense_categories SET name = ? WHERE id = ?', [
    name.trim(),
    id,
  ]);
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM expense_categories WHERE id = ?', [id]);
}
