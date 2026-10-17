import { getDb } from '../client';
import { listBlocksForDates } from './timeBlocks';

export type WeeklyGoalStat = {
  goalId: string;
  title: string;
  target_type: 'duration' | 'count' | 'boolean';
  target_value: number;
  period: 'daily' | 'weekly';
  target_date: string | null;
  /** Días de la semana con completed = 1. */
  daysCompleted: number;
  /** Días de la semana con algún avance (value > 0). */
  daysActive: number;
  /** Suma de value en la semana (para metas semanales). */
  totalValue: number;
  /** Para metas semanales: ¿se cumplió el objetivo esta semana? */
  weekCompleted: boolean;
};

export type WeeklyTimeStat = {
  categoryId: string;
  categoryName: string;
  color: string;
  emoji: string | null;
  hours: number;
};

/**
 * Estadísticas de metas para una semana (lunes a domingo).
 * Las metas de un día solo aparecen si su fecha cae en la semana.
 */
export async function getWeeklyGoalStats(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyGoalStat[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT g.id, g.title, g.target_type, g.target_value, g.period, g.target_date,
            COALESCE(SUM(CASE WHEN gp.completed = 1 THEN 1 ELSE 0 END), 0) AS days_completed,
            COALESCE(SUM(CASE WHEN gp.value > 0 THEN 1 ELSE 0 END), 0) AS days_active,
            COALESCE(SUM(gp.value), 0) AS total_value
     FROM goals g
     LEFT JOIN goal_progress gp
       ON gp.goal_id = g.id AND gp.date >= ? AND gp.date <= ?
     WHERE g.target_date IS NULL OR (g.target_date >= ? AND g.target_date <= ?)
     GROUP BY g.id
     ORDER BY g.title ASC`,
    [weekStart, weekEnd, weekStart, weekEnd],
  );
  return ((result.rows ?? []) as Record<string, unknown>[]).map(row => {
    const totalValue = Number(row.total_value ?? 0);
    const targetValue = Number(row.target_value ?? 0);
    return {
      goalId: String(row.id),
      title: String(row.title),
      target_type: row.target_type as WeeklyGoalStat['target_type'],
      target_value: targetValue,
      period: row.period as WeeklyGoalStat['period'],
      target_date: (row.target_date as string | null) ?? null,
      daysCompleted: Number(row.days_completed ?? 0),
      daysActive: Number(row.days_active ?? 0),
      totalValue,
      weekCompleted:
        row.period === 'weekly' && targetValue > 0
          ? totalValue >= targetValue
          : Number(row.days_completed ?? 0) > 0,
    };
  });
}

function minutesOf(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/** Horas planificadas por categoría en las fechas dadas (sin tiempo libre). */
export async function getWeeklyTimeStats(
  dates: string[],
): Promise<WeeklyTimeStat[]> {
  const byDate = await listBlocksForDates(dates);
  const byCat = new Map<
    string,
    { name: string; color: string; emoji: string | null; minutes: number }
  >();
  for (const date of dates) {
    for (const b of byDate[date] ?? []) {
      if (b.category_id === '__free__') continue;
      let mins = minutesOf(b.end_time) - minutesOf(b.start_time);
      if (mins <= 0) mins += 1440;
      const entry = byCat.get(b.category_id) ?? {
        name: b.category_name,
        color: b.category_color,
        emoji: b.category_emoji ?? null,
        minutes: 0,
      };
      entry.minutes += mins;
      byCat.set(b.category_id, entry);
    }
  }
  return [...byCat.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      categoryName: v.name,
      color: v.color,
      emoji: v.emoji,
      hours: Math.round((v.minutes / 60) * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours);
}

/** Metas completadas por día en la semana, para hallar el mejor día. */
export async function getWeeklyCompletionsPerDay(
  weekStart: string,
  weekEnd: string,
): Promise<{ date: string; completed: number }[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT date, SUM(completed) AS completed
     FROM goal_progress
     WHERE date >= ? AND date <= ?
     GROUP BY date`,
    [weekStart, weekEnd],
  );
  return ((result.rows ?? []) as Record<string, unknown>[]).map(row => ({
    date: String(row.date),
    completed: Number(row.completed ?? 0),
  }));
}
