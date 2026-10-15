import { getDb } from '../client';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.execute('SELECT value FROM settings WHERE key = ?', [
    key,
  ]);
  return (result.rows?.[0]?.value ?? null) as string | null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}
