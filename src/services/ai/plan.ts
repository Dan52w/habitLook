import { createTimeBlock } from '../../db/repositories/timeBlocks';
import { createGoal } from '../../db/repositories/goals';
import { createNote } from '../../db/repositories/notes';
import {
  listCategories,
  createCategory,
} from '../../db/repositories/categories';

/**
 * Planes propuestos por la IA.
 *
 * La IA puede terminar su respuesta con un bloque ```plan con acciones
 * en JSON. La app lo valida estrictamente y SOLO lo ejecuta si el
 * usuario toca "Aplicar plan" (nunca automático).
 */

export type PlanAction =
  | { type: 'time_block'; category: string; start: string; end: string }
  | {
      type: 'goal';
      title: string;
      target_type: 'count' | 'duration' | 'boolean';
      target_value: number;
      frequency: 'once' | 'daily' | 'weekly';
      category?: string;
    }
  | { type: 'note'; text: string; category?: string };

export type ParsedPlan = { actions: PlanAction[] };

const MAX_ACTIONS = 12;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CATEGORY_COLORS = [
  '#F5B86B',
  '#58BDEB',
  '#64D9A0',
  '#A78BFA',
  '#F08CA0',
  '#E8C15A',
  '#7CC7FF',
];

/** Extrae y valida el bloque ```plan de una respuesta de la IA. */
export function extractPlanBlock(text: string): ParsedPlan | null {
  // 1) Formato esperado: ```plan ... ```
  const m = /```plan\s*([\s\S]*?)```/.exec(text);
  if (m) {
    const plan = tryParsePlanJson(m[1]);
    if (plan) return plan;
  }
  // 2) Tolerancia: algunos modelos usan ```json en vez de ```plan.
  //    Solo se acepta si el contenido valida como plan.
  const jm = /```json\s*([\s\S]*?)```/.exec(text);
  if (jm) {
    const plan = tryParsePlanJson(jm[1]);
    if (plan) return plan;
  }
  return null;
}

function tryParsePlanJson(candidate: string): ParsedPlan | null {
  let raw: unknown;
  try {
    raw = JSON.parse(candidate.trim());
  } catch {
    return null;
  }
  return validatePlan(raw);
}

/** Quita el bloque ```plan del texto para mostrar el markdown limpio. */
export function stripPlanBlock(text: string): string {
  return text.replace(/```plan[\s\S]*?```/g, '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cleanStr(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 && t.length <= max ? t : null;
}

function validatePlan(raw: unknown): ParsedPlan | null {
  if (!isRecord(raw)) return null;
  const { actions } = raw;
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_ACTIONS)
    return null;
  const out: PlanAction[] = [];
  for (const a of actions) {
    const parsed = validateAction(a);
    if (!parsed) return null; // fail-closed: todo o nada
    out.push(parsed);
  }
  return { actions: out };
}

function validTime(t: string): boolean {
  return TIME_RE.test(t);
}

function validateAction(a: unknown): PlanAction | null {
  if (!isRecord(a)) return null;
  const { type } = a;
  if (type === 'time_block') {
    const category = cleanStr(a.category, 40);
    const start = cleanStr(a.start, 5);
    const end = cleanStr(a.end, 5);
    if (!category || !start || !end || !validTime(start) || !validTime(end))
      return null;
    if (start >= end) return null;
    return { type: 'time_block', category, start, end };
  }
  if (type === 'goal') {
    const title = cleanStr(a.title, 120);
    const target_type = a.target_type;
    const target_value = a.target_value;
    const frequency = a.frequency;
    if (!title) return null;
    if (target_type !== 'count' && target_type !== 'duration' && target_type !== 'boolean')
      return null;
    if (typeof target_value !== 'number' || !Number.isFinite(target_value) || target_value <= 0 || target_value > 100000)
      return null;
    if (frequency !== 'once' && frequency !== 'daily' && frequency !== 'weekly')
      return null;
    const category = a.category === undefined ? undefined : (cleanStr(a.category, 40) ?? undefined);
    if (a.category !== undefined && !category) return null;
    return { type: 'goal', title, target_type, target_value, frequency, category };
  }
  if (type === 'note') {
    const text = cleanStr(a.text, 2000);
    if (!text) return null;
    const category = a.category === undefined ? undefined : (cleanStr(a.category, 40) ?? undefined);
    if (a.category !== undefined && !category) return null;
    return { type: 'note', text, category };
  }
  return null;
}

async function resolveCategory(name: string): Promise<string> {
  const clean = name.trim().slice(0, 40);
  const existing = await listCategories();
  const found = existing.find(c => c.name.toLowerCase() === clean.toLowerCase());
  if (found) return found.id;
  const created = await createCategory(
    clean,
    CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length],
  );
  return created.id;
}

export type ApplyResult = { blocks: number; goals: number; notes: number };

/**
 * Ejecuta el plan validado. Solo llamar tras confirmación explícita
 * del usuario (botón "Aplicar plan").
 */
export async function applyPlan(plan: ParsedPlan, date: string): Promise<ApplyResult> {
  const result: ApplyResult = { blocks: 0, goals: 0, notes: 0 };
  for (const action of plan.actions) {
    if (action.type === 'time_block') {
      const categoryId = await resolveCategory(action.category);
      await createTimeBlock({
        categoryId,
        startTime: action.start,
        endTime: action.end,
        date,
        recurring: false,
      });
      result.blocks++;
    } else if (action.type === 'goal') {
      const categoryId = await resolveCategory(action.category ?? 'Metas');
      await createGoal({
        categoryId,
        title: action.title,
        targetType: action.target_type,
        targetValue: action.target_value,
        period: action.frequency === 'weekly' ? 'weekly' : 'daily',
        targetDate: action.frequency === 'once' ? date : null,
      });
      result.goals++;
    } else {
      const categoryId = action.category
        ? await resolveCategory(action.category)
        : undefined;
      await createNote(action.text, categoryId, undefined, date);
      result.notes++;
    }
  }
  return result;
}

/** Nombres de categorías del plan que aún no existen (se crearían al aplicar). */
export async function findNewCategoryNames(
  plan: ParsedPlan,
): Promise<string[]> {
  const existing = await listCategories();
  const known = new Set(existing.map(c => c.name.toLowerCase()));
  const names = new Set<string>();
  for (const action of plan.actions) {
    const n =
      action.type === 'time_block'
        ? action.category
        : action.type === 'goal'
          ? (action.category ?? 'Metas')
          : action.category;
    if (n && !known.has(n.trim().toLowerCase())) names.add(n.trim());
  }
  return [...names];
}

/** Descripción corta de una acción para la tarjeta de confirmación. */
export function describeAction(action: PlanAction): string {
  if (action.type === 'time_block')
    return `🕐 ${action.start}–${action.end} · ${action.category}`;
  if (action.type === 'goal') {
    const freq = action.frequency === 'once' ? 'solo hoy' : action.frequency === 'daily' ? 'cada día' : 'cada semana';
    const unit = action.target_type === 'duration' ? 'min' : action.target_type === 'count' ? '' : '';
    return `🎯 ${action.title} (${action.target_value}${unit} · ${freq})`;
  }
  const short = action.text.length > 60 ? action.text.slice(0, 60) + '…' : action.text;
  return `📝 ${short}`;
}
