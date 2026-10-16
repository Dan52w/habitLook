import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { pick, types } from '@react-native-documents/picker';
import { getDb } from '../db/client';

const TABLES = [
  'categories',
  'time_blocks',
  'time_block_exceptions',
  'time_block_status',
  'goals',
  'goal_progress',
  'notes',
  'accounts',
  'expense_categories',
  'expenses',
  'expense_splits',
  'transfers',
  'settings',
] as const;
type TableName = (typeof TABLES)[number];
export type Backup = {
  version: 1;
  exportedAt: string;
  data: Record<TableName, Record<string, unknown>[]>;
};

export async function createBackup(): Promise<Backup> {
  const db = await getDb();
  const data = {} as Backup['data'];
  for (const table of TABLES)
    data[table] = ((await db.execute(`SELECT * FROM ${table}`)).rows ??
      []) as Record<string, unknown>[];
  return { version: 1, exportedAt: new Date().toISOString(), data };
}

export async function exportBackup(): Promise<void> {
  const backup = await createBackup();
  const filename = `habitlook-respaldo-${backup.exportedAt.slice(0, 10)}.json`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, JSON.stringify(backup, null, 2), 'utf8');
  try {
    await Share.open({
      url: `file://${path}`,
      type: 'application/json',
      filename,
      failOnCancel: false,
    });
  } finally {
    // El JSON exportado no está cifrado: no dejar copias temporales.
    await RNFS.unlink(path).catch(() => undefined);
  }
}

function parseBackup(raw: string): Backup {
  const backup = JSON.parse(raw) as Backup;
  if (
    backup.version !== 1 ||
    typeof backup.exportedAt !== 'string' ||
    !backup.data ||
    TABLES.some(table => !Array.isArray(backup.data[table]))
  )
    throw new Error('El archivo no es un respaldo compatible de HabitLook.');
  return backup;
}

/** Límite de seguridad: un respaldo mayor es anómalo y puede agotar memoria. */
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

/** Nombres de columna permitidos: solo minúsculas, números y guion bajo. */
const COLUMN_NAME = /^[a-z_][a-z0-9_]*$/;

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export async function importBackupFromPicker(
  mode: 'merge' | 'replace',
): Promise<void> {
  const [file] = await pick({
    type: [types.json, 'application/json'],
    mode: 'import',
  });
  const stat = await RNFS.stat(file.uri).catch(() => null);
  if (stat && Number(stat.size) > MAX_BACKUP_BYTES)
    throw new Error(
      'El archivo es demasiado grande para ser un respaldo válido.',
    );
  const raw = await RNFS.readFile(file.uri, 'utf8');
  if (raw.length > MAX_BACKUP_BYTES)
    throw new Error(
      'El archivo es demasiado grande para ser un respaldo válido.',
    );
  await importBackup(parseBackup(raw), mode);
}

export async function importBackup(
  backup: Backup,
  mode: 'merge' | 'replace',
): Promise<void> {
  if (backup.version !== 1)
    throw new Error('Versión de respaldo no compatible.');
  const db = await getDb();
  // Columnas reales de cada tabla (allowlist contra inyección SQL:
  // los nombres de columna vienen del archivo y nunca se interpolan
  // sin validar).
  const allowedColumns = new Map<TableName, Set<string>>();
  for (const table of TABLES) {
    const info = await db.execute(`PRAGMA table_info(${table})`);
    allowedColumns.set(
      table,
      new Set(
        ((info.rows ?? []) as { name: string }[]).map(row => row.name),
      ),
    );
  }
  await db.transaction(async tx => {
    if (mode === 'replace') {
      for (const table of [...TABLES].reverse())
        await tx.execute(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      const allowed = allowedColumns.get(table) ?? new Set<string>();
      for (const row of backup.data[table]) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const columns = Object.keys(row).filter(
          column =>
            COLUMN_NAME.test(column) &&
            allowed.has(column) &&
            isPrimitive((row as Record<string, unknown>)[column]),
        );
        if (!columns.length) continue;
        const values = columns.map(column => {
          const value = (row as Record<string, unknown>)[column];
          return value ?? null;
        });
        await tx.execute(
          `INSERT OR REPLACE INTO ${table} (${columns.join(
            ', ',
          )}) VALUES (${columns.map(() => '?').join(', ')})`,
          values as (string | number | boolean | null)[],
        );
      }
    }
  });
}
