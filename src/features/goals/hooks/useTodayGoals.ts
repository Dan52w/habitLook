import { useEffect, useState, useCallback } from 'react';
import {
  listTodayGoals,
  getGoalStreak,
  GoalWithProgress,
} from '../../../db/repositories/goals';
import { localDateKey } from '../../../shared/utils/date';

export type GoalDisplay = {
  id: string;
  title: string;
  progressLabel: string;
  progressRatio: number;
  color: string;
  targetValue: number;
  targetType: 'duration' | 'count' | 'boolean';
  streak: number;
  reminderTime: string | null;
};

export function useTodayGoals() {
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const today = localDateKey();
    const raw: GoalWithProgress[] = await listTodayGoals(today);

    const mapped = raw.map(g => {
      const capped = Math.min(g.progress_value, g.target_value);
      if (g.target_type === 'count') {
        return {
          id: g.id,
          title: g.title,
          progressLabel: `${capped} / ${g.target_value} veces`,
          progressRatio:
            g.target_value > 0 ? Math.min(1, capped / g.target_value) : 0,
          color: '#F2A93B',
          targetValue: g.target_value,
          targetType: g.target_type,
          reminderTime: g.reminder_time ?? null,
        };
      }
      if (g.target_type === 'boolean') {
        return {
          id: g.id,
          title: g.title,
          progressLabel: g.completed ? 'Hecho' : 'Pendiente',
          progressRatio: g.completed ? 1 : 0,
          color: '#64D9A0',
          targetValue: g.target_value,
          targetType: g.target_type,
          reminderTime: g.reminder_time ?? null,
        };
      }
      const ratio =
        g.target_value > 0 ? Math.min(1, capped / g.target_value) : 0;
      return {
        id: g.id,
        title: g.title,
        progressLabel: `${Math.round(ratio * 100)}% de ${g.target_value} min`,
        progressRatio: ratio,
        color: '#64D9A0',
        targetValue: g.target_value,
        targetType: g.target_type,
        reminderTime: g.reminder_time ?? null,
      };
    });

    const withStreaks = await Promise.all(
      mapped.map(async g => ({ ...g, streak: await getGoalStreak(g.id) })),
    );
    setGoals(withStreaks);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { goals, loading, reload: load };
}
