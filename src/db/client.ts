import { open, type DB } from '@op-engineering/op-sqlite';
import { getOrCreateDbKey } from './key';
import { MIGRATIONS } from './migrations';
import { v4 as uuidv4 } from 'uuid';

let dbInstance: DB | null = null;
let dbPromise: Promise<DB> | null = null;

export async function getDb(): Promise<DB> {
  if (dbInstance) return dbInstance;

  if (!dbPromise) {
    dbPromise = initializeDb().catch(error => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function initializeDb(): Promise<DB> {
  const encryptionKey = await getOrCreateDbKey();
  const db = open({ name: 'habitlook.db', encryptionKey });

  await db.execute('PRAGMA foreign_keys = ON');
  await runMigrations(db);
  await seedFirstRun(db);

  dbInstance = db;
  return db;
}

async function seedFirstRun(db: DB) {
  const existing = await db.execute('SELECT COUNT(*) AS count FROM categories');
  if (Number(existing.rows?.[0]?.count ?? 0) > 0) return;
  await db.transaction(async tx => {
    const study = uuidv4();
    const exercise = uuidv4();
    const cash = uuidv4();
    await tx.execute(
      'INSERT INTO categories (id, name, color, emoji) VALUES (?, ?, ?, ?)',
      [study, 'Estudio', '#A78BFA', '📚'],
    );
    await tx.execute(
      'INSERT INTO categories (id, name, color, emoji) VALUES (?, ?, ?, ?)',
      [exercise, 'Ejercicio', '#64D9A0', '🏃'],
    );
    await tx.execute(
      'INSERT INTO accounts (id, name, type, color) VALUES (?, ?, ?, ?)',
      [cash, 'Efectivo', 'cash', '#64D9A0'],
    );
  });
}

async function runMigrations(db: DB) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = await db.execute('SELECT name FROM _migrations');
  const appliedNames = new Set((applied.rows ?? []).map((r: any) => r.name));

  for (const migration of MIGRATIONS) {
    if (appliedNames.has(migration.name)) continue;
    await db.transaction(async tx => {
      for (const statement of migration.statements) await tx.execute(statement);
      await tx.execute('INSERT INTO _migrations (name) VALUES (?)', [
        migration.name,
      ]);
    });
  }
}
