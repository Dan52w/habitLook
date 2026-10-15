import { listBlocksForDate } from '../../db/repositories/timeBlocks';
import { listTodayGoals } from '../../db/repositories/goals';
import { listNotes } from '../../db/repositories/notes';
import { listExpensesWithDetails } from '../../db/repositories/expenses';
import {
  dateFromKey,
  localDateKey,
} from '../../shared/utils/date';
import { money } from '../../features/accounting/utils/currency';
import type { AiContextBlock } from './types';

export type ContextId = 'plan' | 'goals' | 'notes' | 'expenses';

export const CONTEXT_OPTIONS: { id: ContextId; icon: string; label: string }[] =
  [
    { id: 'plan', icon: '📅', label: 'Plan de hoy' },
    { id: 'goals', icon: '🎯', label: 'Mis metas' },
    { id: 'notes', icon: '📝', label: 'Mis notas' },
    { id: 'expenses', icon: '💰', label: 'Gastos del periodo' },
  ];

/** Construye los bloques de contexto elegidos por el usuario. */
export async function buildContextBlocks(
  ids: ContextId[],
  expensesRange: { startDate: string; endDate: string; label: string },
): Promise<AiContextBlock[]> {
  const blocks: AiContextBlock[] = [];
  for (const id of ids) {
    try {
      if (id === 'plan') blocks.push(await buildPlanBlock());
      else if (id === 'goals') blocks.push(await buildGoalsBlock());
      else if (id === 'notes') blocks.push(await buildNotesBlock());
      else if (id === 'expenses') blocks.push(await buildExpensesBlock(expensesRange));
    } catch (error) {
      console.warn(`[IA] No se pudo construir el contexto "${id}":`, error);
    }
  }
  return blocks;
}

async function buildPlanBlock(): Promise<AiContextBlock> {
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

async function buildExpensesBlock(range: {
  startDate: string;
  endDate: string;
  label: string;
}): Promise<AiContextBlock> {
  const { startDate, endDate, label } = range;
  const rows = (await listExpensesWithDetails(startDate, endDate)) as {
    amount: number | string;
    type: string;
    category_name: string | null;
    date: string;
    note: string | null;
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
  const prevRows = (await listExpensesWithDetails(
    localDateKey(prevStart),
    localDateKey(prevEnd),
  )) as { amount: number | string; type: string }[];
  const prevExpense = prevRows
    .filter(r => r.type !== 'income')
    .reduce((sum, r) => sum + Number(r.amount), 0);
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
