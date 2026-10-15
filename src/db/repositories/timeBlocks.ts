import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import {
  dateFromKey,
  localDateKey,
  weekdayFromKey,
} from '../../shared/utils/date';

export type TimeBlockWithCategory = {
  id: string;
  category_id: string;
  category_name: string;
  category_color: string;
  category_emoji: string | null;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  is_recurring: number;
  schedule_date: string | null;
};

/**
 * Fecha de origen de un bloque: para bloques que cruzan medianoche
 * (fin < inicio) vistos el día siguiente, el bloque "pertenece" al día
 * anterior. Las excepciones y ediciones deben registrarse contra esa
 * fecha para que el filtro de `listBlocksForDate` las encuentre.
 */
async function resolveOriginDate(
  blockId: string,
  viewingDate: string,
): Promise<string> {
  const db = await getDb();
  const res = await db.execute(
    'SELECT start_time, end_time, schedule_date, day_of_week FROM time_blocks WHERE id = ?',
    [blockId],
  );
  const found = (res.rows ?? [])[0] as
    | {
        start_time: string;
        end_time: string;
        schedule_date: string | null;
        day_of_week: number | null;
      }
    | undefined;
  if (!found || !(found.end_time < found.start_time)) return viewingDate;
  const prev = dateFromKey(viewingDate);
  prev.setDate(prev.getDate() - 1);
  const prevDate = localDateKey(prev);
  const originatesPrev =
    found.schedule_date === prevDate ||
    (found.schedule_date === null &&
      found.day_of_week === weekdayFromKey(prevDate));
  return originatesPrev ? prevDate : viewingDate;
}

export async function listBlocksForDate(
  date: string,
): Promise<TimeBlockWithCategory[]> {
  const db = await getDb();
  const dayOfWeek = weekdayFromKey(date);
  const previous = dateFromKey(date);
  previous.setDate(previous.getDate() - 1);
  const previousDate = localDateKey(previous);
  const previousDayOfWeek = weekdayFromKey(previousDate);
  const result = await db.execute(
    `SELECT tb.id, tb.category_id, c.name AS category_name, c.color AS category_color, c.emoji AS category_emoji,
            tb.start_time, tb.end_time, tb.day_of_week, tb.is_recurring, tb.schedule_date
     FROM time_blocks tb JOIN categories c ON c.id = tb.category_id
     WHERE (
       tb.schedule_date = ?
       OR (tb.schedule_date = ? AND tb.end_time < tb.start_time)
       OR (tb.schedule_date IS NULL AND tb.is_recurring = 1 AND tb.day_of_week = ?)
       OR (tb.schedule_date IS NULL AND tb.is_recurring = 1 AND tb.day_of_week = ? AND tb.end_time < tb.start_time)
       OR (tb.schedule_date IS NULL AND tb.is_recurring = 0 AND tb.day_of_week = ?)
     )
     ORDER BY tb.start_time ASC`,
    [date, previousDate, dayOfWeek, previousDayOfWeek, dayOfWeek],
  );
  const exceptions = await db.execute(
    'SELECT time_block_id, date FROM time_block_exceptions WHERE date IN (?, ?)',
    [date, previousDate],
  );
  const hidden = new Set(
    (exceptions.rows ?? []).map(
      (row: any) => `${row.time_block_id}:${row.date}`,
    ),
  );
  return ((result.rows ?? []) as TimeBlockWithCategory[]).filter(block => {
    const continuesFromPreviousDay =
      block.end_time < block.start_time &&
      (block.schedule_date === previousDate ||
        (block.schedule_date === null &&
          block.day_of_week === previousDayOfWeek));
    return !hidden.has(
      `${block.id}:${continuesFromPreviousDay ? previousDate : date}`,
    );
  });
}

export async function listBlocksForDates(
  dates: string[],
): Promise<Record<string, TimeBlockWithCategory[]>> {
  if (dates.length === 0) return {};
  const db = await getDb();
  const allNeededDates = new Set<string>();
  dates.forEach(d => {
    allNeededDates.add(d);
    const prev = dateFromKey(d);
    prev.setDate(prev.getDate() - 1);
    allNeededDates.add(localDateKey(prev));
  });
  const dateList = Array.from(allNeededDates);
  const placeholders = dateList.map(() => '?').join(',');

  const [blocksResult, exceptionsResult] = await Promise.all([
    db.execute(
      `SELECT tb.id, tb.category_id, c.name AS category_name, c.color AS category_color, c.emoji AS category_emoji,
              tb.start_time, tb.end_time, tb.day_of_week, tb.is_recurring, tb.schedule_date
       FROM time_blocks tb JOIN categories c ON c.id = tb.category_id
       WHERE tb.is_recurring = 1 OR tb.schedule_date IN (${placeholders})
       ORDER BY tb.start_time ASC`,
      dateList,
    ),
    db.execute(
      `SELECT time_block_id, date FROM time_block_exceptions WHERE date IN (${placeholders})`,
      dateList,
    ),
  ]);

  const allBlocks = (blocksResult.rows ?? []) as TimeBlockWithCategory[];
  const hidden = new Set(
    (exceptionsResult.rows ?? []).map(
      (row: any) => `${row.time_block_id}:${row.date}`,
    ),
  );

  const result: Record<string, TimeBlockWithCategory[]> = {};
  for (const date of dates) {
    const dayOfWeek = weekdayFromKey(date);
    const prev = dateFromKey(date);
    prev.setDate(prev.getDate() - 1);
    const prevDate = localDateKey(prev);
    const prevDayOfWeek = weekdayFromKey(prevDate);

    result[date] = allBlocks.filter(block => {
      const matchesToday =
        block.schedule_date === date ||
        (block.schedule_date === null && block.day_of_week === dayOfWeek);

      const continuesFromPrev =
        block.end_time < block.start_time &&
        (block.schedule_date === prevDate ||
          (block.schedule_date === null &&
            block.day_of_week === prevDayOfWeek));

      if (!matchesToday && !continuesFromPrev) return false;

      const exceptionKey = `${block.id}:${continuesFromPrev ? prevDate : date}`;
      return !hidden.has(exceptionKey);
    });
  }
  return result;
}

