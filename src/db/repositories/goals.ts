import { getDb } from '../client';
import { v4 as uuidv4 } from 'uuid';
import { dateFromKey, localDateKey } from '../../shared/utils/date';
import type { DB } from '@op-engineering/op-sqlite';

export type GoalWithProgress = {
  id: string;
  title: string;
  target_type: 'duration' | 'count' | 'boolean';
  target_value: number;
  period: 'daily' | 'weekly';
  /**
   * Fecha YYYY-MM-DD solo para metas de un día: la meta solo se muestra
   * ese día. NULL = meta repetitiva (diaria/semanal según `period`).
   * (Se guarda `period: 'daily'` porque el cálculo de progreso es el mismo.)
   */
  target_date: string | null;
  progress_value: number;
  completed: number;
  /** Hora 'HH:MM' del recordatorio diario; null = sin recordatorio. */
  reminder_time: string | null;
};

/** true si la meta es de un único día (no repetitiva). */
export function isOneTimeGoal(goal: { target_date: string | null }): boolean {
  return goal.target_date != null;
}

function startOfWeek(dateStr: string): string {
  const d = dateFromKey(dateStr);
  const day = d.getDay(); // 0 domingo .. 6 sábado
  const diff = day === 0 ? -6 : 1 - day; // retrocede hasta el lunes
  d.setDate(d.getDate() + diff);
  return localDateKey(d);
}

export async function listTodayGoals(
  todayDate: string,
): Promise<GoalWithProgress[]> {
  const db = await getDb();
  const weekStart = startOfWeek(todayDate);

  // metas 'daily' -> progreso = el valor de hoy
  // metas 'weekly' -> progreso = suma de la semana en curso
  // metas de un día (target_date) -> como 'daily', pero solo visibles su día
  const result = await db.execute(
    `SELECT g.id, g.title, g.target_type, g.target_value, g.period, g.target_date, g.reminder_time,
            CASE
              WHEN g.period = 'daily' THEN COALESCE(
                (SELECT value FROM goal_progress WHERE goal_id = g.id AND date = ?), 0)
              ELSE COALESCE(
                (SELECT SUM(value) FROM goal_progress WHERE goal_id = g.id AND date >= ? AND date <= ?), 0)
            END as progress_value,
            CASE WHEN g.period = 'weekly' THEN
              CASE WHEN COALESCE((SELECT SUM(value) FROM goal_progress WHERE goal_id = g.id AND date >= ? AND date <= ?), 0) >= g.target_value THEN 1 ELSE 0 END
            ELSE COALESCE((SELECT completed FROM goal_progress WHERE goal_id = g.id AND date = ?), 0)
            END as completed
     FROM goals g
     WHERE g.target_date IS NULL OR g.target_date = ?
     ORDER BY g.title ASC`,
    [todayDate, weekStart, todayDate, weekStart, todayDate, todayDate, todayDate],
  );
  return (result.rows ?? []) as GoalWithProgress[];
}

export async function createGoal(input: {
  categoryId: string;
  title: string;
  targetType: GoalWithProgress['target_type'];
  targetValue: number;
  period: GoalWithProgress['period'];
  /** Fecha YYYY-MM-DD para metas de un día; omitir/null = repetitiva. */
  targetDate?: string | null;
  /** Hora 'HH:MM' del recordatorio diario; omitir = sin recordatorio. */
  reminderTime?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute(
    'INSERT INTO goals (id, category_id, title, target_type, target_value, period, target_date, reminder_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      input.categoryId,
      input.title.trim(),
      input.targetType,
      input.targetValue,
      input.period,
      input.targetDate ?? null,
      input.reminderTime ?? null,
    ],
  );
  return id;
}

export async function updateGoalReminder(
  goalId: string,
  reminderTime: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE goals SET reminder_time = ? WHERE id = ?', [
    reminderTime,
    goalId,
  ]);
}

export async function listGoalsWithReminders(): Promise<
  {
    id: string;
    title: string;
    target_type: string;
    target_value: number;
    reminder_time: string;
  }[]
> {
  const db = await getDb();
  const result = await db.execute(
    'SELECT id, title, target_type, target_value, reminder_time FROM goals WHERE reminder_time IS NOT NULL',
  );
  return (result.rows ?? []) as {
    id: string;
    title: string;
    target_type: string;
    target_value: number;
    reminder_time: string;
  }[];
}

