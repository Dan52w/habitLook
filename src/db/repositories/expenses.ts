import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { getAccountBalance } from './accounts';

async function assertSufficientFunds(
  payments: { accountId: string; amount: number }[],
) {
  const totals = new Map<string, number>();
  payments.forEach(({ accountId, amount }) =>
    totals.set(accountId, (totals.get(accountId) ?? 0) + amount),
  );
  for (const [accountId, amount] of totals) {
    const balance = await getAccountBalance(accountId);
    if (amount > balance)
      throw new Error(
        'Saldo insuficiente en una de las cuentas seleccionadas.',
      );
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
  const roundedAmount = Math.round(input.amount);
  if (input.type === 'expense')
    await assertSufficientFunds([
      { accountId: input.accountId, amount: roundedAmount },
    ]);
  const db = await getDb();
  const id = uuidv4();
  await db.execute(
    'INSERT INTO expenses (id, amount, type, category_id, account_id, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      roundedAmount,
      input.type,
      input.categoryId ?? null,
      input.accountId,
      input.note ?? null,
      input.date,
    ],
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
  const roundedAmount = Math.round(input.amount);
  const normalizedPayments = input.payments.map(p => ({
    accountId: p.accountId,
    amount: Math.round(p.amount),
  }));
  const splitTotal = normalizedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  if (!normalizedPayments.length || splitTotal !== roundedAmount) {
    throw new Error('Las partes del pago deben sumar el total del gasto.');
  }
  await assertSufficientFunds(normalizedPayments);
  const db = await getDb();
  const id = uuidv4();
  await db.transaction(async tx => {
    await tx.execute(
      'INSERT INTO expenses (id, amount, type, category_id, account_id, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        roundedAmount,
        'expense',
        input.categoryId ?? null,
        null,
        input.note ?? null,
        input.date,
      ],
    );
    for (const payment of normalizedPayments) {
      await tx.execute(
        'INSERT INTO expense_splits (id, expense_id, account_id, amount) VALUES (?, ?, ?, ?)',
        [uuidv4(), id, payment.accountId, payment.amount],
      );
    }
  });
  return id;
}

export async function updateExpense(input: {
  id: string;
  amount: number;
  type?: 'income' | 'expense';
  accountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
  date: string;
}): Promise<void> {
  const db = await getDb();
  const current = await db.execute(
    'SELECT amount, account_id, type FROM expenses WHERE id = ?',
    [input.id],
  );
  const oldRow = current.rows?.[0];
  if (!oldRow) return;

  const splitCount = await db.execute(
    'SELECT COUNT(*) AS n FROM expense_splits WHERE expense_id = ?',
    [input.id],
  );
  const hasSplits =
    Number((splitCount.rows?.[0] as { n?: number } | undefined)?.n ?? 0) > 0;

  const targetType = input.type ?? (oldRow.type as 'income' | 'expense');
  const targetAccountId =
    input.accountId !== undefined
      ? input.accountId
      : oldRow.account_id
      ? String(oldRow.account_id)
      : null;
  const roundedAmount = Math.round(input.amount);

  if (targetType === 'expense' && targetAccountId) {
    const currentBalance = await getAccountBalance(targetAccountId);
    const headroom =
      oldRow.account_id === targetAccountId && oldRow.type === 'expense'
        ? currentBalance + Math.round(Number(oldRow.amount))
        : currentBalance;
    if (roundedAmount > headroom) {
      throw new Error('Saldo insuficiente en la cuenta seleccionada.');
    }
  }

  await db.transaction(async tx => {
    // Un gasto dividido no tiene cuenta única: si se le asigna una, se convierte
    // en gasto simple y se eliminan las partes para no descontar el monto dos veces.
    if (hasSplits && targetAccountId) {
      await tx.execute('DELETE FROM expense_splits WHERE expense_id = ?', [
        input.id,
      ]);
    }
    await tx.execute(
      'UPDATE expenses SET amount = ?, type = ?, account_id = ?, category_id = ?, note = ?, date = ? WHERE id = ?',
      [
        roundedAmount,
        targetType,
        targetAccountId ?? null,
        input.categoryId ?? null,
        input.note ?? null,
        input.date,
        input.id,
      ],
    );
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async tx => {
    await tx.execute('DELETE FROM expense_splits WHERE expense_id = ?', [id]);
    await tx.execute('DELETE FROM expenses WHERE id = ?', [id]);
  });
}

export async function listExpensesWithDetails(
  dateFrom?: string,
  dateTo?: string,
) {
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
    [dateFrom ?? null, dateFrom ?? null, dateTo ?? null, dateTo ?? null],
  );
  return result.rows ?? [];
}