export async function listBlocksForReminders(): Promise<
  TimeBlockWithCategory[]
> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT tb.id, tb.category_id, c.name AS category_name, c.color AS category_color, c.emoji AS category_emoji, tb.start_time, tb.end_time, tb.day_of_week, tb.is_recurring, tb.schedule_date FROM time_blocks tb JOIN categories c ON c.id = tb.category_id ORDER BY tb.start_time ASC`,
  );
  return (result.rows ?? []) as TimeBlockWithCategory[];
}

export async function createTimeBlock(input: {
  categoryId: string;
  startTime: string;
  endTime: string;
  date: string;
  recurring?: boolean;
}): Promise<string> {
  const db = await getDb();
  const dayOfWeek = weekdayFromKey(input.date);
  const id = uuidv4();
  await db.execute(
    'INSERT INTO time_blocks (id, category_id, start_time, end_time, day_of_week, is_recurring, schedule_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      input.categoryId,
      input.startTime,
      input.endTime,
      dayOfWeek,
      input.recurring ? 1 : 0,
      input.recurring ? null : input.date,
    ],
  );
  return id;
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM time_blocks WHERE id = ?', [id]);
}

export async function deleteTimeBlockOccurrence(
  id: string,
  date: string,
  recurring: boolean,
): Promise<void> {
  const db = await getDb();
  if (recurring) {
    const originDate = await resolveOriginDate(id, date);
    await db.execute(
      'INSERT OR IGNORE INTO time_block_exceptions (time_block_id, date) VALUES (?, ?)',
      [id, originDate],
    );
    return;
  }
  await deleteTimeBlock(id);
}

export async function updateTimeBlock(input: {
  id: string;
  categoryId: string;
  startTime: string;
  endTime: string;
  date: string;
  recurring: boolean;
  scope: 'day' | 'all';
}): Promise<void> {
  const db = await getDb();
  const originDate = await resolveOriginDate(input.id, input.date);
  if (input.recurring && input.scope === 'day') {
    await db.transaction(async tx => {
      await tx.execute(
        'INSERT OR IGNORE INTO time_block_exceptions (time_block_id, date) VALUES (?, ?)',
        [input.id, originDate],
      );
      await tx.execute(
        'INSERT INTO time_blocks (id, category_id, start_time, end_time, day_of_week, is_recurring, schedule_date) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [
          uuidv4(),
          input.categoryId,
          input.startTime,
          input.endTime,
          weekdayFromKey(originDate),
          originDate,
        ],
      );
    });
    return;
  }
  await db.execute(
    'UPDATE time_blocks SET category_id = ?, start_time = ?, end_time = ?, day_of_week = ?, is_recurring = ?, schedule_date = ? WHERE id = ?',
    [
      input.categoryId,
      input.startTime,
      input.endTime,
      weekdayFromKey(originDate),
      input.recurring ? 1 : 0,
      input.recurring ? null : originDate,
      input.id,
    ],
  );
}

export async function markTimeBlockStarted(
  id: string,
  date: string,
): Promise<void> {
  const db = await getDb();
  const originDate = await resolveOriginDate(id, date);
  await db.execute(
    "INSERT INTO time_block_status (time_block_id, date, started_at) VALUES (?, ?, datetime('now')) ON CONFLICT(time_block_id, date) DO UPDATE SET started_at = excluded.started_at",
    [id, originDate],
  );
}

export async function markTimeBlockCompleted(
  id: string,
  date: string,
  completed: boolean,
): Promise<void> {
  const db = await getDb();
  const originDate = await resolveOriginDate(id, date);
  await db.execute(
    'INSERT INTO time_block_status (time_block_id, date, completed) VALUES (?, ?, ?) ON CONFLICT(time_block_id, date) DO UPDATE SET completed = excluded.completed',
    [id, originDate, completed ? 1 : 0],
  );
}
