import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { getAccountBalance } from './accounts';

async function assertSufficientFunds(payments: { accountId: string; amount: number }[]) {
  const totals = new Map<string, number>();
  payments.forEach(({ accountId, amount }) => totals.set(accountId, (totals.get(accountId) ?? 0) + amount));
  for (const [accountId, amount] of totals) {
    const balance = await getAccountBalance(accountId);
    if (amount > balance + 0.00001) throw new Error('Saldo insuficiente en una de las cuentas seleccionadas.');
  }
}

export type Expense = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  account_id: string;
  note: string | null;
  date: string;
};

export async function createExpense(input: {
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId?: string;
  note?: string;
  date: string; // 'YYYY-MM-DD'
}) {
  if (input.type === 'expense') await assertSufficientFunds([{ accountId: input.accountId, amount: input.amount }]);
  const db = await getDb();
  const id = uuidv4();
  await db.execute(
    'INSERT INTO expenses (id, amount, type, category_id, account_id, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, input.amount, input.type, input.categoryId ?? null, input.accountId, input.note ?? null, input.date]
  );
  return id;
}

export async function createSplitExpense(input: {
  amount: number;
  categoryId?: string;
  note?: string;
  date: string;
  payments: { accountId: string; amount: number }[];
}) {
  const splitTotal = input.payments.reduce((total, payment) => total + payment.amount, 0);
  if (!input.payments.length || Math.abs(splitTotal - input.amount) > 0.01) {
    throw new Error('Las partes del pago deben sumar el total del gasto.');
  }
  await assertSufficientFunds(input.payments);
  const db = await getDb();
  const id = uuidv4();
  await db.transaction(async tx => {
    await tx.execute(
      'INSERT INTO expenses (id, amount, type, category_id, account_id, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, input.amount, 'expense', input.categoryId ?? null, null, input.note ?? null, input.date],
    );
    for (const payment of input.payments) {
      await tx.execute('INSERT INTO expense_splits (id, expense_id, account_id, amount) VALUES (?, ?, ?, ?)', [uuidv4(), id, payment.accountId, payment.amount]);
    }
  });
  return id;
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM expenses WHERE id = ?', [id]);
}

export async function listExpensesWithDetails(dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  const result = await db.execute(
    `SELECT e.*, a.name as account_name, a.type as account_type, c.name as category_name,
            (SELECT GROUP_CONCAT(a2.name || ': ' || es.amount, ' · ')
             FROM expense_splits es JOIN accounts a2 ON a2.id = es.account_id
             WHERE es.expense_id = e.id) AS split_summary
     FROM expenses e
     LEFT JOIN accounts a ON a.id = e.account_id
     LEFT JOIN expense_categories c ON c.id = e.category_id
     WHERE (? IS NULL OR e.date >= ?) AND (? IS NULL OR e.date <= ?)
     ORDER BY e.date DESC`,
    [dateFrom ?? null, dateFrom ?? null, dateTo ?? null, dateTo ?? null]
  );
  return result.rows ?? [];
}
