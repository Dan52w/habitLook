import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';

export type Note = {
  id: string;
  text: string;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  time_block_id: string | null;
  block_start_time: string | null;
  block_end_time: string | null;
  note_date: string | null;
};

export async function createNote(text: string, categoryId?: string, timeBlockId?: string, noteDate?: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO notes (id, category_id, text, time_block_id, note_date) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), categoryId ?? null, text.trim(), timeBlockId ?? null, noteDate ?? null],
  );
}

export async function listNotes(search = '', categoryId?: string, noteDate?: string): Promise<Note[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT n.id, n.text, n.created_at, n.category_id, n.time_block_id, n.note_date,
            c.name AS category_name, c.color AS category_color,
            tb.start_time AS block_start_time, tb.end_time AS block_end_time
     FROM notes n LEFT JOIN categories c ON c.id = n.category_id
     LEFT JOIN time_blocks tb ON tb.id = n.time_block_id
     WHERE (? = '' OR n.text LIKE '%' || ? || '%') AND (? IS NULL OR n.category_id = ?) AND (? IS NULL OR n.note_date = ?)
     ORDER BY n.created_at DESC`,
    [search, search, categoryId ?? null, categoryId ?? null, noteDate ?? null, noteDate ?? null],
  );
  return (result.rows ?? []) as Note[];
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM notes WHERE id = ?', [id]);
}