export async function addGoalProgress(
  goalId: string,
  date: string,
  delta: number,
  targetValue: number,
): Promise<void> {
  const db = await getDb();
  const goalInfo = await db.execute(
    'SELECT target_type, target_value, period FROM goals WHERE id = ?',
    [goalId],
  );
  const goal = goalInfo.rows?.[0];
  const targetType = goal?.target_type ?? 'count';
  const period = goal?.period ?? 'daily';

  const current = await db.execute(
    'SELECT value, completed FROM goal_progress WHERE goal_id = ? AND date = ?',
    [goalId, date],
  );
  const currentValue = Number(current.rows?.[0]?.value ?? 0);

  if (targetType === 'boolean') {
    if (delta > 0) {
      if (period === 'weekly') {
        const weekStart = startOfWeek(date);
        const weeklySum = await db.execute(
          'SELECT COALESCE(SUM(value), 0) AS total FROM goal_progress WHERE goal_id = ? AND date >= ? AND date <= ?',
          [goalId, weekStart, date],
        );
        if (Number(weeklySum.rows?.[0]?.total ?? 0) >= 1) return;
      } else if (currentValue >= 1) {
        return;
      }
    }
    const nextValue = delta > 0 ? 1 : 0;
    const completed = nextValue >= 1 ? 1 : 0;
    if (current.rows?.length) {
      await db.execute(
        'UPDATE goal_progress SET value = ?, completed = ? WHERE goal_id = ? AND date = ?',
        [nextValue, completed, goalId, date],
      );
    } else {
      await db.execute(
        'INSERT INTO goal_progress (id, goal_id, date, value, completed) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), goalId, date, nextValue, completed],
      );
    }
    return;
  }

  let nextValue: number;
  if (period === 'weekly') {
    const weekStart = startOfWeek(date);
    const weeklySumRes = await db.execute(
      'SELECT COALESCE(SUM(value), 0) AS total FROM goal_progress WHERE goal_id = ? AND date >= ? AND date <= ? AND date != ?',
      [goalId, weekStart, date, date],
    );
    const otherDays = Number(weeklySumRes.rows?.[0]?.total ?? 0);
    if (delta > 0) {
      if (otherDays + currentValue >= targetValue) return;
      const maxForToday = Math.max(0, targetValue - otherDays);
      nextValue = Math.min(maxForToday, currentValue + delta);
    } else {
      nextValue = Math.max(0, currentValue + delta);
    }
  } else {
    if (delta > 0 && currentValue >= targetValue) return;
    nextValue = Math.max(0, currentValue + delta);
    if (delta > 0) {
      nextValue = Math.min(targetValue, nextValue);
    }
  }
  const completed = nextValue >= targetValue ? 1 : 0;
  if (current.rows?.length) {
    await db.execute(
      'UPDATE goal_progress SET value = ?, completed = ? WHERE goal_id = ? AND date = ?',
      [nextValue, completed, goalId, date],
    );
  } else {
    await db.execute(
      'INSERT INTO goal_progress (id, goal_id, date, value, completed) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), goalId, date, nextValue, completed],
    );
  }
}

export async function deleteGoal(goalId: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM goals WHERE id = ?', [goalId]);
}

export async function findGoalTitleForCategory(
  categoryId: string,
): Promise<string | null> {
  const db = await getDb();
  const result = await db.execute(
    'SELECT title FROM goals WHERE category_id = ? ORDER BY title ASC LIMIT 1',
    [categoryId],
  );
  return (result.rows?.[0]?.title ?? null) as string | null;
}

function addDays(dateKey: string, days: number): string {
  const d = dateFromKey(dateKey);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

async function weeklyTotal(
  db: DB,
  goalId: string,
  weekStart: string,
): Promise<number> {
  const weekEnd = addDays(weekStart, 6);
  const result = await db.execute(
    'SELECT COALESCE(SUM(value), 0) AS total FROM goal_progress WHERE goal_id = ? AND date >= ? AND date <= ?',
    [goalId, weekStart, weekEnd],
  );
  return Number(
    (result.rows?.[0] as { total?: number } | undefined)?.total ?? 0,
  );
}

/**
 * Racha actual de una meta: días (o semanas) consecutivos cumpliéndola.
 * Si el período en curso aún no se cumple, la racha se cuenta desde el
 * anterior: la racha sigue "viva" hasta que se rompe un período completo.
 */
export async function getGoalStreak(goalId: string): Promise<number> {
  const db = await getDb();
  const info = await db.execute(
    'SELECT period, target_value FROM goals WHERE id = ?',
    [goalId],
  );
  const row = info.rows?.[0] as
    | { period?: string; target_value?: number }
    | undefined;
  if (!row) return 0;
  const target = Number(row.target_value ?? 0);
  if (target <= 0) return 0;

  if (row.period === 'weekly') {
    let weekStart = startOfWeek(localDateKey());
    if ((await weeklyTotal(db, goalId, weekStart)) < target) {
      weekStart = addDays(weekStart, -7);
    }
    let streak = 0;
    while ((await weeklyTotal(db, goalId, weekStart)) >= target) {
      streak++;
      weekStart = addDays(weekStart, -7);
    }
    return streak;
  }

  const doneRows = await db.execute(
    'SELECT date FROM goal_progress WHERE goal_id = ? AND completed = 1 ORDER BY date DESC LIMIT 500',
    [goalId],
  );
  const done = new Set(
    (doneRows.rows ?? []).map(row => String((row as Record<string, unknown>).date)),
  );
  let cursor = localDateKey();
  if (!done.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
