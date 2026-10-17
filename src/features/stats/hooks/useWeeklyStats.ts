import { useCallback, useEffect, useState } from 'react';
import {
  getWeeklyCompletionsPerDay,
  getWeeklyGoalStats,
  getWeeklyTimeStats,
  WeeklyGoalStat,
  WeeklyTimeStat,
} from '../../../db/repositories/weeklyStats';
import { listExpensesWithDetails } from '../../../db/repositories/expenses';
import { listNotes } from '../../../db/repositories/notes';
import { periodEnd, periodLabel, periodStart } from '../../../shared/utils/date';
import { dateFromKey } from '../../../shared/utils/date';

export type WeeklyExpenses = { income: number; expense: number; balance: number };

const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

function weekDates(startKey: string): string[] {
  const dates: string[] = [];
  const base = dateFromKey(startKey);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push(key);
  }
  return dates;
}

export function useWeeklyStats(weekOffset = 0) {
  const now = new Date();
  const weekStart = periodStart('week', now, weekOffset);
  const weekEnd = periodEnd('week', now, weekOffset);
  const label = periodLabel('week', now, weekOffset);

  const [loading, setLoading] = useState(true);
  const [goalStats, setGoalStats] = useState<WeeklyGoalStat[]>([]);
  const [timeStats, setTimeStats] = useState<WeeklyTimeStat[]>([]);
  const [expenses, setExpenses] = useState<WeeklyExpenses>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [notesCount, setNotesCount] = useState(0);
  const [bestDay, setBestDay] = useState<string | null>(null);
  const [bestDayCount, setBestDayCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dates = weekDates(weekStart);
      const [goals, time, perDay, expenseRows, notes] = await Promise.all([
        getWeeklyGoalStats(weekStart, weekEnd),
        getWeeklyTimeStats(dates),
        getWeeklyCompletionsPerDay(weekStart, weekEnd),
        listExpensesWithDetails(weekStart, weekEnd),
        listNotes('', undefined, undefined),
      ]);

      setGoalStats(goals);
      setTimeStats(time);

      let income = 0;
      let expense = 0;
      for (const e of expenseRows) {
        const amount = Number(e.amount ?? 0);
        if (e.type === 'income') income += amount;
        else expense += amount;
      }
      setExpenses({ income, expense, balance: income - expense });

      setNotesCount(
        notes.filter(
          n =>
            n.note_date != null &&
            n.note_date >= weekStart &&
            n.note_date <= weekEnd,
        ).length,
      );

      const best = perDay.reduce(
        (acc, d) => (d.completed > acc.completed ? d : acc),
        { date: '', completed: 0 },
      );
      if (best.completed > 0) {
        const idx = dates.indexOf(best.date);
        setBestDay(idx >= 0 ? DAY_NAMES[idx] : null);
        setBestDayCount(best.completed);
      } else {
        setBestDay(null);
        setBestDayCount(0);
      }
    } catch (error) {
      console.warn('No se pudieron cargar las estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const totalHours = timeStats.reduce((acc, t) => acc + t.hours, 0);
  const goalsCompleted = goalStats.filter(g => g.weekCompleted).length;
  const totalGoalDays = goalStats.filter(
    g => g.period === 'daily' && !g.target_date,
  ).length * 7;
  const completedGoalDays = goalStats
    .filter(g => g.period === 'daily' && !g.target_date)
    .reduce((acc, g) => acc + g.daysCompleted, 0);
  const completionPct =
    totalGoalDays > 0 ? Math.round((completedGoalDays / totalGoalDays) * 100) : 0;

  return {
    loading,
    label,
    weekOffset,
    goalStats,
    timeStats,
    expenses,
    notesCount,
    bestDay,
    bestDayCount,
    totalHours: Math.round(totalHours * 10) / 10,
    goalsCompleted,
    goalsTotal: goalStats.length,
    completionPct,
    reload: load,
  };
}
