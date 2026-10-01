import { getDb } from '../client';
import { v4 as uuidv4 } from 'uuid';
import { dateFromKey, localDateKey } from '../../shared/utils/date';

export type GoalWithProgress = {
  id: string;
  title: string;
  target_type: 'duration' | 'count' | 'boolean';
  target_value: number;
  period: 'daily' | 'weekly';
  progress_value: number;
  completed: number;
};

function startOfWeek(dateStr: string): string {
  const d = dateFromKey(dateStr);
  const day = d.getDay(); // 0 domingo .. 6 sábado
  const diff = day === 0 ? -6 : 1 - day; // retrocede hasta el lunes
  d.setDate(d.getDate() + diff);
  return localDateKey(d);
}

export async function listTodayGoals(todayDate: string): Promise<GoalWithProgress[]> {
  const db = await getDb();
  const weekStart = startOfWeek(todayDate);

  // metas 'daily' -> progreso = el valor de hoy
  // metas 'weekly' -> progreso = suma de la semana en curso
  const result = await db.execute(
    `SELECT g.id, g.title, g.target_type, g.target_value, g.period,
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
     ORDER BY g.title ASC`,
    [todayDate, weekStart, todayDate, weekStart, todayDate, todayDate]
  );
  return (result.rows ?? []) as GoalWithProgress[];
}

export async function createGoal(input: {
  categoryId: string;
  title: string;
  targetType: GoalWithProgress['target_type'];
  targetValue: number;
  period: GoalWithProgress['period'];
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO goals (id, category_id, title, target_type, target_value, period) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), input.categoryId, input.title.trim(), input.targetType, input.targetValue, input.period],
  );
}

export async function addGoalProgress(goalId: string, date: string, delta: number, targetValue: number): Promise<void> {
  const db = await getDb();
  const goalInfo = await db.execute('SELECT target_type, target_value, period FROM goals WHERE id = ?', [goalId]);
  const goal = goalInfo.rows?.[0];
  const targetType = goal?.target_type ?? 'count';
  const period = goal?.period ?? 'daily';

  const current = await db.execute('SELECT value, completed FROM goal_progress WHERE goal_id = ? AND date = ?', [goalId, date]);
  const currentValue = Number(current.rows?.[0]?.value ?? 0);

  if (targetType === 'boolean') {
    if (delta > 0) {
      if (period === 'weekly') {
        const weekStart = startOfWeek(date);
        const weeklySum = await db.execute(
          'SELECT COALESCE(SUM(value), 0) AS total FROM goal_progress WHERE goal_id = ? AND date >= ? AND date <= ?',
          [goalId, weekStart, date]
        );
        if (Number(weeklySum.rows?.[0]?.total ?? 0) >= 1) return;
      } else if (currentValue >= 1) {
        return;
      }
    }
    const nextValue = delta > 0 ? 1 : 0;
    const completed = nextValue >= 1 ? 1 : 0;
    if (current.rows?.length) {
      await db.execute('UPDATE goal_progress SET value = ?, completed = ? WHERE goal_id = ? AND date = ?', [nextValue, completed, goalId, date]);
    } else {
      await db.execute('INSERT INTO goal_progress (id, goal_id, date, value, completed) VALUES (?, ?, ?, ?, ?)', [uuidv4(), goalId, date, nextValue, completed]);
    }
    return;
  }

  let nextValue: number;
  if (period === 'weekly') {
    const weekStart = startOfWeek(date);
    const weeklySumRes = await db.execute(
      'SELECT COALESCE(SUM(value), 0) AS total FROM goal_progress WHERE goal_id = ? AND date >= ? AND date <= ? AND date != ?',
      [goalId, weekStart, date, date]
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
    await db.execute('UPDATE goal_progress SET value = ?, completed = ? WHERE goal_id = ? AND date = ?', [nextValue, completed, goalId, date]);
  } else {
    await db.execute('INSERT INTO goal_progress (id, goal_id, date, value, completed) VALUES (?, ?, ?, ?, ?)', [uuidv4(), goalId, date, nextValue, completed]);
  }
}

export async function deleteGoal(goalId: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM goals WHERE id = ?', [goalId]);
}

export async function findGoalTitleForCategory(categoryId: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.execute('SELECT title FROM goals WHERE category_id = ? ORDER BY title ASC LIMIT 1', [categoryId]);
  return (result.rows?.[0]?.title ?? null) as string | null;
}
