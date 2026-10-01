import { useEffect, useState, useCallback } from 'react';
import { listTodayGoals, GoalWithProgress } from '../../../db/repositories/goals';
import { localDateKey } from '../../../shared/utils/date';

export type GoalDisplay = {
  id: string;
  title: string;
  progressLabel: string;
  progressRatio: number;
  color: string;
  targetValue: number;
  targetType: 'duration' | 'count' | 'boolean';
};

export function useTodayGoals() {
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const today = localDateKey();
    const raw: GoalWithProgress[] = await listTodayGoals(today);

    setGoals(raw.map((g) => {
      if (g.target_type === 'count') {
        return {
          id: g.id, title: g.title,
          progressLabel: `${g.progress_value} / ${g.target_value}`,
          progressRatio: g.target_value > 0 ? g.progress_value / g.target_value : 0,
          color: '#F2A93B',
          targetValue: g.target_value,
          targetType: g.target_type,
        };
      }
      if (g.target_type === 'boolean') {
        return {
          id: g.id, title: g.title,
          progressLabel: g.completed ? 'Hecho' : 'Pendiente',
          progressRatio: g.completed ? 1 : 0,
          color: '#64D9A0',
          targetValue: g.target_value,
          targetType: g.target_type,
        };
      }
      const ratio = g.target_value > 0 ? g.progress_value / g.target_value : 0;
      return {
        id: g.id, title: g.title,
        progressLabel: `${Math.round(ratio * 100)}%`,
        progressRatio: ratio,
        color: '#64D9A0',
        targetValue: g.target_value,
        targetType: g.target_type,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { goals, loading, reload: load };
}
