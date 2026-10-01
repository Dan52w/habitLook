import { open, type DB } from '@op-engineering/op-sqlite';
import { getOrCreateDbKey } from './key';
import { MIGRATIONS } from './migrations';

let dbInstance: DB | null = null;
let dbPromise: Promise<DB> | null = null;

export async function getDb(): Promise<DB> {
  if (dbInstance) return dbInstance;

  dbPromise ??= initializeDb();
  return dbPromise;
}

async function initializeDb(): Promise<DB> {
  const encryptionKey = await getOrCreateDbKey();
  const db = open({ name: 'ritmo.db', encryptionKey });

  await db.execute('PRAGMA foreign_keys = ON');
  await runMigrations(db);

  dbInstance = db;
  return db;
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
    await db.transaction(async (tx) => {
      for (const statement of migration.statements) await tx.execute(statement);
      await tx.execute('INSERT INTO _migrations (name) VALUES (?)', [migration.name]);
    });
  }
}
