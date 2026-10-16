import { listBlocksForDate, listBlocksForDates } from '../../db/repositories/timeBlocks';
import { listTodayGoals } from '../../db/repositories/goals';
import { listNotes } from '../../db/repositories/notes';
import { listExpensesWithDetails } from '../../db/repositories/expenses';
import {
  dateFromKey,
  localDateKey,
  periodEnd,
  periodLabel,
  periodStart,
} from '../../shared/utils/date';
import { money } from '../../features/accounting/utils/currency';
import type { AiContextBlock } from './types';

export type ContextId = 'plan' | 'goals' | 'notes' | 'expenses';

/** Rango del plan: día, semana (lun–dom) o mes en curso. */
export type PlanRange = 'day' | 'week' | 'month';
/** Alcance de gastos: periodo actual o los últimos 3. */
export type ExpensesMode = 'current' | 'last3';

export const PLAN_RANGE_LABELS: Record<PlanRange, string> = {
  day: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

export const CONTEXT_OPTIONS: { id: ContextId; icon: string; label: string }[] =
  [
    { id: 'plan', icon: '📅', label: 'Plan' },
    { id: 'goals', icon: '🎯', label: 'Mis metas' },
    { id: 'notes', icon: '📝', label: 'Mis notas' },
    { id: 'expenses', icon: '💰', label: 'Gastos' },
  ];

/** Construye los bloques de contexto elegidos por el usuario. */
export async function buildContextBlocks(
  ids: ContextId[],
  expensesRange: { startDate: string; endDate: string; label: string },
  opts?: {
    planRange?: PlanRange;
    expensesMode?: ExpensesMode;
    periodType?: 'week' | 'month';
  },
): Promise<AiContextBlock[]> {
  const blocks: AiContextBlock[] = [];
  for (const id of ids) {
    try {
      if (id === 'plan') blocks.push(await buildPlanBlock(opts?.planRange ?? 'day'));
      else if (id === 'goals') blocks.push(await buildGoalsBlock());
      else if (id === 'notes') blocks.push(await buildNotesBlock());
      else if (id === 'expenses')
        blocks.push(await buildExpensesBlock(expensesRange, opts?.expensesMode ?? 'current', opts?.periodType ?? 'month'));
    } catch (error) {
      console.warn(`[IA] No se pudo construir el contexto "${id}":`, error);
    }
  }
  return blocks;
}

function datesBetween(start: string, end: string, max = 62): string[] {
  const out: string[] = [];
  const d = dateFromKey(start);
  const e = dateFromKey(end);
  let guard = 0;
  while (d <= e && guard++ < max) {
    out.push(localDateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

async function buildPlanBlock(range: PlanRange): Promise<AiContextBlock> {
  if (range === 'day') {
    const today = localDateKey();
    const blocks = await listBlocksForDate(today);
    const lines = blocks.map(
      b => `• ${b.start_time}–${b.end_time}: ${b.category_name}`,
    );
    return {
      id: 'plan',
      label: 'Plan de hoy',
      text:
        `Plan del ${today}:\n` +
        (lines.length > 0 ? lines.join('\n') : '(sin actividades planificadas)'),
    };
  }
  const start = periodStart(range, new Date(), 0);
  const end = periodEnd(range, new Date(), 0);
  const dates = datesBetween(start, end, range === 'week' ? 7 : 31);
  const byDate = await listBlocksForDates(dates);
  const lines: string[] = [];
  for (const d of dates) {
    for (const b of byDate[d] ?? []) {
      lines.push(`• ${d} ${b.start_time}–${b.end_time}: ${b.category_name}`);
    }
  }
  const MAX = 80;
  const shown = lines.slice(0, MAX);
  if (lines.length > MAX) shown.push(`…y ${lines.length - MAX} actividades más`);
  const label = range === 'week' ? 'Plan de la semana' : 'Plan del mes';
  return {
    id: 'plan',
    label,
    text:
      `${label} (${start} a ${end}):\n` +
      (shown.length > 0 ? shown.join('\n') : '(sin actividades planificadas)'),
  };
}

async function buildGoalsBlock(): Promise<AiContextBlock> {
  const today = localDateKey();
  const goals = await listTodayGoals(today);
  const lines = goals.map(g => {
    const capped = Math.min(g.progress_value, g.target_value);
    const label =
      g.target_type === 'count'
        ? `${capped} / ${g.target_value}`
        : g.target_type === 'boolean'
          ? g.completed
            ? 'Hecho'
            : 'Pendiente'
          : `${g.target_value > 0 ? Math.round((Math.min(1, capped / g.target_value)) * 100) : 0}%`;
    return `• ${g.title}: ${label} (${g.period === 'daily' ? 'diaria' : 'semanal'})`;
  });
  return {
    id: 'goals',
    label: 'Mis metas',
    text:
      'Metas de hoy:\n' +
      (lines.length > 0 ? lines.join('\n') : '(sin metas creadas)'),
  };
}

async function buildNotesBlock(): Promise<AiContextBlock> {
  const notes = await listNotes();
  const recent = notes.slice(0, 15);
  const lines = recent.map(n => {
    const text = n.text.length > 160 ? n.text.slice(0, 160) + '…' : n.text;
    const when = n.note_date ?? n.created_at.slice(0, 10);
    return `• [${when}] ${text.replace(/\n/g, ' ')}`;
  });
  return {
    id: 'notes',
    label: 'Mis notas',
    text:
      'Notas recientes:\n' +
      (lines.length > 0 ? lines.join('\n') : '(sin notas)'),
  };
}

type ExpenseSummary = {
  income: number;
  expense: number;
  byCategory: Map<string, number>;
};

async function summarizeExpenses(
  startDate: string,
  endDate: string,
): Promise<ExpenseSummary> {
  const rows = (await listExpensesWithDetails(startDate, endDate)) as {
    amount: number | string;
    type: string;
    category_name: string | null;
  }[];
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    const amount = Number(row.amount);
    if (row.type === 'income') income += amount;
    else {
      expense += amount;
      const cat = row.category_name ?? 'Sin categoría';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + amount);
    }
  }
  return { income, expense, byCategory };
}

async function buildExpensesBlock(
  range: { startDate: string; endDate: string; label: string },
  mode: ExpensesMode,
  periodType: 'week' | 'month',
): Promise<AiContextBlock> {
  if (mode === 'last3') return buildExpensesLast3(periodType);
  return buildExpensesCurrent(range);
}

async function buildExpensesCurrent(range: {
  startDate: string;
  endDate: string;
  label: string;
}): Promise<AiContextBlock> {
  const { startDate, endDate, label } = range;
  const { income, expense, byCategory } = await summarizeExpenses(startDate, endDate);
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, total]) => `  - ${cat}: ${money(total)}`);

  // Comparación con el periodo anterior (misma duración).
  const start = dateFromKey(startDate);
  const end = dateFromKey(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const prev = await summarizeExpenses(
    localDateKey(prevStart),
    localDateKey(prevEnd),
  );
  const prevExpense = prev.expense;
  const diff = expense - prevExpense;
  const diffPct =
    prevExpense > 0 ? `${diff >= 0 ? '+' : ''}${Math.round((diff / prevExpense) * 100)}%` : '—';

  const lines = [
    `Gastos del periodo ${label} (${startDate} a ${endDate}):`,
    `• Ingresos: ${money(income)}`,
    `• Gastos: ${money(expense)}`,
    `• Balance: ${money(income - expense)}`,
    ...(topCategories.length > 0
      ? ['Por categoría:', ...topCategories]
      : []),
    `Comparación con el periodo anterior: ${money(prevExpense)} en gastos (${diffPct} vs. anterior).`,
  ];
  return { id: 'expenses', label: `Gastos · ${label}`, text: lines.join('\n') };
}

async function buildExpensesLast3(
  periodType: 'week' | 'month',
): Promise<AiContextBlock> {
  const now = new Date();
  const unit = periodType === 'week' ? 'semanas' : 'meses';
  const lines = [`Gastos de los últimos 3 ${unit}:`];
  const totalByCategory = new Map<string, number>();
  for (const offset of [0, -1, -2]) {
    const s = periodStart(periodType, now, offset);
    const e = periodEnd(periodType, now, offset);
    const label = periodLabel(periodType, now, offset);
    const { income, expense, byCategory } = await summarizeExpenses(s, e);
    for (const [cat, total] of byCategory) {
      totalByCategory.set(cat, (totalByCategory.get(cat) ?? 0) + total);
    }
    lines.push(
      `• ${label}: ingresos ${money(income)}, gastos ${money(expense)}, balance ${money(income - expense)}`,
    );
  }
  const top = [...totalByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, total]) => `  - ${cat}: ${money(total)}`);
  if (top.length > 0) lines.push('Top categorías del rango:', ...top);
  return { id: 'expenses', label: 'Gastos · últimos 3', text: lines.join('\n') };
}
