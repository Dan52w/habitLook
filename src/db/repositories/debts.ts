import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { localDateKey } from '../../shared/utils/date';

export type DebtDirection = 'owe' | 'owed';

export type Debt = {
  id: string;
  title: string;
  person: string | null;
  direction: DebtDirection;
  total: number;
  due_date: string | null;
  note: string | null;
  created_at: string;
};

export type DebtWithProgress = Debt & {
  paid: number;
  remaining: number;
  /** 'paid' cuando no queda nada por pagar; 'overdue' si venció con saldo. */
  status: 'pending' | 'paid' | 'overdue';
};

export type DebtPayment = {
  id: string;
  debt_id: string;
  amount: number;
  date: string;
  note: string | null;
};

export type DebtTotals = {
  oweTotal: number;
  oweRemaining: number;
  owedTotal: number;
  owedRemaining: number;
};

export async function createDebt(input: {
  title: string;
  person?: string | null;
  direction: DebtDirection;
  total: number;
  dueDate?: string | null;
  note?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute(
    'INSERT INTO debts (id, title, person, direction, total, due_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      input.title.trim(),
      input.person?.trim() || null,
      input.direction,
      input.total,
      input.dueDate ?? null,
      input.note?.trim() || null,
    ],
  );
  return id;
}

function toDebtWithProgress(row: Record<string, unknown>): DebtWithProgress {
  const total = Number(row.total ?? 0);
  const paid = Math.min(Number(row.paid ?? 0), total);
  const remaining = Math.max(0, total - paid);
  const today = localDateKey();
  const status: DebtWithProgress['status'] =
    remaining <= 0
      ? 'paid'
      : row.due_date && (row.due_date as string) < today
        ? 'overdue'
        : 'pending';
  return {
    id: String(row.id),
    title: String(row.title),
    person: (row.person as string | null) ?? null,
    direction: row.direction as DebtDirection,
    total,
    due_date: (row.due_date as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
    paid,
    remaining,
    status,
  };
}

export async function listDebts(): Promise<DebtWithProgress[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT d.*, COALESCE(SUM(p.amount), 0) AS paid
     FROM debts d
     LEFT JOIN debt_payments p ON p.debt_id = d.id
     GROUP BY d.id
     ORDER BY
       CASE WHEN COALESCE(SUM(p.amount), 0) >= d.total THEN 1 ELSE 0 END,
       d.due_date IS NULL, d.due_date ASC, d.created_at DESC`,
  );
  return ((result.rows ?? []) as Record<string, unknown>[]).map(
    toDebtWithProgress,
  );
}

export async function listDebtPayments(
  debtId: string,
): Promise<DebtPayment[]> {
  const db = await getDb();
  const result = await db.execute(
    'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC, rowid DESC',
    [debtId],
  );
  return (result.rows ?? []) as DebtPayment[];
}

export async function getDebtTotals(): Promise<DebtTotals> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT d.direction,
            COALESCE(SUM(d.total), 0) AS total,
            COALESCE(SUM(d.total - COALESCE(ps.paid, 0)), 0) AS remaining
     FROM debts d
     LEFT JOIN (
       SELECT debt_id, SUM(amount) AS paid
       FROM debt_payments
       GROUP BY debt_id
     ) ps ON ps.debt_id = d.id
     GROUP BY d.direction`,
  );
  const totals: DebtTotals = {
    oweTotal: 0,
    oweRemaining: 0,
    owedTotal: 0,
    owedRemaining: 0,
  };
  for (const row of (result.rows ?? []) as Record<string, unknown>[]) {
    if (row.direction === 'owe') {
      totals.oweTotal = Number(row.total ?? 0);
      totals.oweRemaining = Math.max(0, Number(row.remaining ?? 0));
    } else {
      totals.owedTotal = Number(row.total ?? 0);
      totals.owedRemaining = Math.max(0, Number(row.remaining ?? 0));
    }
  }
  return totals;
}

/**
 * Registra un abono. Solo actualiza la deuda: no crea un gasto, no mueve
 * cuentas y no aparece en el resumen de ingresos/egresos.
 */
export async function addDebtPayment(input: {
  debtId: string;
  amount: number;
  date?: string;
  note?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO debt_payments (id, debt_id, amount, date, note) VALUES (?, ?, ?, ?, ?)',
    [
      uuidv4(),
      input.debtId,
      input.amount,
      input.date ?? localDateKey(),
      input.note?.trim() || null,
    ],
  );
}

export async function deleteDebt(debtId: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM debts WHERE id = ?', [debtId]);
}
