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
  await Share.open({
    url: `file://${path}`,
    type: 'application/json',
    filename,
    failOnCancel: false,
  });
}

function parseBackup(raw: string): Backup {
  const backup = JSON.parse(raw) as Backup;
  if (
    backup.version !== 1 ||
    !backup.data ||
    TABLES.some(table => !Array.isArray(backup.data[table]))
  )
    throw new Error('El archivo no es un respaldo compatible de HabitLook.');
  return backup;
}

export async function importBackupFromPicker(
  mode: 'merge' | 'replace',
): Promise<void> {
  const [file] = await pick({
    type: [types.json, 'application/json'],
    mode: 'import',
  });
  const raw = await RNFS.readFile(file.uri, 'utf8');
  await importBackup(parseBackup(raw), mode);
}

export async function importBackup(
  backup: Backup,
  mode: 'merge' | 'replace',
): Promise<void> {
  if (backup.version !== 1)
    throw new Error('Versión de respaldo no compatible.');
  const db = await getDb();
  await db.transaction(async tx => {
    if (mode === 'replace') {
      for (const table of [...TABLES].reverse())
        await tx.execute(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      for (const row of backup.data[table]) {
        const columns = Object.keys(row);
        if (!columns.length) continue;
        await tx.execute(
          `INSERT OR REPLACE INTO ${table} (${columns.join(
            ', ',
          )}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map(column => row[column] ?? null) as any[],
        );
      }
    }
  });
}
